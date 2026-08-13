'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Grid, IconButton, Snackbar, Button, Fab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DirectoryData, FileData } from '@/utils/fileSystem';
import { cleanEmptyDirectories } from '@/utils/sorter';
import FolderCard from '../molecules/FolderCard';
import PhotoCard from '../molecules/PhotoCard';
import InstaViewer from './InstaViewer';

interface FileExplorerProps {
  rootDirectory: DirectoryData;
  onToggleFolder: (folderName: string) => void;
  onRefresh: () => void;
}

export default function FileExplorer({ rootDirectory, onToggleFolder, onRefresh }: FileExplorerProps) {
  // Navigation state: stocke uniquement les noms des dossiers traversés (pour éviter les references mortes)
  const [pathNames, setPathNames] = useState<string[]>([]);

  // Reconstruire le path d'objets DirectoryData à chaque render
  const path = useMemo(() => {
    const newPath = [rootDirectory];
    let current = rootDirectory;
    for (const name of pathNames) {
      const nextNode = current.children.find(c => c.name === name && c.kind === 'directory');
      if (nextNode) {
        current = nextNode as DirectoryData;
        newPath.push(current);
      } else {
        break; // Le dossier n'existe plus dans le nouvel arbre
      }
    }
    return newPath;
  }, [rootDirectory, pathNames]);
  
  const currentDir = path[path.length - 1];
  const isRoot = path.length === 1;

  // Corbeille (Soft Delete) state
  const [deletedFiles, setDeletedFiles] = useState<Set<string>>(new Set());
  const [pendingDeletions, setPendingDeletions] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [lastDeletedFile, setLastDeletedFile] = useState<string | null>(null);

  // InstaViewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Obtenir uniquement les fichiers non supprimés pour l'InstaViewer
  const filesList = useMemo(() => {
    return currentDir.children
      .filter(child => child.kind === 'file' && !deletedFiles.has(child.name)) as FileData[];
  }, [currentDir, deletedFiles]);

  const handleNavigateIn = (dir: DirectoryData) => {
    setPathNames([...pathNames, dir.name]);
  };

  const handleNavigateOut = () => {
    if (pathNames.length > 0) {
      setPathNames(pathNames.slice(0, -1));
    }
  };

  const handleSoftDelete = (fileName: string) => {
    // 1. Cacher de l'UI
    setDeletedFiles(prev => new Set(prev).add(fileName));
    setLastDeletedFile(fileName);

    // 2. Définir le compte à rebours de 15s pour la suppression réelle
    const timeoutId = setTimeout(async () => {
      try {
        await currentDir.handle.removeEntry(fileName);
      } catch (err) {
        console.error("Erreur lors de la suppression définitive:", err);
      }
      setPendingDeletions(prev => {
        const newDeletions = { ...prev };
        delete newDeletions[fileName];
        return newDeletions;
      });
    }, 15000);

    setPendingDeletions(prev => ({ ...prev, [fileName]: timeoutId }));
    
    // Si la visionneuse est ouverte et qu'on supprime, elle se mettra à jour automatiquement car filesList change
  };

  const handleUndoDelete = () => {
    if (!lastDeletedFile) return;

    // Annuler le timeout
    const timeoutId = pendingDeletions[lastDeletedFile];
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Retirer de la liste des suppressions en cours
    setPendingDeletions(prev => {
      const newDeletions = { ...prev };
      delete newDeletions[lastDeletedFile];
      return newDeletions;
    });

    // Remettre dans l'UI
    setDeletedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(lastDeletedFile);
      return newSet;
    });

    setLastDeletedFile(null);
  };

  const openInstaViewer = (fileName: string) => {
    const index = filesList.findIndex(f => f.name === fileName);
    if (index !== -1) {
      setViewerInitialIndex(index);
      setViewerOpen(true);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        {!isRoot && (
          <IconButton onClick={handleNavigateOut} sx={{ mr: 2 }} color="primary" aria-label="Retour">
            <ArrowBackIcon fontSize="large" />
          </IconButton>
        )}
        <Typography variant="h2">
          {isRoot ? 'Dossiers trouvés :' : `Contenu de ${currentDir.name}`}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {currentDir.children.map((child) => {
          if (deletedFiles.has(child.name)) return null;

          if (child.kind === 'directory') {
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={child.name}>
                <FolderCard
                  name={child.name}
                  included={child.included}
                  fileCount={child.fileCount}
                  onToggleInclude={() => onToggleFolder(child.name)}
                  onClick={() => handleNavigateIn(child as DirectoryData)}
                />
              </Grid>
            );
          } else {
            return (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={child.name}>
                <PhotoCard
                  name={child.name}
                  fileHandle={child.handle}
                  onClick={() => openInstaViewer(child.name)}
                />
              </Grid>
            );
          }
        })}
        {currentDir.children.length === 0 && (
          <Typography variant="body1" sx={{ mt: 4, fontStyle: 'italic', color: 'text.secondary' }}>
            Ce dossier est vide.
          </Typography>
        )}
      </Grid>

      <InstaViewer
        open={viewerOpen}
        files={filesList}
        initialIndex={viewerInitialIndex}
        onClose={() => setViewerOpen(false)}
        onDelete={handleSoftDelete}
      />

      <Snackbar
        open={lastDeletedFile !== null}
        autoHideDuration={15000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setLastDeletedFile(null);
          }
        }}
        message="Photo supprimée. (15s)"
        action={
          <Button color="error" size="large" onClick={handleUndoDelete} sx={{ fontWeight: 'bold' }}>
            ANNULER LA SUPPRESSION
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Fab 
        color="error" 
        variant="extended" 
        onClick={async () => {
          try {
            await cleanEmptyDirectories(rootDirectory.handle);
            onRefresh(); // Recharger la vue pour faire disparaître les dossiers
          } catch (e) {
            console.error(e);
          }
        }}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}
      >
        <DeleteSweepIcon sx={{ mr: 1 }} />
        Vider dossiers vides
      </Fab>
    </Box>
  );
}

'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Grid, IconButton, Button, Fab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DirectoryData } from '@/utils/fileSystem';
import { cleanEmptyDirectories } from '@/utils/sorter';
import FolderCard from '../molecules/FolderCard';

interface FileExplorerProps {
  rootDirectory: DirectoryData;
  onToggleFolder: (folderName: string) => void;
  onLoadFolder: (dir: DirectoryData) => Promise<void>;
  onRefresh: () => void;
  onSelectAll: (handle: FileSystemDirectoryHandle) => void;
  onDeselectAll: (handle: FileSystemDirectoryHandle) => void;
}

export default function FileExplorer({ rootDirectory, onToggleFolder, onLoadFolder, onRefresh, onSelectAll, onDeselectAll }: FileExplorerProps) {
  // Navigation state: stocke uniquement les noms des dossiers traversés (pour éviter les references mortes)
  const [pathNames, setPathNames] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

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

  const [loadingFolder, setLoadingFolder] = useState<string | null>(null);

  const handleNavigateIn = async (dir: DirectoryData) => {
    if (dir.scanned === false) {
      setLoadingFolder(dir.name);
      await onLoadFolder(dir);
      setLoadingFolder(null);
    }
    setPathNames((prev) => [...prev, dir.name]);
    setPage(1);
  };

  const handleNavigateOut = () => {
    if (pathNames.length > 0) {
      setPathNames(pathNames.slice(0, -1));
      setPage(1);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isRoot && (
            <IconButton onClick={handleNavigateOut} sx={{ mr: 2 }} color="primary" aria-label="Retour">
              <ArrowBackIcon fontSize="large" />
            </IconButton>
          )}
          <Typography variant="h2">
            {isRoot ? 'Dossiers trouvés :' : `Contenu de ${currentDir.name}`}
          </Typography>
        </Box>
        
        {currentDir.children.some(child => child.kind === 'directory') && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" color="primary" onClick={() => onSelectAll(currentDir.handle)} sx={{ fontWeight: 'bold' }}>
              Tout sélectionner
            </Button>
            <Button variant="outlined" color="error" onClick={() => onDeselectAll(currentDir.handle)} sx={{ fontWeight: 'bold' }}>
              Tout désélectionner
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {currentDir.children.slice(0, page * itemsPerPage).map((child) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={child.name}>
            <FolderCard
              name={child.name}
              included={child.included}
              fileCount={child.fileCount}
              onToggleInclude={() => onToggleFolder(child.name)}
              onClick={() => handleNavigateIn(child as DirectoryData)}
              isLoading={loadingFolder === child.name}
            />
          </Grid>
        ))}
        {currentDir.children.length === 0 && (
          <Typography variant="body1" sx={{ mt: 4, fontStyle: 'italic', color: 'text.secondary' }}>
            Ce dossier est vide.
          </Typography>
        )}
      </Grid>

      {currentDir.children.length > page * itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => setPage(prev => prev + 1)}
            sx={{ fontWeight: 'bold', borderRadius: 4, px: 4 }}
          >
            Afficher plus de dossiers ({currentDir.children.length - page * itemsPerPage} restants)
          </Button>
        </Box>
      )}

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

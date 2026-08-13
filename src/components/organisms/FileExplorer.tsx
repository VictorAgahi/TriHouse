'use client';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Grid, IconButton, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DirectoryData, FileData, getFilesInDirectory } from '@/utils/fileSystem';
import FolderCard from '../molecules/FolderCard';
import MediaCard from '../molecules/MediaCard';

interface FileExplorerProps {
  rootDirectory: DirectoryData;
  pathNames: string[];
  setPathNames: React.Dispatch<React.SetStateAction<string[]>>;
  onToggleFolder: (folderName: string) => void;
  onSelectAll: (handle: FileSystemDirectoryHandle) => void;
  onDeselectAll: (handle: FileSystemDirectoryHandle) => void;
}

export default function FileExplorer({ rootDirectory, pathNames, setPathNames, onToggleFolder, onSelectAll, onDeselectAll }: FileExplorerProps) {
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

  const [currentFiles, setCurrentFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filePage, setFilePage] = useState(1);

  useEffect(() => {
    let active = true;
    if (currentDir) {
      const loadData = async () => {
        try {
          const files = await getFilesInDirectory(currentDir.handle, pathNames);
          if (active) {
            setCurrentFiles(files);
            setIsLoadingFiles(false);
          }
        } catch (err) {
          console.error(err);
          if (active) setIsLoadingFiles(false);
        }
      };
      
      setTimeout(() => {
        if (active) {
          setIsLoadingFiles(true);
          setFilePage(1);
          loadData();
        }
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [currentDir, pathNames]);

  const handleNavigateIn = async (dir: DirectoryData) => {
    setPathNames((prev) => [...prev, dir.name]);
    setPage(1);
    setFilePage(1);
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
              imageCount={child.imageCount}
              videoCount={child.videoCount}
              onToggleInclude={() => onToggleFolder(child.name)}
              onClick={() => handleNavigateIn(child as DirectoryData)}
            />
          </Grid>
        ))}
        {currentFiles.slice(0, filePage * itemsPerPage).map((file) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={file.name}>
            <MediaCard file={file} />
          </Grid>
        ))}
        {isLoadingFiles && (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {currentDir.children.length === 0 && currentFiles.length === 0 && !isLoadingFiles && (
          <Typography variant="body1" sx={{ mt: 4, fontStyle: 'italic', color: 'text.secondary', width: '100%', textAlign: 'center' }}>
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
      {currentFiles.length > filePage * itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            size="large"
            onClick={() => setFilePage(prev => prev + 1)}
            sx={{ fontWeight: 'bold', borderRadius: 4, px: 4 }}
          >
            Afficher plus d&apos;images/vidéos ({currentFiles.length - filePage * itemsPerPage} restantes)
          </Button>
        </Box>
      )}

    </Box>
  );
}

'use client';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Grid, Button, CircularProgress, TextField, InputAdornment } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { DirectoryData, FileData, getFilesInDirectory, saveDroppedFile } from '@/utils/fileSystem';
import FolderCard from '../molecules/FolderCard';
import MediaCard from '../molecules/MediaCard';
import InstaViewer from './InstaViewer';

interface FileExplorerProps {
  rootDirectory: DirectoryData;
  pathNames: string[];
  setPathNames: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function FileExplorer({ rootDirectory, pathNames, setPathNames }: FileExplorerProps) {
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [fileToMove, setFileToMove] = useState<FileData | null>(null);
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // Aplatir l'arborescence pour la recherche dans la modale de déplacement
  const allFolders = useMemo(() => {
    const list: { dir: DirectoryData, path: string[] }[] = [];
    const traverse = (dir: DirectoryData, path: string[]) => {
      list.push({ dir, path });
      for (const child of dir.children) {
        if (child.kind === 'directory') {
          traverse(child as DirectoryData, [...path, child.name]);
        }
      }
    };
    // Ne pas inclure la racine si on veut forcer le rangement dans des sous-dossiers, 
    // ou l'inclure avec le nom "Racine". On l'inclut pour flexibilité.
    traverse(rootDirectory, [rootDirectory.name]);
    return list;
  }, [rootDirectory]);

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


  const handleNavigateOut = () => {
    if (pathNames.length > 0) {
      setPathNames(pathNames.slice(0, -1));
      setPage(1);
      setSearchQuery('');
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      await currentDir.handle.removeEntry(fileName);
      setCurrentFiles(prev => prev.filter(f => f.name !== fileName));
    } catch (err) {
      console.error("Erreur lors de la suppression de " + fileName, err);
    }
  };

  const getMatchingFolders = (dir: DirectoryData, query: string, currentRelativePath: string[] = []): { dir: DirectoryData, path: string[] }[] => {
    const matches: { dir: DirectoryData, path: string[] }[] = [];
    for (const child of dir.children) {
      const childDir = child as DirectoryData;
      const childPath = [...currentRelativePath, child.name];
      if (child.name.toLowerCase().includes(query)) {
        matches.push({ dir: childDir, path: childPath });
      }
      matches.push(...getMatchingFolders(childDir, query, childPath));
    }
    return matches;
  };

  const filteredFolders = searchQuery 
    ? getMatchingFolders(currentDir, searchQuery.toLowerCase()) 
    : currentDir.children.map(child => ({ dir: child as DirectoryData, path: [child.name] }));
  
  const filteredFiles = currentFiles.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUploading(true);
      const newFiles: FileData[] = [];
      
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const savedFile = await saveDroppedFile(currentDir.handle, file, pathNames);
        if (savedFile) {
          newFiles.push(savedFile);
        }
      }
      
      if (newFiles.length > 0) {
        setCurrentFiles(prev => [...prev, ...newFiles]);
      }
      setIsUploading(false);
    }
  };

  const handleConfirmMove = async (targetDir: DirectoryData) => {
    if (!fileToMove) return;
    setIsMoving(true);
    try {
      // 1. Lire le fichier source
      const file = await fileToMove.handle.getFile();
      // 2. Créer le nouveau fichier dans la destination
      const newHandle = await targetDir.handle.getFileHandle(file.name, { create: true });
      const writable = await newHandle.createWritable();
      await writable.write(file);
      await writable.close();
      
      // 3. Supprimer de l'emplacement d'origine
      const sourceParent = fileToMove.parentHandle || currentDir.handle;
      await sourceParent.removeEntry(file.name);
      
      // 4. Mettre à jour l'état local
      setCurrentFiles(prev => prev.filter(f => f.name !== file.name));
      
      setFileToMove(null);
      setMoveSearchQuery('');
    } catch (err) {
      console.error("Erreur lors du déplacement", err);
    }
    setIsMoving(false);
  };

  const filteredMoveFolders = allFolders.filter(f => 
    f.dir !== currentDir && // Ne pas proposer le dossier actuel
    f.path.join('/').toLowerCase().includes(moveSearchQuery.toLowerCase())
  );

  return (
    <Box 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{ 
        position: 'relative', 
        minHeight: '60vh',
        border: isDragging ? '4px dashed' : 'none',
        borderColor: 'primary.main',
        borderRadius: 4,
        p: isDragging ? 2 : 0,
        transition: 'all 0.3s ease'
      }}
    >
      {isDragging && (
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(25, 118, 210, 0.1)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          pointerEvents: 'none'
        }}>
          <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
            Déposez vos photos/vidéos ici !
          </Typography>
        </Box>
      )}

      {isUploading && (
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4
        }}>
          <CircularProgress size={80} sx={{ mb: 4 }} />
          <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
            Copie des fichiers en cours...
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {!isRoot && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleNavigateOut}
              startIcon={<ArrowBackIcon sx={{ fontSize: 32 }} />}
              sx={{ fontSize: '1.2rem', fontWeight: 'bold', py: 1.5, px: 3, borderRadius: 3 }}
            >
              Retour au dossier précédent
            </Button>
          )}
          <Typography variant="h2" sx={{ fontSize: '2rem', fontWeight: 'bold', color: 'primary.main' }}>
            {isRoot ? 'Vos Dossiers :' : `Dossier : ${currentDir.name}`}
          </Typography>
        </Box>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Entrez le nom d'un dossier ou d'une photo pour chercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </InputAdornment>
              ),
              sx: { fontSize: '1.5rem', py: 1, borderRadius: 4, bgcolor: 'white' }
            }
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredFolders.slice(0, page * itemsPerPage).map(({ dir, path }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={path.join('/')}>
            <FolderCard
              name={dir.name}
              subtitle={path.length > 1 ? `Dans: ${path.slice(0, -1).join('/')}` : undefined}
              imageCount={dir.imageCount}
              videoCount={dir.videoCount}
              onClick={() => {
                setPathNames(prev => [...prev, ...path]);
                setPage(1);
                setFilePage(1);
                setSearchQuery('');
              }}
            />
          </Grid>
        ))}
        {filteredFiles.slice(0, filePage * itemsPerPage).map((file, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={file.name}>
            <MediaCard 
              file={file} 
              onClick={() => {
                setViewerIndex(index);
                setViewerOpen(true);
              }}
            />
          </Grid>
        ))}
        {isLoadingFiles && (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {filteredFolders.length === 0 && filteredFiles.length === 0 && !isLoadingFiles && (
          <Typography variant="body1" sx={{ mt: 4, fontStyle: 'italic', color: 'text.secondary', width: '100%', textAlign: 'center', fontSize: '1.5rem' }}>
            Aucun résultat trouvé.
          </Typography>
        )}
      </Grid>

      {filteredFolders.length > page * itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => setPage(prev => prev + 1)}
            sx={{ fontSize: '1.5rem', fontWeight: 'bold', borderRadius: 4, px: 6, py: 2 }}
          >
            Afficher plus de dossiers ({filteredFolders.length - page * itemsPerPage} restants)
          </Button>
        </Box>
      )}
      {filteredFiles.length > filePage * itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            size="large"
            onClick={() => setFilePage(prev => prev + 1)}
            sx={{ fontSize: '1.5rem', fontWeight: 'bold', borderRadius: 4, px: 6, py: 2 }}
          >
            Afficher plus d&apos;images/vidéos ({filteredFiles.length - filePage * itemsPerPage} restantes)
          </Button>
        </Box>
      )}

      {/* Vue plein écran pour les images/vidéos */}
      <InstaViewer
        open={viewerOpen}
        files={filteredFiles}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onDelete={handleDeleteFile}
        onMoveRequest={(file) => setFileToMove(file)}
      />

      {/* Modal de Déplacement */}
      <Dialog 
        open={!!fileToMove} 
        onClose={() => !isMoving && setFileToMove(null)}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 4, p: 2, minHeight: '60vh' } }}
      >
        <DialogTitle>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
            Déplacer &quot;{fileToMove?.name}&quot;
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Tapez l'endroit où vous voulez déplacer..."
            value={moveSearchQuery}
            onChange={(e) => setMoveSearchQuery(e.target.value)}
            disabled={isMoving}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                sx: { fontSize: '1.2rem', borderRadius: 3 }
              }
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {isMoving ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6">Déplacement en cours...</Typography>
            </Box>
          ) : (
            <List>
              {filteredMoveFolders.slice(0, 50).map(({ dir, path }) => (
                <ListItem key={path.join('/')} disablePadding>
                  <ListItemButton 
                    onClick={() => handleConfirmMove(dir)}
                    sx={{ borderRadius: 2, mb: 1, border: '1px solid #eee' }}
                  >
                    <ListItemIcon>
                      <FolderIcon color="primary" fontSize="large" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={dir.name}
                      secondary={path.slice(0, -1).join('/')}
                      slotProps={{
                        primary: { variant: 'h6', sx: { fontWeight: 'bold' } },
                        secondary: { variant: 'body2' }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredMoveFolders.length === 0 && (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 4, fontStyle: 'italic' }}>
                  Aucun dossier trouvé.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

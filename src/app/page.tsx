'use client';
import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { Container, Typography, Box, AppBar, Toolbar, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import UndoIcon from '@mui/icons-material/Undo';
import CircularProgress from '@mui/material/CircularProgress';
import { scanDirectory, DirectoryData, FileData } from '@/utils/fileSystem';
import { generateSortPlan, executeSortPlan, SortPlan, undoSortPlan } from '@/utils/sorter';
import ActionButton from '@/components/atoms/ActionButton';
import FileExplorer from '@/components/organisms/FileExplorer';
import ConfirmationModal from '@/components/organisms/ConfirmationModal';
import SortingProgress from '@/components/organisms/SortingProgress';
import InstaViewer from '@/components/organisms/InstaViewer';

export default function Home() {
  const [rootDirectory, setRootDirectory] = useState<DirectoryData | null>(null);
  
  // States pour le tri
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sortPlan, setSortPlan] = useState<SortPlan | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isScanningTree, setIsScanningTree] = useState(false);
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // States pour l'InstaViewer Global
  const [globalViewerOpen, setGlobalViewerOpen] = useState(false);
  const [globalFiles, setGlobalFiles] = useState<FileData[]>([]);

  useEffect(() => {
    get('root-dir-handle').then(async (handle) => {
      if (handle) {
        const dirHandle = handle as FileSystemDirectoryHandle;
        setSavedHandle(dirHandle);
        try {
          // @ts-expect-error - missing global type
          const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            const data = await scanDirectory(dirHandle);
            setRootDirectory(data);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }).catch(console.error);
  }, []);

  const handleSelectFolder = async () => {
    try {
      // @ts-expect-error - API standard mais type global manquant
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await set('root-dir-handle', dirHandle);
      setSavedHandle(dirHandle);
      const data = await scanDirectory(dirHandle);
      setRootDirectory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeFolder = async () => {
    if (!savedHandle) return;
    try {
      // @ts-expect-error - missing global type
      const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        const data = await scanDirectory(savedHandle);
        setRootDirectory(data);
      } else {
        // @ts-expect-error - missing global type
        const request = await savedHandle.requestPermission({ mode: 'readwrite' });
        if (request === 'granted') {
          const data = await scanDirectory(savedHandle);
          setRootDirectory(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFolderInclude = (dirData: DirectoryData, targetName: string): DirectoryData => {
    if (dirData.name === targetName) {
      return { ...dirData, included: !dirData.included };
    }
    const newChildren = dirData.children.map(child => {
      if (child.kind === 'directory') {
        return toggleFolderInclude(child as DirectoryData, targetName);
      }
      return child;
    });
    return { ...dirData, children: newChildren };
  };

  const handleToggleFolder = (folderName: string) => {
    if (rootDirectory && !isSorting && !isUndoing && !isComplete) {
      setRootDirectory(toggleFolderInclude(rootDirectory, folderName));
    }
  };

  const handleSetAllInclusion = (root: DirectoryData, targetHandle: FileSystemDirectoryHandle, include: boolean): DirectoryData => {
    if (root.handle === targetHandle) {
      const newChildren = root.children.map(child => {
        if (child.kind === 'directory') {
          return { ...child, included: include } as DirectoryData;
        }
        return child;
      });
      return { ...root, children: newChildren };
    }
    const newChildren = root.children.map(child => {
      if (child.kind === 'directory') {
        return handleSetAllInclusion(child as DirectoryData, targetHandle, include);
      }
      return child;
    });
    return { ...root, children: newChildren };
  };

  const handleSelectAll = (targetHandle: FileSystemDirectoryHandle) => {
    setRootDirectory(prev => prev ? handleSetAllInclusion(prev, targetHandle, true) : null);
  };

  const handleDeselectAll = (targetHandle: FileSystemDirectoryHandle) => {
    setRootDirectory(prev => prev ? handleSetAllInclusion(prev, targetHandle, false) : null);
  };

  const replaceDirectoryNode = (root: DirectoryData, targetHandle: FileSystemDirectoryHandle, newData: DirectoryData): DirectoryData => {
    if (root.handle === targetHandle) {
      return { ...newData, included: root.included };
    }
    const newChildren = root.children.map(child => {
      if (child.kind === 'directory') {
        return replaceDirectoryNode(child as DirectoryData, targetHandle, newData);
      }
      return child;
    });
    return { ...root, children: newChildren };
  };

  const handleLoadFolder = async (dir: DirectoryData) => {
    if (!rootDirectory) return;
    try {
      const scannedDir = await scanDirectory(dir.handle, false);
      setRootDirectory(prev => prev ? replaceDirectoryNode(prev, dir.handle, scannedDir) : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreSort = async () => {
    if (!rootDirectory) return;
    setIsScanningTree(true);
    try {
      const deepScanned = await scanDirectory(rootDirectory.handle, true);
      setRootDirectory(deepScanned);
      const plan = generateSortPlan(deepScanned);
      setSortPlan(plan);
      setShowConfirmation(true);
    } catch (e) {
      console.error(e);
    }
    setIsScanningTree(false);
  };

  const handleConfirmSort = async () => {
    if (!sortPlan || !rootDirectory) return;
    setShowConfirmation(false);
    setIsSorting(true);
    setProgress(0);
    
    await executeSortPlan(sortPlan, rootDirectory.handle, (prog) => {
      setProgress(prog);
    });
    
    setIsSorting(false);
    setIsComplete(true);
  };

  const handleUndoSort = async () => {
    if (!sortPlan || !rootDirectory) return;
    setIsComplete(false);
    setIsUndoing(true);
    setProgress(0);
    
    await undoSortPlan(sortPlan, rootDirectory.handle, (prog) => {
      setProgress(prog);
    });
    
    setIsUndoing(false);
    setSortPlan(null);
    handleRefresh();
  };

  const collectAllFiles = (dir: DirectoryData): FileData[] => {
    let files: FileData[] = [];
    for (const child of dir.children) {
      if (child.kind === 'file') {
        files.push(child);
      } else {
        if ((child as DirectoryData).included) {
          files = files.concat(collectAllFiles(child as DirectoryData));
        }
      }
    }
    return files;
  };

  const handleGlobalShuffle = async () => {
    if (!rootDirectory) return;
    setIsScanningTree(true);
    try {
      const deepScanned = await scanDirectory(rootDirectory.handle, true);
      setRootDirectory(deepScanned);
      const allFiles = collectAllFiles(deepScanned);
      for (let i = allFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allFiles[i], allFiles[j]] = [allFiles[j], allFiles[i]];
      }
      setGlobalFiles(allFiles);
      setGlobalViewerOpen(true);
    } catch (e) {
      console.error(e);
    }
    setIsScanningTree(false);
  };

  const handleRefresh = async () => {
    if (rootDirectory) {
      const data = await scanDirectory(rootDirectory.handle);
      setRootDirectory(data);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main', mb: 4 }}>
        <Toolbar sx={{ py: 2 }}>
          <HomeIcon sx={{ fontSize: 40, mr: 2, color: 'white' }} />
          <Typography variant="h1" component="div" sx={{ color: 'white', flexGrow: 1 }}>
            TriHouse
          </Typography>
          {rootDirectory && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {sortPlan && isComplete && (
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  onClick={handleUndoSort}
                  startIcon={<UndoIcon />}
                  sx={{ fontWeight: 'bold', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Annuler le dernier tri
                </Button>
              )}
              <Button 
                variant="contained" 
                color="error" 
                onClick={() => {
                  setRootDirectory(null);
                  setIsSorting(false);
                  setIsComplete(false);
                  setSortPlan(null);
                }}
                sx={{ fontWeight: 'bold' }}
              >
                Sortir
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flexGrow: 1, pb: 24, px: { xs: 2, md: 4, xl: 8 } }}>
        {!rootDirectory ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <Typography variant="h2" gutterBottom>
              Bienvenue sur TriHouse
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
              Sélectionnez le dossier contenant vos photos et vidéos sur votre ordinateur. 
              Nous allons vous aider à tout ranger par année très facilement.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <ActionButton onClick={handleSelectFolder}>
                {savedHandle ? "1. Choisir un nouveau dossier à trier" : "1. Sélectionner mon dossier principal (Images)"}
              </ActionButton>
              
              {savedHandle && (
                <ActionButton 
                  onClick={handleResumeFolder} 
                  sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                >
                  2. Reprendre le dossier de la dernière fois (On vous demandera d&apos;accepter)
                </ActionButton>
              )}
            </Box>
          </Box>
        ) : isSorting || isUndoing || isComplete ? (
          <SortingProgress 
            progress={progress} 
            isComplete={isComplete} 
            onReturn={() => {
              setIsComplete(false);
              setSortPlan(null);
              setRootDirectory(null);
            }} 
            onUndo={handleUndoSort}
            isUndoing={isUndoing}
          />
        ) : (
          <FileExplorer 
            rootDirectory={rootDirectory} 
            onToggleFolder={handleToggleFolder}
            onLoadFolder={handleLoadFolder}
            onRefresh={handleRefresh}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}
      </Container>

      {rootDirectory && !isSorting && !isUndoing && !isComplete && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            bgcolor: 'white', 
            borderTop: '1px solid #e0e0e0',
            p: 3, 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
            zIndex: 1000
          }}
        >
          <ActionButton onClick={handlePreSort} disabled={isScanningTree}>
            {isScanningTree ? <CircularProgress size={24} sx={{ color: 'white' }} /> : "Ranger toutes mes photos par année"}
          </ActionButton>
          <Button 
            variant="outlined" 
            color="primary" 
            size="large" 
            onClick={handleGlobalShuffle}
            disabled={isScanningTree}
            sx={{ fontWeight: 'bold', width: '100%', maxWidth: 400, borderRadius: 2, py: 1.5 }}
          >
            {isScanningTree ? "Analyse en cours..." : "Visionner tout au hasard"}
          </Button>
        </Box>
      )}

      <InstaViewer
        open={globalViewerOpen}
        files={globalFiles}
        initialIndex={0}
        onClose={() => setGlobalViewerOpen(false)}
        onDelete={(fileName) => {
          // Dans le mode global, pour simplifier sans casser le state complexe de FileExplorer, 
          // on peut retirer de l'affichage local et appeler une suppression. 
          // On passe par rootDirectory... mais on verra ça plus tard, pour l'instant on enlève juste de globalFiles
          setGlobalFiles(prev => prev.filter(f => f.name !== fileName));
        }}
      />

      {sortPlan && (
        <ConfirmationModal
          open={showConfirmation}
          sortPlan={sortPlan}
          onConfirm={handleConfirmSort}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </Box>
  );
}

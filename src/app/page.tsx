'use client';
import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { Container, Typography, Box, AppBar, Toolbar, Button, Tabs, Tab } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { scanDirectory, DirectoryData } from '@/utils/fileSystem';
import ActionButton from '@/components/atoms/ActionButton';
import FileExplorer from '@/components/organisms/FileExplorer';
import DiscoverPage from '@/components/organisms/DiscoverPage';
import SortPage from '@/components/organisms/SortPage';

export default function Home() {
  const [rootDirectory, setRootDirectory] = useState<DirectoryData | null>(null);
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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
    if (rootDirectory) {
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
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, val) => setActiveTab(val)}
                textColor="inherit"
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: 'white' },
                  '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '1.1rem' },
                  '& .Mui-selected': { color: 'white' },
                }}
              >
                <Tab label="Explorateur" />
                <Tab label="Découverte" />
                <Tab label="Tri" />
              </Tabs>
              <Button 
                variant="contained" 
                color="error" 
                onClick={() => setRootDirectory(null)}
                sx={{ fontWeight: 'bold' }}
              >
                Sortir
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flexGrow: 1, pb: 8, px: { xs: 2, md: 4, xl: 8 } }}>
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
        ) : (
          <>
            {activeTab === 0 && (
              <FileExplorer 
                rootDirectory={rootDirectory} 
                onToggleFolder={handleToggleFolder}
                onLoadFolder={handleLoadFolder}
                onRefresh={handleRefresh}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            )}
            {activeTab === 1 && (
              <DiscoverPage rootDirectory={rootDirectory} />
            )}
            {activeTab === 2 && (
              <SortPage 
                rootDirectory={rootDirectory} 
                onRefresh={handleRefresh} 
                onExit={() => {
                  setRootDirectory(null);
                  setActiveTab(0);
                }} 
              />
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { Container, Typography, Box, AppBar, Toolbar, Button, Tabs, Tab, CircularProgress } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { scanDirectory, DirectoryData } from '@/utils/fileSystem';
import ActionButton from '@/components/atoms/ActionButton';
import FileExplorer from '@/components/organisms/FileExplorer';
import DiscoverPage from '@/components/organisms/DiscoverPage';

export default function Home() {
  const [rootDirectory, setRootDirectory] = useState<DirectoryData | null>(null);
  const [savedHandle, setSavedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [explorerPath, setExplorerPath] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // 1. Tenter de charger le cache instantanément
    get('root-dir-cache').then((cache) => {
      if (cache) {
        setRootDirectory(cache as DirectoryData);
      }
    }).catch(console.error);

    // 2. Vérifier les permissions et lancer le scan en arrière-plan
    get('root-dir-handle').then(async (handle) => {
      if (handle) {
        const dirHandle = handle as FileSystemDirectoryHandle;
        setSavedHandle(dirHandle);
        try {
          // @ts-expect-error - missing global type
          const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            setIsScanning(true);
            const data = await scanDirectory(dirHandle, true);
            setRootDirectory(data);
            await set('root-dir-cache', data);
            setIsScanning(false);
          }
        } catch (e) {
          console.error(e);
          setIsScanning(false);
        }
      }
    }).catch(console.error);
  }, []);

  const handleMainAction = async () => {
    setIsScanning(true);
    try {
      if (savedHandle) {
        // @ts-expect-error - missing global type
        const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          const data = await scanDirectory(savedHandle, true);
          setRootDirectory(data);
          await set('root-dir-cache', data);
          setIsScanning(false);
          return;
        } else {
          // @ts-expect-error - missing global type
          const request = await savedHandle.requestPermission({ mode: 'readwrite' });
          if (request === 'granted') {
            const data = await scanDirectory(savedHandle, true);
            setRootDirectory(data);
            await set('root-dir-cache', data);
            setIsScanning(false);
            return;
          }
        }
      }
      
      // Fallback
      // @ts-expect-error - API standard mais type global manquant
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await set('root-dir-handle', dirHandle);
      setSavedHandle(dirHandle);
      const data = await scanDirectory(dirHandle, true);
      setRootDirectory(data);
      await set('root-dir-cache', data);
    } catch (err) {
      console.error(err);
    }
    setIsScanning(false);
  };

  // onLoadFolder removed as directories are now deeply scanned on first load


  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main', mb: 4 }}>
        <Toolbar sx={{ py: 2 }}>
          <HomeIcon sx={{ fontSize: 40, mr: 2, color: 'white' }} />
          <Typography variant="h1" component="div" sx={{ color: 'white', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            TriHouse
            {rootDirectory && (
              <Typography variant="body2" component="span" sx={{ ml: 3, opacity: 0.9 }}>
                ({rootDirectory.imageCount} image(s), {rootDirectory.videoCount} vidéo(s) au total)
              </Typography>
            )}
            {isScanning && (
              <CircularProgress size={20} sx={{ color: 'white', ml: 2, opacity: 0.7 }} />
            )}
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
              <ActionButton onClick={handleMainAction} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <CircularProgress size={24} sx={{ color: 'white', mr: 2 }} />
                    Comptage en cours...
                  </>
                ) : (
                  "Explorer un dossier"
                )}
              </ActionButton>
            </Box>
          </Box>
        ) : (
          <>
            {activeTab === 0 && (
              <FileExplorer 
                rootDirectory={rootDirectory} 
                pathNames={explorerPath}
                setPathNames={setExplorerPath}
              />
            )}
            {activeTab === 1 && (
              <DiscoverPage 
                rootDirectory={rootDirectory} 
                onGoToExplorer={(path) => {
                  setExplorerPath(path);
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

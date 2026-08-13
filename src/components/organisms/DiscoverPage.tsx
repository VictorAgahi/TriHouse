'use client';
import { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { DirectoryData, getSelectedFilesHandles, FileData } from '@/utils/fileSystem';
import InstaViewer from './InstaViewer';

interface DiscoverPageProps {
  rootDirectory: DirectoryData;
  onGoToExplorer: (path: string[]) => void;
}

export default function DiscoverPage({ rootDirectory, onGoToExplorer }: DiscoverPageProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [shuffledFiles, setShuffledFiles] = useState<FileData[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleShuffle = async () => {
    setIsScanning(true);
    try {
      const handles = await getSelectedFilesHandles(rootDirectory);
      // Shuffle the handles
      for (let i = handles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [handles[i], handles[j]] = [handles[j], handles[i]];
      }
      
      const filesData: FileData[] = handles.map(h => ({
        handle: h.handle,
        name: h.handle.name,
        kind: 'file',
        year: null,
        parentHandle: h.parentHandle,
        folderPath: h.folderPath
      }));
      
      setShuffledFiles(filesData);
      setViewerOpen(true);
    } catch (e) {
      console.error(e);
    }
    setIsScanning(false);
  };

  const handleDelete = async (fileName: string) => {
    const file = shuffledFiles.find(f => f.name === fileName);
    if (!file || !file.parentHandle) return;
    try {
      await file.parentHandle.removeEntry(fileName);
      setShuffledFiles(prev => prev.filter(f => f.name !== fileName));
    } catch (e) {
      console.error("Erreur lors de la suppression:", e);
    }
  };

  const handleExplore = (file: FileData) => {
    if (file.folderPath) {
      onGoToExplorer(file.folderPath);
    }
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom>
        Découverte Aléatoire
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
        Redécouvrez vos souvenirs oubliés. Le visionnage se fera uniquement parmi les dossiers que vous avez sélectionnés dans l&apos;Explorateur.
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        size="large" 
        onClick={handleShuffle}
        disabled={isScanning}
        sx={{ fontWeight: 'bold', borderRadius: 2, py: 2, px: 6, fontSize: '1.2rem' }}
      >
        {isScanning ? <CircularProgress size={28} sx={{ color: 'white', mr: 2 }} /> : null}
        {isScanning ? "Recherche des fichiers..." : "Visionner au hasard"}
      </Button>

      <InstaViewer
        open={viewerOpen}
        files={shuffledFiles}
        initialIndex={0}
        onClose={() => setViewerOpen(false)}
        onDelete={handleDelete}
        onExplore={handleExplore}
      />
    </Box>
  );
}

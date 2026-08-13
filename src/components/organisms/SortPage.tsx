'use client';
import { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { DirectoryData } from '@/utils/fileSystem';
import { generateSortPlan, executeSortPlan, SortPlan, undoSortPlan } from '@/utils/sorter';
import SortingProgress from './SortingProgress';
import ConfirmationModal from './ConfirmationModal';
import ActionButton from '../atoms/ActionButton';

interface SortPageProps {
  rootDirectory: DirectoryData;
  onRefresh: () => void;
  onExit: () => void;
}

export default function SortPage({ rootDirectory, onRefresh, onExit }: SortPageProps) {
  const [isScanningTree, setIsScanningTree] = useState(false);
  const [sortPlan, setSortPlan] = useState<SortPlan | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const handlePreSort = async () => {
    setIsScanningTree(true);
    try {
      const plan = await generateSortPlan(rootDirectory);
      setSortPlan(plan);
      setShowConfirmation(true);
    } catch (e) {
      console.error(e);
    }
    setIsScanningTree(false);
  };

  const handleConfirmSort = async () => {
    if (!sortPlan) return;
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
    if (!sortPlan) return;
    setIsComplete(false);
    setIsUndoing(true);
    setProgress(0);
    
    await undoSortPlan(sortPlan, rootDirectory.handle, (prog) => {
      setProgress(prog);
    });
    
    setIsUndoing(false);
    setSortPlan(null);
    onRefresh();
  };

  if (isSorting || isUndoing || isComplete) {
    return (
      <SortingProgress 
        progress={progress} 
        isComplete={isComplete} 
        onReturn={() => {
          setIsComplete(false);
          setSortPlan(null);
          onExit();
        }} 
        onUndo={handleUndoSort}
        isUndoing={isUndoing}
      />
    );
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" gutterBottom>
        Rangement Automatique
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
        Cette action va créer des dossiers par année à la racine et y déplacer toutes les photos et vidéos des dossiers sélectionnés.
      </Typography>

      <ActionButton onClick={handlePreSort} disabled={isScanningTree}>
        {isScanningTree ? <CircularProgress size={24} sx={{ color: 'white', mr: 2 }} /> : null}
        {isScanningTree ? "Analyse en cours..." : "Ranger les dossiers sélectionnés"}
      </ActionButton>

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

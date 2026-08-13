import { Box, Typography, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ActionButton from '../atoms/ActionButton';

interface SortingProgressProps {
  progress: number;
  isComplete: boolean;
  onReturn: () => void;
  onUndo?: () => void;
  isUndoing?: boolean;
}

export default function SortingProgress({ progress, isComplete, onReturn, onUndo, isUndoing }: SortingProgressProps) {
  if (isComplete) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#e8f5e9', borderRadius: 4, mt: 4 }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: '#2e7d32', mb: 2 }} />
        <Typography variant="h2" sx={{ color: '#2e7d32' }} gutterBottom>
          Merveilleux !
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Toutes vos photos et vidéos sont parfaitement rangées par année.
        </Typography>
        <ActionButton onClick={onReturn}>
          Retourner à l&apos;accueil
        </ActionButton>
        {onUndo && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Vous avez fait une erreur ?
            </Typography>
            <ActionButton 
              onClick={onUndo} 
              sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, fontSize: '1rem', py: 1 }}
            >
              Annuler et remettre comme avant
            </ActionButton>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 4, boxShadow: 1, mt: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        {isUndoing ? 'Annulation en cours...' : 'Rangement en cours...'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 4 }}>
        <Box sx={{ width: '100%', mr: 3 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 20, borderRadius: 10 }} />
        </Box>
        <Typography variant="h3" color="text.secondary">
          {progress}%
        </Typography>
      </Box>
    </Box>
  );
}

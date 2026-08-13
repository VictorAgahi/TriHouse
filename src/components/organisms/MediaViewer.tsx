import { Dialog, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface MediaViewerProps {
  open: boolean;
  mediaUrl: string | null;
  isVideo: boolean;
  onClose: () => void;
}

export default function MediaViewer({ open, mediaUrl, isVideo, onClose }: MediaViewerProps) {
  if (!mediaUrl) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth 
      sx={{ '& .MuiDialog-paper': { bgcolor: 'black', borderRadius: 2, m: 2 } }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            color: 'white', 
            bgcolor: 'rgba(255,255,255,0.2)', 
            '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' },
            zIndex: 10
          }}
          aria-label="Fermer"
        >
          <CloseIcon fontSize="large" />
        </IconButton>
        
        {isVideo ? (
          <video src={mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="Visualisation" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
      </Box>
    </Dialog>
  );
}

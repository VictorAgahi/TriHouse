import { Dialog, Box, IconButton, Typography, Fab, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { FileData, getFilePreview } from '@/utils/fileSystem';
import { useEffect, useState, useRef } from 'react';
import exifr from 'exifr';

interface InstaViewerProps {
  open: boolean;
  files: FileData[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (fileName: string) => void;
}

const MediaSlide = ({ file, onDelete, onExplore }: { file: FileData, onDelete: (name: string) => void, onExplore: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ date?: string, location?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isVideo = file.name.match(/\.(mp4|mov|avi)$/i) !== null;

  useEffect(() => {
    let active = true;
    getFilePreview(file.handle).then(async u => {
      if (active) {
        setUrl(u);
        setIsLoading(false);
      }
      // Try to parse EXIF
      try {
        const f = await file.handle.getFile();
        const parsed = await exifr.parse(f);
        if (active && parsed) {
          let loc = '';
          if (parsed.latitude && parsed.longitude) {
            loc = `${parsed.latitude.toFixed(4)}, ${parsed.longitude.toFixed(4)}`;
          }
          let d = '';
          if (parsed.DateTimeOriginal) {
            d = new Date(parsed.DateTimeOriginal).toLocaleDateString('fr-FR', {
              year: 'numeric', month: 'long', day: 'numeric'
            });
          }
          if (d || loc) {
            setMetadata({ date: d, location: loc });
          }
        }
      } catch {
        // Ignorer silencieusement si pas d'EXIF
      }
    });
    return () => {
      active = false;
    };
  }, [file]);

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh', 
      scrollSnapAlign: 'start',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      bgcolor: 'black'
    }}>
      {isLoading && (
        <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', zIndex: 10 }}>
          <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Chargement de la {isVideo ? 'vidéo' : 'photo'}...</Typography>
        </Box>
      )}

      {url && (
        isVideo ? (
          <video src={url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay loop />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )
      )}

      {metadata && (
        <Box sx={{ 
          position: 'absolute', 
          top: 80, 
          left: 20, 
          bgcolor: 'rgba(0,0,0,0.6)', 
          p: 2, 
          borderRadius: 2,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          {metadata.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon fontSize="small" />
              <Typography variant="body2">{metadata.date}</Typography>
            </Box>
          )}
          {metadata.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOnIcon fontSize="small" />
              <Typography variant="body2">{metadata.location}</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Boutons d'action sur le côté droit, en bas */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 40, 
        right: 24, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        alignItems: 'flex-end'
      }}>
        <Fab color="primary" variant="extended" onClick={onExplore}>
          <FolderIcon sx={{ mr: 1 }} />
          Explorer
        </Fab>
        <Fab color="error" variant="extended" onClick={() => onDelete(file.name)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Supprimer
        </Fab>
      </Box>
    </Box>
  );
};

export default function InstaViewer({ open, files, initialIndex, onClose, onDelete }: InstaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open && containerRef.current && initialIndex >= 0) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: initialIndex * window.innerHeight,
            behavior: 'instant'
          });
        }
      }, 50);
    }
  }, [open, initialIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / window.innerHeight);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen
      sx={{ '& .MuiDialog-paper': { bgcolor: 'black' } }}
    >
      <IconButton 
        onClick={onClose} 
        sx={{ 
          position: 'fixed', 
          top: 16, 
          right: 16, 
          color: 'white', 
          bgcolor: 'rgba(255,255,255,0.2)', 
          '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' },
          zIndex: 1300
        }}
      >
        <CloseIcon fontSize="large" />
      </IconButton>

      {/* Instructions de défilement (bouncing arrow) */}
      <Box sx={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        color: 'rgba(255,255,255,0.8)',
        zIndex: 1300,
        pointerEvents: 'none',
        '@keyframes bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }}>
        <ArrowUpwardIcon sx={{ fontSize: 32, animation: 'bounce 2s infinite ease-in-out', animationDelay: '1s' }} />
        <Typography variant="body1" sx={{ fontWeight: 'bold', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Défiler pour naviguer
        </Typography>
        <ArrowDownwardIcon sx={{ fontSize: 32, animation: 'bounce 2s infinite ease-in-out' }} />
      </Box>

      <Box 
        ref={containerRef}
        onScroll={handleScroll}
        sx={{ 
          height: '100vh', 
          overflowY: 'auto', 
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none', // Hide scrollbar for Firefox
          '&::-webkit-scrollbar': { display: 'none' } // Hide scrollbar for Chrome
        }}
      >
        {files.length > 0 && (
          <>
            <Box sx={{ height: `${Math.max(0, currentIndex - 2) * 100}vh` }} />
            {files.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((file) => (
              <MediaSlide key={file.name} file={file} onDelete={onDelete} onExplore={onClose} />
            ))}
            <Box sx={{ height: `${Math.max(0, files.length - 1 - (currentIndex + 2)) * 100}vh` }} />
          </>
        )}
        {files.length === 0 && (
          <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h4" color="white">Aucun fichier à afficher</Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

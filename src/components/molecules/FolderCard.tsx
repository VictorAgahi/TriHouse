import { Card, CardActionArea, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

interface FolderCardProps {
  name: string;
  subtitle?: string;
  imageCount: number;
  videoCount: number;
  onClick: () => void;
  isLoading?: boolean;
}

export default function FolderCard({ name, subtitle, imageCount, videoCount, onClick, isLoading }: FolderCardProps) {
  return (
    <Card 
      sx={{ 
        bgcolor: 'background.paper',
        transition: 'all 0.2s',
        border: '2px solid #e0e0e0',
        borderRadius: 3
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 4 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 0 }}>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <FolderIcon sx={{ fontSize: 120, color: 'primary.main' }} />
            {isLoading && (
              <CircularProgress size={60} sx={{ position: 'absolute', color: 'primary.main' }} />
            )}
          </Box>
          <Typography variant="body1" sx={{ width: '100%', fontWeight: 'bold', mb: subtitle ? 0.5 : 1, fontSize: '1.8rem', textAlign: 'center', wordBreak: 'break-word' }}>
            {name}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ width: '100%', fontSize: '1.2rem', color: 'text.secondary', textAlign: 'center', mb: 1, wordBreak: 'break-word' }}>
              {subtitle}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontSize: '1.2rem', color: 'black', textAlign: 'center', fontWeight: 'bold' }}>
            {isLoading ? 'Chargement...' : `${imageCount} photo(s)\n${videoCount} vidéo(s)`}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

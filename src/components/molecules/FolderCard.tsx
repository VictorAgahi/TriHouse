import { Card, CardActionArea, CardContent, Typography, Checkbox, FormControlLabel, Box, CircularProgress } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

interface FolderCardProps {
  name: string;
  included: boolean;
  imageCount: number;
  videoCount: number;
  onToggleInclude: () => void;
  onClick: () => void;
  isLoading?: boolean;
}

export default function FolderCard({ name, included, imageCount, videoCount, onToggleInclude, onClick, isLoading }: FolderCardProps) {
  return (
    <Card 
      sx={{ 
        bgcolor: included ? 'background.paper' : '#e0e0e0',
        opacity: included ? 1 : 0.6,
        transition: 'all 0.2s',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <FormControlLabel
          control={
            <Checkbox 
              checked={included} 
              onChange={(e) => {
                e.stopPropagation();
                onToggleInclude();
              }}
              size="large"
            />
          }
          label={
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {included ? 'Sélectionné' : 'Non sélectionné'}
            </Typography>
          }
          onClick={(e) => e.stopPropagation()}
        />
      </Box>
      <CardActionArea onClick={onClick} sx={{ p: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 0 }}>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <FolderIcon sx={{ fontSize: 80, color: included ? 'primary.main' : 'text.secondary' }} />
            {isLoading && (
              <CircularProgress size={40} sx={{ position: 'absolute', color: 'primary.main' }} />
            )}
          </Box>
          <Typography variant="body1" noWrap sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Chargement...' : `${imageCount} photo(s), ${videoCount} vidéo(s)`}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

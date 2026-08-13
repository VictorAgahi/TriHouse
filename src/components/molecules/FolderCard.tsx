import { Card, CardActionArea, CardContent, Typography, Checkbox, FormControlLabel, Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';

interface FolderCardProps {
  name: string;
  included: boolean;
  fileCount: number;
  onToggleInclude: () => void;
  onClick: () => void;
}

export default function FolderCard({ name, included, fileCount, onToggleInclude, onClick }: FolderCardProps) {
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
              {included ? 'Inclure dans le tri' : 'Ignorer ce dossier'}
            </Typography>
          }
          onClick={(e) => e.stopPropagation()}
        />
      </Box>
      <CardActionArea onClick={onClick} sx={{ p: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 0 }}>
          <FolderIcon sx={{ fontSize: 80, color: included ? 'primary.main' : 'text.secondary', mb: 2 }} />
          <Typography variant="body1" noWrap sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fileCount} photo{fileCount > 1 ? 's' : ''}/vidéo{fileCount > 1 ? 's' : ''}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

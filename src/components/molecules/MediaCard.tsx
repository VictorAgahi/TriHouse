import { useState, useEffect } from 'react';
import { Card, CardActionArea, CardMedia, Typography, Box } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { FileData, getFilePreview } from '@/utils/fileSystem';

interface MediaCardProps {
  file: FileData;
  onClick?: () => void;
}

export default function MediaCard({ file, onClick }: MediaCardProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    
    const loadPreview = async () => {
      const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(file.name);
      if (isPhoto) {
        const url = await getFilePreview(file.handle);
        if (active && url) {
          objectUrl = url;
          setPreview(url);
        }
      }
    };
    
    loadPreview();
    
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(file.name);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={onClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ height: 160, width: '100%', bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {preview ? (
            <CardMedia
              component="img"
              image={preview}
              alt={file.name}
              sx={{ height: '100%', width: '100%', objectFit: 'cover' }}
            />
          ) : isVideo ? (
            <PlayCircleOutlineIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
          )}
        </Box>
        <Box sx={{ p: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
            {file.name}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}

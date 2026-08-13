'use client';
import { Card, CardContent, Typography, Box } from '@mui/material';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import { useEffect, useState } from 'react';
import { getFilePreview } from '@/utils/fileSystem';

interface PhotoCardProps {
  name: string;
  fileHandle: FileSystemFileHandle;
  onClick?: (url: string | null) => void;
}

export default function PhotoCard({ name, fileHandle, onClick }: PhotoCardProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFilePreview(fileHandle).then((url) => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
    };
  }, [fileHandle]);

  return (
    <Card 
      onClick={() => onClick && onClick(preview)} 
      sx={{ 
        borderRadius: 4, 
        overflow: 'hidden', 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4 } : {} 
      }}
    >
      <Box sx={{ height: 200, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <InsertPhotoIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
        )}
      </Box>
      <CardContent>
        <Typography variant="body1" noWrap title={name}>
          {name}
        </Typography>
      </CardContent>
    </Card>
  );
}

'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Un bleu standard et rassurant
      dark: '#115293',
      light: '#4791db',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124', // Très foncé pour un contraste maximal
      secondary: '#5f6368',
    },
  },
  typography: {
    fontFamily: 'var(--font-roboto), Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    fontSize: 20, // Base font size très grand (20px minimum)
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '1.25rem', // 20px
    },
    h1: {
      fontSize: '2.5rem', // 40px
      fontWeight: 700,
      color: '#1976d2',
    },
    h2: {
      fontSize: '2rem', // 32px
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.75rem', // 28px
      fontWeight: 600,
    },
    body1: {
      fontSize: '1.25rem', // 20px
    },
    body2: {
      fontSize: '1.125rem', // 18px (minimum acceptable pour les textes secondaires)
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

export default theme;

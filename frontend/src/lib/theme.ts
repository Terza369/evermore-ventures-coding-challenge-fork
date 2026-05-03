import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
   palette: {
      mode: 'light',
      primary: {
         main: '#2563eb', // Blue 600
         light: '#3b82f6', // Blue 500
         dark: '#1d4ed8', // Blue 700
         contrastText: '#ffffff',
      },
      secondary: {
         main: '#0ea5e9', // Sky 500
         light: '#38bdf8', // Sky 400
         dark: '#0284c7', // Sky 600
         contrastText: '#ffffff',
      },
      background: {
         default: '#f8fafc', // Slate 50
         paper: '#ffffff',
      },
      text: {
         primary: '#0f172a', // Slate 900
         secondary: '#64748b', // Slate 500
      },
      divider: '#e2e8f0', // Slate 200
   },
   typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: {
         textTransform: 'none',
         fontWeight: 500,
      },
   },
   shape: {
      borderRadius: 8,
   },
   components: {
      MuiButton: {
         styleOverrides: {
            root: {
               borderRadius: '8px',
               boxShadow: 'none',
               '&:hover': {
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
               },
            },
         },
      },
      MuiPaper: {
         styleOverrides: {
            root: {
               backgroundImage: 'none',
            },
            elevation1: {
               boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            },
            elevation2: {
               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
         },
      },
   },
});

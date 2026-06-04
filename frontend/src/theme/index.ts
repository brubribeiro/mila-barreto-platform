import { createTheme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

// Paleta neutra com acento em azul Tiffany
// - Primary: Tiffany Blue (#0ABAB5) como cor de marca / CTAs
// - Secondary: cinza quente, para textos e elementos secundários
// - Fundos: off-white neutro
const baseTheme = createTheme();

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#0ABAB5', // Tiffany Blue clássico
        light: '#5BCCC7',
        dark: '#07807C',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#8B8680', // cinza quente / taupe
        light: '#B5B1AC',
        dark: '#5C5854',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#5A9A7D',
        light: '#8FBFA8',
        dark: '#3F7058',
      },
      warning: {
        main: '#C99230',
        light: '#E0B065',
        dark: '#8E6620',
      },
      error: {
        main: '#C25A4C',
        light: '#D58A81',
        dark: '#8A3F33',
      },
      background: {
        default: '#F8F8F6', // off-white neutro
        paper: '#FFFFFF',
      },
      text: {
        primary: '#2A2A2A',
        secondary: '#6E6E6E',
      },
      divider: '#E8E6E2',
      grey: {
        50: '#F4F4F2',
        100: '#EDEDEB',
        200: '#E0DFDB',
        300: '#C8C6C2',
        400: '#A8A6A2',
        500: '#8B8680',
        600: '#6E6B66',
        700: '#54514D',
        800: '#3A3835',
        900: '#2A2826',
      },
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 600, letterSpacing: '-0.5px' },
      h2: { fontWeight: 600, letterSpacing: '-0.5px' },
      h3: {
        fontWeight: 600,
        letterSpacing: '-0.25px',
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.5rem' },
      },
      h4: {
        fontWeight: 600,
        letterSpacing: '-0.25px',
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.35rem' },
      },
      h5: {
        fontWeight: 600,
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.1rem' },
      },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { boxShadow: 'none' },
          containedPrimary: {
            backgroundColor: '#0ABAB5',
            '&:hover': {
              backgroundColor: '#07807C',
              boxShadow: '0 4px 12px rgba(10, 186, 181, 0.25)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
            backgroundColor: '#FFFFFF',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: '1px solid #EDEDEB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: '#E5F4F3', // tiffany muito pálido
              color: '#07807C',
              '& .MuiListItemIcon-root': { color: '#0ABAB5' },
              '&:hover': { backgroundColor: '#D6EDEC' },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          input: {
            '&:-webkit-autofill': {
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
              WebkitTextFillColor: '#2A2A2A',
              caretColor: '#2A2A2A',
            },
            '&:-webkit-autofill:hover': {
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
            },
            '&:-webkit-autofill:focus': {
              WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
            },
            '&:autofill': {
              boxShadow: '0 0 0 1000px #FFFFFF inset',
              WebkitTextFillColor: '#2A2A2A',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          outlinedPrimary: {
            borderColor: '#0ABAB5',
            color: '#07807C',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: '#F4F4F2',
              fontWeight: 600,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#6E6E6E',
              borderBottom: '1px solid #E8E6E2',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:nth-of-type(even)': {
              backgroundColor: 'rgba(10, 186, 181, 0.025)',
            },
            '&:hover': {
              backgroundColor: 'rgba(10, 186, 181, 0.07)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid #EDEDEB',
            fontSize: '0.875rem',
          },
        },
      },
    },
  },
  ptBR,
);

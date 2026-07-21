import { createTheme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

const baseTheme = createTheme();

const aurora = {
  primary: '#15998B',
  primaryStrong: '#0E7C7B',
  primarySoft: '#D8EFEB',
  primaryTint: '#EAF6F4',
  accent: '#5BC4B8',
  bg: '#EAF1EF',
  surface: '#FFFFFF',
  surface2: '#F3F8F6',
  surface3: '#ECF3F1',
  border: '#E0E8E5',
  borderSoft: '#EAF0EE',
  text: '#0F1C1A',
  textMuted: '#5C6F6B',
  textSoft: '#94A4A0',
  shadow: '0 1px 2px rgba(16,40,37,.04),0 8px 24px -12px rgba(16,40,37,.10)',
  shadowLg: '0 8px 40px -16px rgba(16,40,37,.22)',
};

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: aurora.primary,
        light: aurora.accent,
        dark: aurora.primaryStrong,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#8B8680',
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
        default: aurora.bg,
        paper: aurora.surface,
      },
      text: {
        primary: aurora.text,
        secondary: aurora.textMuted,
      },
      divider: aurora.border,
      grey: {
        50: aurora.surface2,
        100: aurora.surface3,
        200: aurora.border,
        300: '#C8CFCC',
        400: '#A6B0AC',
        500: '#8B8680',
        600: aurora.textMuted,
        700: '#3F4E4A',
        800: '#2A3835',
        900: aurora.text,
      },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.5px' },
      h2: { fontWeight: 800, letterSpacing: '-0.5px' },
      h3: {
        fontWeight: 800,
        letterSpacing: '-0.4px',
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.5rem' },
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.3px',
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.35rem' },
      },
      h5: {
        fontWeight: 700,
        [baseTheme.breakpoints.down('sm')]: { fontSize: '1.1rem' },
      },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${aurora.border} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: aurora.border,
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#C8CFCC',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { boxShadow: 'none', borderRadius: 12 },
          containedPrimary: {
            backgroundColor: aurora.primary,
            '&:hover': {
              backgroundColor: aurora.primaryStrong,
              boxShadow: `0 6px 16px -6px ${aurora.primary}`,
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
            boxShadow: '0 1px 0 rgba(16,40,37,0.05)',
            backgroundColor: aurora.surface,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: `1px solid ${aurora.border}`,
            boxShadow: aurora.shadow,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: aurora.primaryTint,
              color: aurora.primaryStrong,
              '& .MuiListItemIcon-root': { color: aurora.primary },
              '&:hover': { backgroundColor: aurora.primarySoft },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 11,
            backgroundColor: aurora.surface2,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: aurora.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: aurora.primaryStrong },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: aurora.primary,
              borderWidth: 1,
            },
          },
          input: {
            fontSize: '0.875rem',
            '&:-webkit-autofill': {
              WebkitBoxShadow: `0 0 0 1000px ${aurora.surface2} inset`,
              WebkitTextFillColor: aurora.text,
              caretColor: aurora.text,
            },
            '&:-webkit-autofill:hover': {
              WebkitBoxShadow: `0 0 0 1000px ${aurora.surface2} inset`,
            },
            '&:-webkit-autofill:focus': {
              WebkitBoxShadow: `0 0 0 1000px ${aurora.surface2} inset`,
            },
            '&:autofill': {
              boxShadow: `0 0 0 1000px ${aurora.surface2} inset`,
              WebkitTextFillColor: aurora.text,
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { fontSize: '0.875rem' },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          option: { fontSize: '0.875rem' },
          input: { fontSize: '0.875rem' },
        },
      },
      MuiChip: {
        styleOverrides: {
          outlinedPrimary: {
            borderColor: aurora.primary,
            color: aurora.primaryStrong,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: aurora.surface2,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: aurora.textMuted,
              borderBottom: `1px solid ${aurora.border}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:nth-of-type(even)': {
              backgroundColor: 'rgba(21, 153, 139, 0.025)',
            },
            '&:hover': {
              backgroundColor: 'rgba(21, 153, 139, 0.07)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${aurora.borderSoft}`,
            fontSize: '0.875rem',
          },
        },
      },
    },
  },
  ptBR,
);

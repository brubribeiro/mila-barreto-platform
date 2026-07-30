import { Box, Paper, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { fontSizes } from '../theme/fontSizes';

/**
 * Seção padrão das modais (card branco com título em maiúsculas).
 * Use para dividir o conteúdo de formulários em seções consistentes.
 */
export function FormSection({
  title,
  subtitle,
  action,
  children,
  sx,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: '16px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.75 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: fontSizes.xs,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

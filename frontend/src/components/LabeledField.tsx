import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { fontSizes } from '../theme/fontSizes';

/** Rótulo acima do campo (padrão Aurora). */
export function LabeledField({
  label,
  required,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography component="span" sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.primary' }}>
          {label}
          {required && (
            <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>
              *
            </Box>
          )}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

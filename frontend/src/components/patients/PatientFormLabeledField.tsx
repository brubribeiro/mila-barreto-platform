import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';

export function LabeledField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      <Typography
        component="span"
        sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.primary' }}
      >
        {label}
        {required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
      </Typography>
      {children}
    </Box>
  );
}

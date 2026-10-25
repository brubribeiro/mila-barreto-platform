import type { ReactNode } from 'react';
import { Box, Switch, Typography, alpha } from '@mui/material';
import { fontSizes } from '../../theme/fontSizes';

interface ProcedureToggleCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Opção liga/desliga em cartão (ícone, título, explicação e switch). */
export function ProcedureToggleCard({ icon, title, subtitle, checked, onChange }: ProcedureToggleCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.25,
        borderRadius: '13px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800 }}>{title}</Typography>
        <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>{subtitle}</Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Box>
  );
}

import { Box, ButtonBase } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';

export function TabPill({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.9,
        height: 40,
        px: 2.25,
        borderRadius: '12px',
        fontFamily: 'inherit',
        fontSize: fontSizes.sm,
        fontWeight: 700,
        border: active ? 'none' : 1,
        borderColor: 'divider',
        bgcolor: active ? color : 'background.paper',
        color: active ? '#fff' : 'text.secondary',
        boxShadow: active ? `0 6px 16px -7px ${color}` : 'none',
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': { bgcolor: active ? color : 'grey.50' },
      }}
    >
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: active ? 'rgba(255,255,255,.85)' : color }}
      />
      {label}
    </ButtonBase>
  );
}

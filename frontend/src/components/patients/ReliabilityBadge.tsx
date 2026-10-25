import { Box, alpha } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

import { fontSizes } from '../../theme/fontSizes';
import { scoreTone } from './patientChart';

/** Medidas de cada lugar onde o score aparece: ficha completa, gaveta e lista. */
const VARIANTS = {
  page: { px: 1.1, py: 0.4, fontSize: fontSizes.sm, bgAlpha: 0.14, iconSize: 15 },
  drawer: { px: 1, py: 0.35, fontSize: fontSizes.xs, bgAlpha: 0.14, iconSize: 13 },
  list: { px: 1.1, py: 0.5, fontSize: fontSizes.xs, bgAlpha: 0.12, iconSize: 14 },
} as const;

export function ReliabilityBadge({ value, variant }: { value: number; variant: keyof typeof VARIANTS }) {
  const tone = scoreTone(value);
  const v = VARIANTS[variant];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: v.px,
        py: v.py,
        borderRadius: '9px',
        fontSize: v.fontSize,
        fontWeight: 800,
        color: tone.main,
        bgcolor: alpha(tone.main, v.bgAlpha),
      }}
    >
      <StarRoundedIcon sx={{ fontSize: v.iconSize }} />
      {value}
    </Box>
  );
}

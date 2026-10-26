import { Box, alpha } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import type { FeedbackStatus, FeedbackType } from '../../types';

export const FEEDBACK_STATUSES: FeedbackStatus[] = ['OPEN', 'TRIAGED', 'CLOSED'];

export const FEEDBACK_STATUS_META: Record<FeedbackStatus, { label: string; color: string }> = {
  OPEN: { label: 'Aberto', color: '#D49A3A' },
  TRIAGED: { label: 'Em triagem', color: '#5BA8DE' },
  CLOSED: { label: 'Fechado', color: '#15998B' },
};

export const FEEDBACK_TYPE_META: Record<FeedbackType, { label: string; color: string }> = {
  BUG: { label: 'Bug', color: '#C25A4C' },
  SUGGESTION: { label: 'Sugestão', color: '#9B7BD4' },
};

export function ColorPill({ label, color }: { label: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: fontSizes.xs,
        fontWeight: 700,
        px: 1,
        py: 0.4,
        borderRadius: '8px',
        whiteSpace: 'nowrap',
        color,
        bgcolor: alpha(color, 0.12),
      }}
    >
      {label}
    </Box>
  );
}

export const FeedbackStatusPill = ({ status }: { status: FeedbackStatus }) => (
  <ColorPill {...FEEDBACK_STATUS_META[status]} />
);

export const FeedbackTypePill = ({ type }: { type: FeedbackType }) => <ColorPill {...FEEDBACK_TYPE_META[type]} />;

import type { ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';
import { DASHBOARD_ITEM_HEIGHT } from './DashboardDetailItem';

interface DashboardEmptyStateProps {
  message: string;
  action?: ReactNode;
}

export function DashboardEmptyState({ message, action }: DashboardEmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: DASHBOARD_ITEM_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        px: 2,
        textAlign: 'center',
        bgcolor: 'action.hover',
        borderStyle: 'dashed',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {action}
    </Paper>
  );
}

import { Paper, Typography } from '@mui/material';
import { DASHBOARD_ITEM_HEIGHT } from './DashboardDetailItem';

interface DashboardEmptyStateProps {
  message: string;
}

export function DashboardEmptyState({ message }: DashboardEmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: DASHBOARD_ITEM_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        textAlign: 'center',
        bgcolor: 'action.hover',
        borderStyle: 'dashed',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Paper>
  );
}

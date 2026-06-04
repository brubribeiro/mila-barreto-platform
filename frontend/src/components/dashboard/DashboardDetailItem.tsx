import { ReactNode } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { ChipProps } from '@mui/material';

/** Altura fixa dos itens internos dos cards da dashboard */
export const DASHBOARD_ITEM_HEIGHT = 88;

export type DashboardItemChip = {
  label: string;
  color?: ChipProps['color'];
  variant?: ChipProps['variant'];
  sx?: ChipProps['sx'];
};

interface DashboardDetailItemProps {
  accentColor: string;
  title: ReactNode;
  chip?: DashboardItemChip;
  subtitle?: ReactNode;
  primaryRight?: ReactNode;
  secondaryRight?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
}

export function DashboardDetailItem({
  accentColor,
  title,
  chip,
  subtitle,
  primaryRight,
  secondaryRight,
  trailing,
  onClick,
  role,
  tabIndex,
  onKeyDown,
  'aria-label': ariaLabel,
}: DashboardDetailItemProps) {
  const clickable = !!onClick;

  return (
    <Paper
      variant="outlined"
      role={clickable ? (role ?? 'button') : undefined}
      tabIndex={clickable ? (tabIndex ?? 0) : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      sx={{
        px: 2,
        py: 1.5,
        height: DASHBOARD_ITEM_HEIGHT,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: accentColor,
        transition: 'box-shadow 120ms ease',
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': { boxShadow: 1 },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ width: '100%', minWidth: 0 }}
      >
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 26 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              title={typeof title === 'string' ? title : undefined}
              sx={{ flex: 1, minWidth: 0 }}
            >
              {title}
            </Typography>
            {chip && (
              <Chip
                size="small"
                label={chip.label}
                color={chip.color}
                variant={chip.variant}
                sx={{ flexShrink: 0, height: 22, maxWidth: '46%', ...chip.sx }}
              />
            )}
          </Stack>
          {subtitle != null && subtitle !== '' && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={typeof subtitle === 'string' ? subtitle : undefined}
            >
              {subtitle}
            </Typography>
          )}
        </Stack>

        {(primaryRight != null || secondaryRight != null) && (
          <Stack
            alignItems="flex-end"
            justifyContent="center"
            spacing={0.25}
            sx={{ flexShrink: 0, minWidth: 76, maxWidth: 120 }}
          >
            {primaryRight != null && (
              <Typography variant="subtitle2" fontWeight={700} noWrap component="div">
                {primaryRight}
              </Typography>
            )}
            {secondaryRight != null && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ textTransform: 'capitalize' }}
              >
                {secondaryRight}
              </Typography>
            )}
          </Stack>
        )}

        {trailing && (
          <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', ml: -0.5 }}>
            {trailing}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

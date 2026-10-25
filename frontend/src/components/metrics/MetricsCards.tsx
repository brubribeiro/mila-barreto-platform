import type { ReactNode } from 'react';
import { Box, Card, CardContent, Skeleton, Stack, Typography, useTheme } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import { CHART_HEIGHT, DELTA_TONES, type DeltaTone } from './metricsConfig';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { label: string; tone: DeltaTone } | null;
  hint?: string;
  loading?: boolean;
}

export function KpiCard({ label, value, delta, hint, loading }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={110} sx={{ fontSize: fontSizes['6xl'] }} />
        ) : (
          <Typography
            sx={{ fontSize: fontSizes['6xl'], fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.1, mb: 1.25 }}
          >
            {value}
          </Typography>
        )}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 22 }}>
          {!loading && delta && (
            <Box
              component="span"
              sx={{
                fontSize: fontSizes.xs,
                fontWeight: 700,
                color: DELTA_TONES[delta.tone].color,
                bgcolor: DELTA_TONES[delta.tone].bg,
                px: 1,
                py: 0.25,
                borderRadius: '7px',
                lineHeight: 1.4,
              }}
            >
              {delta.label}
            </Box>
          )}
          {!loading && hint && (
            <Typography component="span" sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500 }}>
              {hint}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
}

/** Indicadores secundários de cada aba, numa única faixa em card. */
export function StatStrip({ items }: { items: StatItem[] }) {
  const theme = useTheme();
  const line = `1px solid ${theme.palette.divider}`;
  return (
    <Card>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${items.length}, minmax(0, 1fr))` },
        }}
      >
        {items.map((item, i) => (
          <Box
            key={item.label}
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              borderLeft: { xs: i % 2 === 1 ? line : 'none', md: i > 0 ? line : 'none' },
              borderTop: { xs: i > 1 ? line : 'none', md: 'none' },
            }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: 'text.secondary' }} noWrap>
              {item.label}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, letterSpacing: '-0.5px', mt: 0.5 }} noWrap>
              {item.value}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }} noWrap>
              {item.hint ?? ' '}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

interface LegendItem {
  label: string;
  color: string;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.75} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Stack key={item.label} direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: item.color }} />
          <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 600, color: 'text.secondary' }}>
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.75 } } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>{title}</Typography>
            {subtitle && (
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
            )}
          </Box>
          {action}
        </Stack>
        <Box sx={{ mt: 2.25 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ message = 'Sem dados no período.', height = CHART_HEIGHT }: { message?: string; height?: number }) {
  return (
    <Box
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        borderRadius: '12px',
        border: '1px dashed',
        borderColor: 'divider',
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>{message}</Typography>
    </Box>
  );
}

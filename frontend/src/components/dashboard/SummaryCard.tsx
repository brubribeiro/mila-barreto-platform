import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { fontSizes } from '../../theme/fontSizes';

export interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  color?: string;
  to?: string;
  loading?: boolean;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
}

const DELTA_TONES = {
  up: { color: '#11A893', bg: 'rgba(17,168,147,.13)' },
  down: { color: '#D65A5A', bg: 'rgba(214,90,90,.13)' },
  neutral: { color: '#6E7B78', bg: 'rgba(110,123,120,.12)' },
} as const;

/** Card de indicador do topo do Dashboard; com `to`, vira link. */
export function SummaryCard({
  label,
  value,
  hint,
  icon,
  color = 'primary.main',
  to,
  loading,
  delta,
  deltaTone = 'neutral',
}: SummaryCardProps) {
  const theme = useTheme();
  const [group, shade] = color.split('.') as [string, string | undefined];
  const paletteGroup = (theme.palette as unknown as Record<string, Record<string, string>>)[group];
  const resolvedColor = (shade && paletteGroup?.[shade]) || theme.palette.primary.main;

  const card = (
    <Card
      sx={{
        height: '100%',
        ...(to && {
          cursor: 'pointer',
          transition: 'box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease',
          '&:hover': {
            boxShadow: theme.shadows[2],
            borderColor: alpha(resolvedColor, 0.4),
            transform: 'translateY(-2px)',
          },
        }),
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          '&:last-child': { pb: { xs: 2, sm: 2.5 } },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1.25, sm: 2 },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              fontWeight: 600,
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(resolvedColor, 0.12),
              color: resolvedColor,
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        </Stack>
        {loading ? (
          <Skeleton variant="text" width={90} sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' } }} />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.85rem' },
              fontWeight: 800,
              letterSpacing: '-1px',
              lineHeight: 1.05,
              color: 'text.primary',
            }}
          >
            {value}
          </Typography>
        )}
        {!loading && (delta || hint) && (
          <Stack direction="row" alignItems="center" spacing={1}>
            {delta && (
              <Box
                component="span"
                sx={{
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  color: DELTA_TONES[deltaTone].color,
                  bgcolor: DELTA_TONES[deltaTone].bg,
                  px: 1,
                  py: 0.25,
                  borderRadius: '7px',
                  lineHeight: 1.4,
                }}
              >
                {delta}
              </Box>
            )}
            {hint && (
              <Typography
                component="span"
                sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500 }}
              >
                {hint}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  if (!to) return card;

  return (
    <Box
      component={RouterLink}
      to={to}
      aria-label={`${label}: ${value}`}
      sx={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      {card}
    </Box>
  );
}

import { Box, Card, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import { fontSizes } from '../../theme/fontSizes';
import type { WorkingHours } from '../../types';
import { CARD_HEADER_SX, CARD_ROW_SX, EMPTY_HOURS, ROW_ACTION_SX, type Professional } from './availabilityConfig';
import { CardListSkeleton, CardTitle } from './AvailabilityCardParts';
import { initialsOf, summarizeDays, summarizeHours } from './availabilityUtils';

/** Disponibilidade da equipe (ou só a própria): dias e faixa de horário de cada profissional. */
export function TeamAvailabilityCard({
  title,
  loading,
  professionals,
  hoursQueries,
  colorOf,
  onEdit,
}: {
  title: string;
  loading: boolean;
  professionals: Professional[];
  hoursQueries: { data?: WorkingHours[]; isLoading: boolean }[];
  colorOf: (id: string) => string;
  onEdit: (professional: Professional) => void;
}) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box sx={CARD_HEADER_SX}>
        <CardTitle title={title} />
      </Box>

      {loading ? (
        <CardListSkeleton />
      ) : (
        professionals.map((p, i) => (
          <ProfessionalHoursRow
            key={p.id}
            professional={p}
            hours={hoursQueries[i]?.data ?? EMPTY_HOURS}
            loading={!!hoursQueries[i]?.isLoading}
            color={colorOf(p.id)}
            onEdit={onEdit}
          />
        ))
      )}
    </Card>
  );
}

function ProfessionalHoursRow({
  professional: p,
  hours,
  loading,
  color,
  onEdit,
}: {
  professional: Professional;
  hours: WorkingHours[];
  loading: boolean;
  color: string;
  onEdit: (professional: Professional) => void;
}) {
  const summary = summarizeHours(hours);
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.75}
      sx={{ ...CARD_ROW_SX, py: 1.875 }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '12px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontSizes.sm,
          fontWeight: 700,
          color: '#fff',
          bgcolor: color,
        }}
      >
        {initialsOf(p.name)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 700, lineHeight: 'inherit' }}>
          {p.name}
        </Typography>
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
          {loading ? <Skeleton width={90} /> : summarizeDays(hours)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
        {loading ? (
          <Skeleton width={90} />
        ) : summary ? (
          <>
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, lineHeight: 'inherit' }}>
              {summary.range}
            </Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
              {summary.note}
            </Typography>
          </>
        ) : (
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.disabled' }}>
            —
          </Typography>
        )}
      </Box>
      <Tooltip title="Editar horários">
        <IconButton onClick={() => onEdit(p)} sx={ROW_ACTION_SX} aria-label={`Editar horários de ${p.name}`}>
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

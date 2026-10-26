import { alpha, Box, Button, Card, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';

import { fontSizes } from '../../theme/fontSizes';
import { CARD_HEADER_SX, CARD_ROW_SX, ROW_ACTION_SX, SMALL_CHIP_SX } from './availabilityConfig';
import { CardListSkeleton, CardTitle } from './AvailabilityCardParts';
import { formatBlockPeriod, isFullDayRange } from './availabilityUtils';
import type { UnavailabilityBlock } from './useAvailabilityData';

/** Bloqueios de agenda (folgas, férias, compromissos) de todos os profissionais visíveis. */
export function UnavailabilityBlocksCard({
  loading,
  blocks,
  colorOf,
  onAdd,
  onRemove,
}: {
  loading: boolean;
  blocks: UnavailabilityBlock[];
  colorOf: (id: string) => string;
  onAdd: () => void;
  onRemove: (block: UnavailabilityBlock) => void;
}) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={CARD_HEADER_SX}>
        <CardTitle title="Bloqueios de agenda" />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{
            flexShrink: 0,
            minHeight: 36,
            height: 36,
            px: 1.75,
            borderRadius: '10px',
            fontSize: fontSizes.sm,
            fontWeight: 700,
          }}
        >
          Bloquear
        </Button>
      </Stack>

      {loading ? (
        <CardListSkeleton />
      ) : blocks.length === 0 ? (
        <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
          <EventBusyOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 700, fontSize: fontSizes.md }}>Nenhum bloqueio cadastrado</Typography>
          <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.5 }}>
            Registre folgas, férias e compromissos para fechar a agenda.
          </Typography>
        </Box>
      ) : (
        blocks.map((b) => (
          <BlockRow key={b.id} block={b} color={colorOf(b.professional.id)} onRemove={onRemove} />
        ))
      )}
    </Card>
  );
}

function BlockRow({
  block: b,
  color,
  onRemove,
}: {
  block: UnavailabilityBlock;
  color: string;
  onRemove: (block: UnavailabilityBlock) => void;
}) {
  const fullDay = isFullDayRange(b.startAt, b.endAt);
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.625}
      sx={{ ...CARD_ROW_SX, py: 1.75 }}
    >
      <Box
        sx={{
          width: 3,
          height: 38,
          borderRadius: '3px',
          flexShrink: 0,
          bgcolor: color,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 700, lineHeight: 'inherit' }}>
          {b.reason || 'Sem motivo informado'}
        </Typography>
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
          {b.professional.name} · {formatBlockPeriod(b.startAt, b.endAt)}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={fullDay ? 'Dia inteiro' : 'Por horário'}
        sx={
          fullDay
            ? { ...SMALL_CHIP_SX, bgcolor: alpha('#5BA8DE', 0.16), color: '#2F6FA0' }
            : { ...SMALL_CHIP_SX, bgcolor: 'grey.100', color: 'text.secondary' }
        }
      />
      <Tooltip title="Remover">
        <IconButton
          onClick={() => onRemove(b)}
          sx={{ ...ROW_ACTION_SX, '&:hover': { color: 'error.main', borderColor: 'error.light' } }}
          aria-label="Remover bloqueio"
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

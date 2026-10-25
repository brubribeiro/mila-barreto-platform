import type { MouseEvent } from 'react';
import { Box, Card, Stack, Typography, alpha, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import type { Equipment } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { clickableProps } from '../../utils/a11y';
import { brl } from '../../utils/money';
import { RowActionButton } from '../RowActionButton';
import {
  dateTone,
  daysUntil,
  dueLabel,
  maintenanceCyclePct,
  nextMaintenanceOf,
  toneColor,
  type Tone,
} from './equipmentMaintenance';

const ICON_COLORS = ['#15998B', '#E0915B', '#5BA8DE', '#D46B8A', '#9B7BD4', '#4FB3A8'];

function colorFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return brl.format(Number(value));
}

function DetailItem({ label, value, tone = 'default' }: { label: string; value: string; tone?: Tone }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: toneColor(tone) }}>
        {value}
      </Typography>
    </Box>
  );
}

interface EquipmentCardProps {
  equipment: Equipment;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onMaintenance: (ev: MouseEvent) => void;
  onDelete: (ev: MouseEvent) => void;
}

/** Card do equipamento: status, ciclo de manutenção, datas, valores e ações. */
export function EquipmentCard({ equipment: e, canEdit, canDelete, onEdit, onMaintenance, onDelete }: EquipmentCardProps) {
  const theme = useTheme();
  const color = colorFor(e.name);
  const nextDays = daysUntil(nextMaintenanceOf(e));
  const scheduledDays = daysUntil(e.scheduledMaintenanceAt);
  const autoDays = daysUntil(e.nextMaintenanceAt);
  const pct = maintenanceCyclePct(e);
  const cycleTone: Tone =
    nextDays != null && nextDays < 0
      ? 'error'
      : pct == null
        ? 'default'
        : pct >= 85
          ? 'error'
          : pct >= 70
            ? 'warning'
            : 'default';
  const barColor =
    cycleTone === 'default' ? theme.palette.primary.main : theme.palette[cycleTone].main;
  const status: { label: string; tone: Tone } = !e.active
    ? { label: 'Inativo', tone: 'default' }
    : nextDays != null && nextDays < 0
      ? { label: 'Manut. atrasada', tone: 'warning' }
      : { label: 'Operacional', tone: 'success' };
  const statusColor =
    status.tone === 'default' ? theme.palette.text.secondary : theme.palette[status.tone].dark;
  const statusBg =
    status.tone === 'default'
      ? theme.palette.grey[100]
      : alpha(theme.palette[status.tone].main, 0.14);
  return (
    <Card
      key={e.id}
      {...(canEdit && clickableProps(onEdit))}
      sx={{
        p: 2.5,
        borderRadius: '18px',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
        cursor: canEdit ? 'pointer' : 'default',
        transition: 'box-shadow .15s, border-color .15s',
        '&:hover': {
          boxShadow: '0 12px 30px -20px rgba(16,40,37,0.45)',
          borderColor: canEdit ? 'primary.main' : alpha(color, 0.5),
        },
      }}
    >
      {/* Cabeçalho */}
      <Stack direction="row" alignItems="flex-start" spacing={1.6}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '13px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
            color,
          }}
        >
          <MemoryOutlinedIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
          <Typography
            title={e.name}
            sx={{
              fontSize: fontSizes.lg,
              fontWeight: 800,
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {e.name}
          </Typography>
          <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
            {[e.brand, e.model].filter(Boolean).join(' · ') || '—'}
          </Typography>
        </Box>
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            px: 1.1,
            py: 0.35,
            borderRadius: 99,
            fontSize: fontSizes['2xs'],
            fontWeight: 700,
            whiteSpace: 'nowrap',
            bgcolor: statusBg,
            color: statusColor,
          }}
        >
          {status.label}
        </Box>
      </Stack>

      {/* Ciclo de manutenção */}
      <Box>
        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.9 }}>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
            Próxima manutenção
          </Typography>
          <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: nextDays == null ? 'text.disabled' : toneColor(cycleTone) }}>
            {dueLabel(nextDays)}
          </Typography>
        </Stack>
        <Box sx={{ height: 7, borderRadius: '7px', bgcolor: 'grey.100', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${pct ?? 0}%`, borderRadius: '7px', bgcolor: barColor }} />
        </Box>
      </Box>

      {/* Datas e valores */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1.25 }}>
        <DetailItem
          label="Manut. agendada"
          value={formatDateOnlyFromApi(e.scheduledMaintenanceAt) || '—'}
          tone={dateTone(scheduledDays, 'success')}
        />
        <DetailItem
          label="Próxima (auto)"
          value={formatDateOnlyFromApi(e.nextMaintenanceAt) || '—'}
          tone={dateTone(autoDays, 'default')}
        />
        <DetailItem label="Valor da máquina" value={formatCurrency(e.purchaseValue)} />
        <DetailItem label="Valor da manutenção" value={formatCurrency(e.maintenanceValue)} />
      </Box>

      {/* Rodapé */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider' }}
      >
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
          {e.maintenanceNotifyDaysBefore
            ? `Aviso ${e.maintenanceNotifyDaysBefore}d antes`
            : 'Sem aviso'}
        </Typography>
        {(canEdit || canDelete) && (
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            {canEdit && (
              <>
                <RowActionButton title="Registrar manutenção agora" onClick={onMaintenance}>
                  <BuildIcon sx={{ fontSize: 15 }} />
                </RowActionButton>
                <RowActionButton
                  title="Editar"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onEdit();
                  }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </RowActionButton>
              </>
            )}
            {canDelete && (
              <RowActionButton title="Excluir" danger onClick={onDelete}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </RowActionButton>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

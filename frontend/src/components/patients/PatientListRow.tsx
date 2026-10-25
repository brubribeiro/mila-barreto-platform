import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import dayjs from 'dayjs';

import type { Patient } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { maskPhone } from '../../utils/masks';
import { moneyFormatter } from '../../utils/money';
import { patientInitials } from '../../utils/patientPhoto';
import { ReliabilityBadge } from './ReliabilityBadge';
import { GRID_COLS } from './patientListLayout';

const AVATAR_COLORS = ['#15998B', '#5BA8DE', '#D46B8A', '#E0915B', '#9B7BD4', '#4FB3A8'];
const brl = moneyFormatter({ maximumFractionDigits: 0 });

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatCpf(doc?: string) {
  const raw = doc?.replace(/\D/g, '');
  if (!raw || raw.length !== 11) return '—';
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
}

export function PatientListRow({
  patient: p,
  canEdit,
  canDelete,
  onOpen,
  onWhatsApp,
  onAnamnesis,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onWhatsApp: () => void;
  onAnamnesis: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const score = p.reliabilityPercent ?? 100;
  const color = avatarColor(p.name);
  return (
    <Box
        onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: GRID_COLS },
        gap: 1.5,
        px: { xs: 2, md: 2.75 },
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'grey.50' },
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      {/* Paciente */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
        <Avatar
          src={p.photoUrl ?? undefined}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '11px',
            fontSize: fontSizes.sm,
            fontWeight: 700,
            color: '#fff',
            bgcolor: color,
            flexShrink: 0,
          }}
          variant="rounded"
        >
          {patientInitials(p.name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }} noWrap title={p.name}>
            {p.name}
          </Typography>
          <Typography
            sx={{ display: { md: 'none' }, fontSize: fontSizes.xs, color: 'text.secondary' }}
            noWrap
          >
            {p.phone ? maskPhone(p.phone) : formatCpf(p.document)}
          </Typography>
        </Box>
      </Stack>

      {/* CPF */}
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: fontSizes.sm,
          color: 'text.secondary',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCpf(p.document)}
      </Typography>

      {/* Telefone */}
      <Typography
        sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
      >
        {p.phone ? maskPhone(p.phone) : '—'}
      </Typography>

      {/* Última visita */}
      <Typography
        sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
      >
        {p.lastVisit ? dayjs(p.lastVisit).format('DD MMM YYYY') : '—'}
      </Typography>

      {/* Total gasto */}
      <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.md, fontWeight: 800 }}>
        {p.totalSpent ? brl.format(p.totalSpent) : '—'}
      </Typography>

      {/* Agendamentos */}
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: fontSizes.md,
          fontWeight: 700,
          color: 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {p.appointmentsCount ?? 0}
      </Typography>

      {/* Score */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
        <ReliabilityBadge value={score} variant="list" />
      </Box>

      {/* Ações */}
      <Stack
        direction="row"
        spacing={0.25}
        justifyContent="flex-end"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title={p.phone ? 'WhatsApp' : 'Sem telefone'}>
          <span>
            <IconButton
              size="small"
              disabled={!p.phone}
              onClick={onWhatsApp}
              sx={{ color: '#25D366' }}
            >
              <WhatsAppIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {canEdit && (
          <Tooltip title="Anamnese">
            <IconButton size="small" onClick={onAnamnesis}>
              <AssignmentOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canEdit && (
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={onEdit}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Excluir">
            <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

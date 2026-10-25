import { Box, Chip, Stack, Typography, alpha, type Theme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { RecurringExpense } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { brl } from '../../utils/money';
import { RowActionButton } from '../RowActionButton';
import { dueInLabel, formatDue, nextDueDate } from './recurringDue';

export const RECURRING_TABLE_COLUMNS = '1.8fr .8fr .9fr 1fr 1fr .9fr .8fr 84px';

const ACTION_SIZE_SX = { width: 32, height: 32 } as const;

const DELETE_BUTTON_SX = {
  ...ACTION_SIZE_SX,
  borderColor: (t: Theme) => alpha(t.palette.error.main, 0.35),
  bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.06),
  color: 'error.main',
  '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.12) },
} as const;

export type Tone = 'primary' | 'warning' | 'success' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  primary: 'primary.dark',
  warning: 'warning.dark',
  success: 'success.dark',
  neutral: 'text.secondary',
};

export function toneBg(tone: Tone, opacity = 0.14) {
  return (t: Theme) => (tone === 'neutral' ? t.palette.grey[100] : alpha(t.palette[tone].main, opacity));
}

export function SoftChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontSize: fontSizes['2xs'],
        fontWeight: 700,
        borderRadius: '8px',
        bgcolor: toneBg(tone),
        color: TONE_TEXT[tone],
      }}
    />
  );
}

interface RecurringExpenseRowProps {
  expense: RecurringExpense;
  onEdit: () => void;
  onDelete: () => void;
}

/** Linha da tabela de despesas (no celular: nome, chips, valor e ações). */
export function RecurringExpenseRow({ expense: d, onEdit, onDelete }: RecurringExpenseRowProps) {
  const isFixed = d.expenseType === 'FIXED';
  const generated = d._count?.generatedEntries ?? 0;
  const due = d.active ? nextDueDate(d.dueDay) : null;
  const typeChip = isFixed ? (
    <SoftChip label="Fixa" tone="primary" />
  ) : (
    <SoftChip label="Variável" tone="warning" />
  );
  const statusChip = d.active ? (
    <SoftChip label="Ativa" tone="success" />
  ) : (
    <SoftChip label="Inativa" tone="neutral" />
  );
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: RECURRING_TABLE_COLUMNS },
        gap: { xs: 1, md: 1.5 },
        alignItems: 'center',
        px: { xs: 2, sm: '22px' },
        py: '14px',
        borderBottom: 1,
        borderColor: 'grey.100',
        '& > :not(:last-child)': { opacity: d.active ? 1 : 0.6 },
        '&:hover': { bgcolor: 'grey.50' },
        '& > .md-only': { display: { xs: 'none', md: 'block' } },
      }}
    >
      <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Typography noWrap title={d.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
          {d.name}
        </Typography>
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
          {d.description || '—'}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'flex', md: 'none' }, mt: 0.75 }}>
          {typeChip}
          {statusChip}
        </Stack>
      </Box>
      <Box className="md-only">{typeChip}</Box>
      <Typography className="md-only" noWrap sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
        {d.category || '—'}
      </Typography>
      <Box className="md-only" sx={{ minWidth: 0, lineHeight: 1.25 }}>
        <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>{brl.format(Number(d.amount))}</Typography>
        <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>
          {generated} {generated === 1 ? 'lançamento gerado' : 'lançamentos gerados'}
        </Typography>
      </Box>
      <Box className="md-only">
        <SoftChip label={`Mensal · dia ${d.dueDay}`} tone="neutral" />
      </Box>
      <Box className="md-only" sx={{ lineHeight: 1.25 }}>
        <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
          {due ? formatDue(due) : '—'}
        </Typography>
        {due && (
          <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>{dueInLabel(due)}</Typography>
        )}
      </Box>
      <Box className="md-only">{statusChip}</Box>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'right', mr: 0.5 }}>
          <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>{brl.format(Number(d.amount))}</Typography>
          <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>
            {due ? `vence ${formatDue(due)}` : `dia ${d.dueDay}`}
          </Typography>
        </Box>
        <RowActionButton title="Editar" ariaLabel={`Editar ${d.name}`} onClick={onEdit} sx={ACTION_SIZE_SX}>
          <EditIcon sx={{ fontSize: 16 }} />
        </RowActionButton>
        <RowActionButton title="Excluir" ariaLabel={`Excluir ${d.name}`} onClick={onDelete} sx={DELETE_BUTTON_SX}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </RowActionButton>
      </Stack>
    </Box>
  );
}

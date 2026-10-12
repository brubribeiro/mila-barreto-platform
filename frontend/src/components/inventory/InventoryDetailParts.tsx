import { useMemo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TuneIcon from '@mui/icons-material/Tune';
import dayjs from 'dayjs';

import type { InventoryItemWithMovements, InventoryMovement } from '../../api/inventory';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import {
  EXPIRING_DAYS,
  STOCK_STATUS_COLOR,
  STOCK_STATUS_LABEL,
  daysToExpiry,
  stockStatus,
} from './inventoryStatus';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const movementTypeLabel: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
};

const SECTION_LABEL_SX = {
  fontSize: fontSizes.xs,
  fontWeight: 800,
  color: 'text.disabled',
  letterSpacing: '1px',
  textTransform: 'uppercase',
} as const;

const SOFT_BOX_SX = {
  bgcolor: 'grey.50',
  border: 1,
  borderColor: 'divider',
  borderRadius: '14px',
} as const;

interface Batch {
  expiresAt: string;
  totalIn: number;
  count: number;
}

function buildBatches(movements: InventoryMovement[]): Batch[] {
  const map = new Map<string, { totalIn: number; count: number }>();

  for (const m of movements) {
    if (m.type === 'IN' && m.expiresAt) {
      const key = m.expiresAt.substring(0, 10);
      const existing = map.get(key) ?? { totalIn: 0, count: 0 };
      existing.totalIn += Number(m.quantity);
      existing.count += 1;
      map.set(key, existing);
    }
  }

  return Array.from(map.entries())
    .map(([expiresAt, data]) => ({ expiresAt, ...data }))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/**
 * Saldo após cada movimentação, calculado do estoque atual para trás (lista vem da mais recente).
 * Ajuste grava a quantidade final, então o saldo antes dele não é conhecido: as anteriores ficam sem saldo.
 */
function buildBalances(currentQty: number, movements: InventoryMovement[]): (number | null)[] {
  let after: number | null = currentQty;
  return movements.map((m) => {
    const q = Number(m.quantity);
    const balance = m.type === 'ADJUSTMENT' ? q : after;
    if (m.type === 'ADJUSTMENT' || balance == null) after = null;
    else after = m.type === 'IN' ? balance - q : balance + q;
    return balance;
  });
}

function formatQty(value: number) {
  return Number(value.toFixed(3)).toLocaleString('pt-BR');
}

function expiryColor(date: string) {
  const days = daysToExpiry(date) ?? Infinity;
  if (days < 0) return STOCK_STATUS_COLOR.EXPIRED;
  if (days <= EXPIRING_DAYS) return STOCK_STATUS_COLOR.EXPIRING;
  return undefined;
}

export function StatusPill({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
  const color = STOCK_STATUS_COLOR[status];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        height: 24,
        px: 1.1,
        borderRadius: '999px',
        fontSize: fontSizes['2xs'],
        fontWeight: 700,
        bgcolor: alpha(color, 0.13),
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
      {STOCK_STATUS_LABEL[status]}
    </Box>
  );
}

/** Cabeçalho com gradiente (drawer e página de detalhe). */
export function InventoryDetailHero({
  item,
  action,
}: {
  item: InventoryItemWithMovements;
  action?: ReactNode;
}) {
  const unit = item.unit ?? 'un';
  return (
    <Box
      sx={{
        position: 'relative',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
        background: (t) =>
          `linear-gradient(150deg, ${alpha(t.palette.primary.main, 0.1)}, ${t.palette.background.paper})`,
      }}
    >
      {action && (
        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 18, right: 18 }}>
          {action}
        </Stack>
      )}
      <Typography
        sx={{
          fontSize: fontSizes['2xs'],
          fontWeight: 700,
          color: 'primary.main',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        {item.sku ? `SKU ${item.sku}` : 'Produto'}
      </Typography>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pr: action ? 12 : 0 }}>
        <Typography
          component="h2"
          sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.2 }}
        >
          {item.name}
        </Typography>
        <StatusPill item={item} />
      </Stack>
      {item.description && (
        <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.5 }}>
          {item.description}
        </Typography>
      )}
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        sx={{ columnGap: 2.25, rowGap: 0.5, mt: 1.25, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
      >
        <span>
          Validade{' '}
          <Box component="span" sx={{ color: item.expiresAt ? expiryColor(item.expiresAt) : undefined }}>
            {item.expiresAt ? formatDateOnlyFromApi(item.expiresAt) : '—'}
          </Box>
        </span>
        <span>
          {item.costPrice != null ? brl.format(Number(item.costPrice)) : '—'}/{unit}
        </span>
        <span>
          Alerta de validade{' '}
          {item.expiryNotifyDaysBefore != null ? `${item.expiryNotifyDaysBefore} dias antes` : 'desativado'}
        </span>
      </Stack>
    </Box>
  );
}

/** Corpo do detalhe: totais, nível de estoque, lotes e movimentações. */
export function InventoryDetailBody({
  item,
  onNewMovement,
}: {
  item: InventoryItemWithMovements;
  onNewMovement?: () => void;
}) {
  const unit = item.unit ?? 'un';
  const qty = Number(item.quantity);
  const min = Number(item.minQuantity);
  const statusColor = STOCK_STATUS_COLOR[stockStatus(item)];

  const { entradas, saidas } = useMemo(
    () =>
      item.movements.reduce(
        (acc, m) => {
          if (m.type === 'IN') acc.entradas += Number(m.quantity);
          if (m.type === 'OUT') acc.saidas += Number(m.quantity);
          return acc;
        },
        { entradas: 0, saidas: 0 },
      ),
    [item.movements],
  );
  const batches = useMemo(() => buildBatches(item.movements), [item.movements]);
  const balances = useMemo(() => buildBalances(qty, item.movements), [qty, item.movements]);

  // Barra cheia = o dobro do mínimo (ou o estoque atual, quando não há mínimo).
  const target = Math.max(min * 2, qty, 1);
  const pct = Math.min(100, Math.round((qty / target) * 100));
  const minPct = min > 0 ? Math.min(100, (min / target) * 100) : null;

  const stats = [
    { label: 'em estoque', value: `${formatQty(qty)} ${unit}`, color: 'text.primary' },
    { label: 'entradas', value: entradas > 0 ? `+${formatQty(entradas)}` : '0', color: entradas > 0 ? 'success.main' : 'text.disabled' },
    { label: 'saídas', value: saidas > 0 ? `−${formatQty(saidas)}` : '0', color: saidas > 0 ? 'error.main' : 'text.disabled' },
  ];

  return (
    <Stack spacing={2.75}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ ...SOFT_BOX_SX, p: 1.75, textAlign: 'center' }}>
            <Typography sx={{ fontSize: fontSizes['4xl'], fontWeight: 800, color: s.color, lineHeight: 1.2 }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600, mt: 0.25 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ ...SOFT_BOX_SX, px: 2.1, py: 1.9 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.1 }}>
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>Nível de estoque</Typography>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
            mín. {formatQty(min)} {unit}
          </Typography>
        </Stack>
        <Box sx={{ position: 'relative', height: 8, borderRadius: '5px', bgcolor: 'grey.100', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: '5px', bgcolor: statusColor }} />
          {minPct != null && (
            <Box
              title="Estoque mínimo"
              sx={{ position: 'absolute', top: 0, bottom: 0, left: `${minPct}%`, width: 2, bgcolor: 'text.disabled' }}
            />
          )}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ ...SECTION_LABEL_SX, mb: 1.25 }}>Lotes cadastrados</Typography>
        {batches.length === 0 ? (
          <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>
            Nenhuma entrada com data de validade registrada.
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {batches.map((b) => {
              const days = daysToExpiry(b.expiresAt) ?? 0;
              const label = days < 0 ? 'Vencido' : days <= EXPIRING_DAYS ? 'Vence em breve' : 'Válido';
              const color = days < 0 ? STOCK_STATUS_COLOR.EXPIRED : days <= EXPIRING_DAYS ? STOCK_STATUS_COLOR.EXPIRING : STOCK_STATUS_COLOR.OK;
              return (
                <Box
                  key={b.expiresAt}
                  sx={{ ...SOFT_BOX_SX, borderRadius: '11px', px: 1.5, py: 1, minWidth: 150, borderLeft: `3px solid ${color}` }}
                >
                  <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                    val. {formatDateOnlyFromApi(b.expiresAt)}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 600 }}>
                    {formatQty(b.totalIn)} {unit} · {b.count} {b.count === 1 ? 'entrada' : 'entradas'} ·{' '}
                    <Box component="span" sx={{ color }}>{label}</Box>
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
          <Typography sx={SECTION_LABEL_SX}>Movimentações</Typography>
          {onNewMovement && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
              onClick={onNewMovement}
              sx={{ height: 32, borderRadius: '9px', fontSize: fontSizes.xs, color: 'text.primary', borderColor: 'divider' }}
            >
              Nova
            </Button>
          )}
        </Stack>
        {item.movements.length === 0 ? (
          <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 1 }}>
            Nenhuma movimentação registrada.
          </Typography>
        ) : (
          <Stack>
            {item.movements.map((m, i) => {
              const color =
                m.type === 'IN' ? 'success.main' : m.type === 'OUT' ? 'error.main' : '#5BA8DE';
              const Icon = m.type === 'IN' ? ArrowDownwardIcon : m.type === 'OUT' ? ArrowUpwardIcon : TuneIcon;
              const sign = m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : '= ';
              const balance = balances[i];
              return (
                <Stack
                  key={m.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.6}
                  sx={{ py: 1.5, borderBottom: 1, borderColor: 'grey.100' }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '10px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: color,
                      color: '#fff',
                    }}
                  >
                    <Icon sx={{ fontSize: 17 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }} noWrap title={m.reason}>
                      {m.reason || movementTypeLabel[m.type] || m.type}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary' }}>
                      {dayjs(m.createdAt).format('DD/MM/YYYY HH:mm')} · {movementTypeLabel[m.type] ?? m.type}
                      {m.expiresAt && (
                        <>
                          {' · lote val. '}
                          <Box component="span" sx={{ color: expiryColor(m.expiresAt) }}>
                            {formatDateOnlyFromApi(m.expiresAt)}
                          </Box>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800, color }}>
                      {sign}
                      {formatQty(Number(m.quantity))} {unit}
                    </Typography>
                    {balance != null && (
                      <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }}>
                        saldo {formatQty(balance)}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

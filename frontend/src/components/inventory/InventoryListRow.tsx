import { Box, Typography } from '@mui/material';
import { StatusPill } from './InventoryDetailParts';
import { EXPIRING_DAYS, STOCK_STATUS_COLOR, daysToExpiry, isLowStock } from './inventoryStatus';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { brl } from '../../utils/money';

export const INVENTORY_GRID_COLUMNS = '2.4fr 1fr 1.2fr 1fr 1fr 1fr';

function formatQty(value: number | string) {
  return Number(Number(value).toFixed(3)).toLocaleString('pt-BR');
}

interface InventoryListRowProps {
  item: InventoryItem;
  onOpen: () => void;
}

/** Linha da tabela de produtos & insumos; abre o detalhe ao clicar ou com Enter/Espaço. */
export function InventoryListRow({ item, onOpen }: InventoryListRowProps) {
  const low = isLowStock(item);
  const days = daysToExpiry(item.expiresAt);
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        display: 'grid',
        gridTemplateColumns: INVENTORY_GRID_COLUMNS,
        gap: 1.5,
        px: 2.75,
        py: 1.75,
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'grey.100',
        cursor: 'pointer',
        transition: 'background .12s',
        '&:hover, &:focus-visible': { bgcolor: 'grey.50', outline: 'none' },
      }}
    >
      <Typography noWrap title={item.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
        {item.name}
      </Typography>
      <Typography noWrap sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
        {item.sku || '—'}
      </Typography>
      <Box sx={{ lineHeight: 1.3, minWidth: 0 }}>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }}>
          {item.expiresAt ? formatDateOnlyFromApi(item.expiresAt) : '—'}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSizes['2xs'],
            color:
              days != null && days < 0
                ? STOCK_STATUS_COLOR.EXPIRED
                : days != null && days <= EXPIRING_DAYS
                  ? STOCK_STATUS_COLOR.EXPIRING
                  : 'text.disabled',
          }}
        >
          {days == null
            ? 'sem validade'
            : days < 0
              ? `vencido há ${-days} ${days === -1 ? 'dia' : 'dias'}`
              : days === 0
                ? 'vence hoje'
                : `em ${days} ${days === 1 ? 'dia' : 'dias'}`}
        </Typography>
      </Box>
      <Typography
        sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: low ? 'error.main' : 'text.primary' }}
      >
        {formatQty(item.quantity)} / {formatQty(item.minQuantity)}
        {item.unit && (
          <Box component="span" sx={{ color: 'text.disabled', fontWeight: 600 }}>
            {' '}
            {item.unit}
          </Box>
        )}
      </Typography>
      <Box>
        <StatusPill item={item} />
      </Box>
      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, textAlign: 'right' }}>
        {item.costPrice != null ? brl.format(Number(item.costPrice)) : '—'}
      </Typography>
    </Box>
  );
}

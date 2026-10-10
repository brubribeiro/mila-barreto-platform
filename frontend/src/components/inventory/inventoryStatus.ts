import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';

export type StockStatus = 'OK' | 'LOW' | 'CRITICAL' | 'EXPIRING' | 'EXPIRED';

export const EXPIRING_DAYS = 30;

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  OK: 'OK',
  LOW: 'Baixo',
  CRITICAL: 'Crítico',
  EXPIRING: 'Vencendo',
  EXPIRED: 'Vencido',
};

/** Cores dos status (fundo = cor com alpha, texto = cor cheia). */
export const STOCK_STATUS_COLOR: Record<StockStatus, string> = {
  OK: '#15998B',
  LOW: '#C98A12',
  CRITICAL: '#C25A4C',
  EXPIRING: '#9B7BD4',
  EXPIRED: '#C25A4C',
};

export const isLowStock = (i: Pick<InventoryItem, 'quantity' | 'minQuantity'>) =>
  Number(i.quantity) <= Number(i.minQuantity);

/** Dias até a validade (negativo = vencido); null quando o item não tem validade. */
export function daysToExpiry(date?: string | null): number | null {
  if (!date) return null;
  const d = dayjsFromDateOnlyApi(date) ?? dayjs(date);
  return d.startOf('day').diff(dayjs().startOf('day'), 'day');
}

/**
 * Status exibido na lista: falta de estoque tem prioridade sobre validade.
 * Crítico = zerado ou até metade do mínimo; Baixo = até o mínimo (mesma regra do filtro).
 */
export function stockStatus(item: InventoryItem): StockStatus {
  const qty = Number(item.quantity);
  const min = Number(item.minQuantity);
  if (isLowStock(item)) return qty <= 0 || qty <= min / 2 ? 'CRITICAL' : 'LOW';
  const days = daysToExpiry(item.expiresAt);
  if (days != null && days < 0) return 'EXPIRED';
  if (days != null && days <= EXPIRING_DAYS) return 'EXPIRING';
  return 'OK';
}

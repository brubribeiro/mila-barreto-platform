import type { Promotion } from '../types';

export type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export type PromotionStatusFilter = 'ALL' | 'ACTIVE' | 'FUTURE' | 'INACTIVE' | 'EXPIRED';

export type StockFilter = 'ALL' | 'LOW';

export type MaintenanceFilter = 'ALL' | 'DUE';

export function normalizeSearch(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesSearch(haystack: string, query: string): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return haystack.toLowerCase().includes(normalized);
}

export function matchFields(query: string, ...values: (string | number | null | undefined)[]): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return values.some((v) => v != null && v !== '' && matchesSearch(String(v), normalized));
}

export function matchesActiveFilter(active: boolean, filter: ActiveFilter): boolean {
  if (filter === 'ALL') return true;
  return filter === 'ACTIVE' ? active : !active;
}

export function isPromotionActive(promo: Promotion): boolean {
  if (!promo.active) return false;
  const now = new Date();
  return new Date(promo.startAt) <= now && new Date(promo.endAt) >= now;
}

export function getPromotionStatusKey(promo: Promotion): Exclude<PromotionStatusFilter, 'ALL'> {
  if (isPromotionActive(promo)) return 'ACTIVE';
  if (promo.active && new Date(promo.startAt) > new Date()) return 'FUTURE';
  if (!promo.active) return 'INACTIVE';
  return 'EXPIRED';
}

export function matchesPromotionStatusFilter(
  promo: Promotion,
  filter: PromotionStatusFilter,
): boolean {
  if (filter === 'ALL') return true;
  return getPromotionStatusKey(promo) === filter;
}

export const FILTER_FIELD_SX = {
  flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' },
  minWidth: { xs: '100%', sm: 140 },
} as const;

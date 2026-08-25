import type { InventoryCategory } from '../types';

export const INVENTORY_CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: 'INSUMO', label: 'Insumos' },
  { value: 'PRODUTO', label: 'Produtos' },
];

/** Rótulo de exibição para a categoria de um item de estoque. */
export function inventoryCategoryLabel(category?: InventoryCategory | null): string {
  if (!category) return '—';
  return INVENTORY_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? '—';
}

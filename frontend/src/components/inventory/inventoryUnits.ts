import { FALLBACK_INVENTORY_UNITS, getCatalogItems } from '../../features/platformCatalog';
import type { PlatformCatalogOption } from '../../types';

/** @deprecated Prefer usePlatformCatalog('inventory_unit') */
export const INVENTORY_UNIT_OPTIONS = FALLBACK_INVENTORY_UNITS.map((u) => ({
  value: u.value,
  label: u.label,
}));

export function inventoryUnitOptions(): PlatformCatalogOption[] {
  return getCatalogItems('inventory_unit');
}

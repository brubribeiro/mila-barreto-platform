import type { InventoryItem } from '../../types';

export type LineMode = 'existing' | 'new';

export interface LineForm {
  mode: LineMode;
  item: InventoryItem | null;
  newName: string;
  newSku: string;
  newUnit: string;
  newMinQuantity: number;
  quantity: number;
  /** Valor unitário do produto (sem frete) */
  unitPrice: number | '';
  expiresAt: string;
}

export interface BulkPurchaseFormValues {
  reason: string;
  freight: number | '';
  lines: LineForm[];
}

export const emptyLine = (mode: LineMode = 'existing'): LineForm => ({
  mode,
  item: null,
  newName: '',
  newSku: '',
  newUnit: 'un',
  newMinQuantity: 0,
  quantity: 1,
  unitPrice: '',
  expiresAt: '',
});

export const defaultValues: BulkPurchaseFormValues = {
  reason: '',
  freight: '',
  lines: [emptyLine()],
};

export function parseNum(v: unknown): number {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Mesmo rateio do backend: proporcional ao valor de cada produto, sobra de centavos no último. */
export function allocateFreight(lines: { productTotal: number }[], freight: number): number[] {
  const sum = lines.reduce((s, l) => s + l.productTotal, 0);
  if (sum <= 0 || freight <= 0) return lines.map(() => 0);
  const shares = lines.map((l) => Math.round(freight * (l.productTotal / sum) * 100) / 100);
  const allocated = shares.reduce((s, v) => s + v, 0);
  const diff = Math.round((freight - allocated) * 100) / 100;
  if (diff !== 0 && shares.length > 0) {
    shares[shares.length - 1] = Math.round((shares[shares.length - 1] + diff) * 100) / 100;
  }
  return shares;
}

export function lineProductTotal(line: Pick<LineForm, 'quantity' | 'unitPrice'>) {
  return Math.round(parseNum(line.quantity) * parseNum(line.unitPrice) * 100) / 100;
}

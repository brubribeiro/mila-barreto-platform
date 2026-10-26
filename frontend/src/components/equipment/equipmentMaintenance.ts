import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';
import type { Equipment } from '../../types';

/** Dias até a data (negativo = atrasada); null se não houver data. */
export function daysUntil(value?: string | null) {
  const d = dayjsFromDateOnlyApi(value);
  return d ? d.diff(dayjs(), 'day') : null;
}

export function nextMaintenanceOf(e: Equipment) {
  return e.scheduledMaintenanceAt ?? e.nextMaintenanceAt;
}

/** Percentual decorrido do ciclo entre a última manutenção (ou aquisição) e a próxima. */
export function maintenanceCyclePct(e: Equipment) {
  const next = dayjsFromDateOnlyApi(nextMaintenanceOf(e));
  if (!next) return null;
  const today = dayjs();
  if (next.diff(today, 'day') < 0) return 100;
  const start =
    dayjsFromDateOnlyApi(e.lastMaintenanceAt) ??
    (e.maintenanceIntervalMonths ? next.subtract(e.maintenanceIntervalMonths, 'month') : null) ??
    dayjsFromDateOnlyApi(e.purchaseDate);
  if (!start) return null;
  const total = next.diff(start, 'day');
  if (total <= 0) return 100;
  return Math.round(Math.min(100, Math.max(0, (today.diff(start, 'day') / total) * 100)));
}

export function dueLabel(days: number | null) {
  if (days == null) return 'Sem previsão';
  if (days < 0) return `Atrasada há ${-days} ${-days === 1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Hoje';
  return `Em ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export type Tone = 'success' | 'warning' | 'error' | 'default';

export function dateTone(days: number | null, okTone: Tone): Tone {
  if (days == null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'warning';
  return okTone;
}

export function toneColor(tone: Tone) {
  return tone === 'default' ? 'text.primary' : `${tone}.main`;
}

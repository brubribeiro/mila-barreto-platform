import dayjs from 'dayjs';

import type { MetricsResult } from '../../api/metrics';
import type { FinancialEntry } from '../../types';
import { moneyFormatter } from '../../utils/money';
import { FINANCE_CATEGORY_COLORS, FINANCE_TOP_CATEGORIES, type DeltaTone } from './metricsConfig';

export const brlCompact = moneyFormatter({
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const decimal1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "1 paciente" / "3 pacientes". */
export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function pctChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function formatSigned(value: number, suffix: string) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal1.format(Math.abs(value))}${suffix}`;
}

/** Tom do delta: `higherIsBetter=false` inverte (ex.: no-show caindo é bom). */
export function deltaTone(value: number, higherIsBetter = true): DeltaTone {
  if (Math.abs(value) < 0.05) return 'neutral';
  return value > 0 === higherIsBetter ? 'up' : 'down';
}

export function returnRatePct(patients: MetricsResult['patients']) {
  return patients.uniqueInPeriod > 0 ? (patients.returningInPeriod / patients.uniqueInPeriod) * 100 : 0;
}

/** Indicadores dos KPIs do topo (comparados com o período anterior). */
export function summarizeKpis(m: MetricsResult) {
  const revenue = m.appointments.byProcedure.reduce((s, p) => s + p.revenue, 0);
  const ticket = m.appointments.completed > 0 ? revenue / m.appointments.completed : 0;
  return { revenue, ticket, returnRate: returnRatePct(m.patients), noShowRate: m.appointments.noShowRate };
}

export function buildDailyFlow(entries: FinancialEntry[]) {
  const byDay: Record<string, { key: string; receita: number; despesa: number }> = {};
  entries.forEach((e) => {
    const refDate = e.paidAt ?? e.dueDate;
    const key = refDate ? dayjs(refDate).format('YYYY-MM-DD') : '';
    if (!key) return;
    if (!byDay[key]) byDay[key] = { key, receita: 0, despesa: 0 };
    if (e.type === 'INCOME') byDay[key].receita += Number(e.amount);
    else byDay[key].despesa += Number(e.amount);
  });
  return Object.values(byDay).sort((a, b) => a.key.localeCompare(b.key));
}

/** Totais de receita/despesa e receita por categoria (top 4 + "Outras"). */
export function summarizeFinance(entries: FinancialEntry[]) {
  let inc = 0;
  let exp = 0;
  const byCategory = new Map<string, number>();
  entries.forEach((e) => {
    const amount = Number(e.amount);
    if (e.type === 'INCOME') {
      inc += amount;
      const cat = e.category?.trim() || 'Sem categoria';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
    } else {
      exp += amount;
    }
  });
  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, FINANCE_TOP_CATEGORIES);
  const others = sorted.slice(FINANCE_TOP_CATEGORIES).reduce((s, [, v]) => s + v, 0);
  if (others > 0) top.push(['Outras', others]);
  return {
    income: inc,
    expense: exp,
    categoryRows: top.map(([name, value], i) => ({
      name,
      value,
      valueLabel: brlCompact.format(value),
      color: FINANCE_CATEGORY_COLORS[i],
    })),
  };
}

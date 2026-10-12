import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import type { Theme } from '@mui/material';

import type { AuroraIconName } from '../AuroraIcon';
import type { Goal, GoalFormat, GoalMetric, GoalPeriodType } from '../../types';

export const GOAL_COLORS = ['#15998B', '#5BA8DE', '#C98A12', '#9B7BD4', '#D46B8A', '#E0915B'];

export interface GoalMetricOption {
  value: GoalMetric;
  label: string;
  /** Nome sugerido ao escolher o indicador. */
  defaultName: string;
  icon: AuroraIconName;
  /** Formato fixo (indicadores automáticos). */
  format?: GoalFormat;
  /** Como o valor atual é obtido. */
  hint: string;
}

export const GOAL_METRICS: GoalMetricOption[] = [
  {
    value: 'REVENUE',
    label: 'Faturamento',
    defaultName: 'Faturamento mensal',
    icon: 'financeiro',
    format: 'CURRENCY',
    hint: 'Soma das receitas lançadas no financeiro no período.',
  },
  {
    value: 'NEW_PATIENTS',
    label: 'Novos pacientes',
    defaultName: 'Novos pacientes',
    icon: 'clientes',
    format: 'NUMBER',
    hint: 'Pacientes cadastrados no período.',
  },
  {
    value: 'PROCEDURES',
    label: 'Procedimentos realizados',
    defaultName: 'Procedimentos realizados',
    icon: 'procedimentos',
    format: 'NUMBER',
    hint: 'Agendamentos de procedimento concluídos no período.',
  },
  {
    value: 'AVERAGE_TICKET',
    label: 'Ticket médio',
    defaultName: 'Ticket médio',
    icon: 'pagamentos',
    format: 'CURRENCY',
    hint: 'Faturamento do período dividido pelos atendimentos concluídos.',
  },
  {
    value: 'OCCUPANCY',
    label: 'Ocupação da agenda',
    defaultName: 'Ocupação da agenda',
    icon: 'agenda',
    format: 'PERCENT',
    hint: 'Tempo agendado sobre o expediente da equipe, descontadas as indisponibilidades.',
  },
  {
    value: 'RETURN_RATE',
    label: 'Taxa de retorno',
    defaultName: 'Taxa de retorno',
    icon: 'promocoes',
    format: 'PERCENT',
    hint: 'Pacientes atendidos no período que já tinham um atendimento concluído antes.',
  },
  {
    value: 'MANUAL',
    label: 'Outro (informar manualmente)',
    defaultName: '',
    icon: 'metas',
    hint: 'O valor atual é atualizado por você na edição da meta.',
  },
];

export const GOAL_FORMAT_OPTIONS: { value: GoalFormat; label: string }[] = [
  { value: 'CURRENCY', label: 'Moeda (R$)' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'PERCENT', label: 'Porcentagem (%)' },
];

export const GOAL_PERIOD_OPTIONS: { value: GoalPeriodType; label: string }[] = [
  { value: 'MONTH', label: 'Mensal' },
  { value: 'QUARTER', label: 'Trimestral' },
  { value: 'YEAR', label: 'Anual' },
];

export function metricOption(metric: GoalMetric) {
  return GOAL_METRICS.find((m) => m.value === metric) ?? GOAL_METRICS[GOAL_METRICS.length - 1];
}

export function formatGoalValue(value: number, format: GoalFormat) {
  const fractionDigits = Number.isInteger(value) ? 0 : format === 'PERCENT' ? 1 : 2;
  if (format === 'CURRENCY') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }
  const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: fractionDigits });
  return format === 'PERCENT' ? `${formatted}%` : formatted;
}

/** Normaliza uma data para o início do mês/trimestre/ano (YYYY-MM-DD). */
export function normalizePeriodStart(date: string, type: GoalPeriodType) {
  const d = dayjs(date);
  if (type === 'YEAR') return d.startOf('year').format('YYYY-MM-DD');
  if (type === 'QUARTER') {
    return d.month(Math.floor(d.month() / 3) * 3).startOf('month').format('YYYY-MM-DD');
  }
  return d.startOf('month').format('YYYY-MM-DD');
}

export function formatGoalPeriod(periodStart: string, type: GoalPeriodType) {
  const d = dayjs(periodStart).locale('pt-br');
  if (type === 'YEAR') return `Ano ${d.year()}`;
  if (type === 'QUARTER') return `${Math.floor(d.month() / 3) + 1}º trimestre ${d.year()}`;
  const month = d.format('MMMM');
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.year()}`;
}

export type GoalStatusKey = 'DONE' | 'ALMOST' | 'ON_TRACK' | 'ATTENTION';

export interface GoalStatus {
  key: GoalStatusKey;
  label: string;
  /** Cor do percentual e da etiqueta. */
  tone: (theme: Theme, goalColor: string) => string;
}

/** Faixas do design: ≥100% atingida, ≥90% quase lá, ≥60% no caminho, abaixo disso atenção. */
export function goalStatus(progress: number): GoalStatus {
  if (progress >= 100) return { key: 'DONE', label: 'Atingida', tone: (t) => t.palette.success.main };
  if (progress >= 90) return { key: 'ALMOST', label: 'Quase lá', tone: (t) => t.palette.success.main };
  if (progress >= 60) return { key: 'ON_TRACK', label: 'No caminho', tone: (_t, color) => color };
  return { key: 'ATTENTION', label: 'Atenção', tone: (t) => t.palette.error.main };
}

export function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, progress));
}

export function goalSummary(goals: Goal[]) {
  const reached = goals.filter((g) => g.progress >= 100).length;
  const average = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + clampProgress(g.progress), 0) / goals.length)
    : 0;
  return { total: goals.length, reached, average };
}

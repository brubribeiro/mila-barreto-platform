import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';

/** Janela do card "Vencem em N dias". */
export const UPCOMING_DAYS = 7;

/** Próximo vencimento a partir de hoje; dias 29–31 caem no último dia em meses mais curtos. */
export function nextDueDate(dueDay: number): Dayjs {
  const today = dayjs().startOf('day');
  const inMonth = (month: Dayjs) => month.date(Math.min(dueDay, month.daysInMonth()));
  const thisMonth = inMonth(today.startOf('month'));
  return thisMonth.isBefore(today) ? inMonth(today.add(1, 'month').startOf('month')) : thisMonth;
}

export function formatDue(date: Dayjs) {
  return date.locale('pt-br').format('DD MMM');
}

export function dueInLabel(date: Dayjs) {
  const days = date.diff(dayjs().startOf('day'), 'day');
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

import dayjs from 'dayjs';

/** Data mínima (YYYY-MM-DD) para agendar após o último atendimento concluído. */
export function computeEarliestRecurrenceDate(
  lastCompletedAt: string | Date,
  recurrenceDays: number,
): string {
  return dayjs(lastCompletedAt).add(recurrenceDays, 'day').startOf('day').format('YYYY-MM-DD');
}

export function isDateBeforeRecurrenceEarliest(date: string, earliestDate: string): boolean {
  return dayjs(date).startOf('day').isBefore(dayjs(earliestDate).startOf('day'));
}

export function formatRecurrenceEarliestLabel(earliestDate: string): string {
  return dayjs(earliestDate).format('DD/MM/YYYY');
}

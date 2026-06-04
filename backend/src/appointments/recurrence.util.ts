/** Data mínima para novo agendamento (início do dia após o intervalo). */
export function computeEarliestRecurrenceDate(
  lastCompletedStartAt: Date,
  recurrenceDays: number,
): Date {
  const earliest = new Date(lastCompletedStartAt);
  earliest.setDate(earliest.getDate() + recurrenceDays);
  earliest.setHours(0, 0, 0, 0);
  return earliest;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isBeforeRecurrenceEarliest(startAt: Date, earliest: Date): boolean {
  return startAt.getTime() < earliest.getTime();
}

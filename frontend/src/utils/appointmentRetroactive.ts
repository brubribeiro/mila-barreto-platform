import dayjs from 'dayjs';

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

const brazilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRAZIL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function brazilDateKey(date: Date = new Date()): string {
  return brazilDateFormatter.format(date);
}

/** Horário já passou ou cai em dia anterior ao de hoje no Brasil. */
export function isRetroactiveAppointmentSlot(input: {
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  startAt?: string;
  endAt?: string;
}): boolean {
  const todayBrazil = brazilDateKey(new Date());

  if (input.date && input.startTime) {
    if (input.date < todayBrazil) return true;
    const start = dayjs(`${input.date}T${input.startTime}`);
    if (start.isValid()) {
      const end = start.add(input.durationMinutes ?? 60, 'minute');
      if (start.isBefore(dayjs()) || end.isBefore(dayjs())) return true;
    }
  }

  if (input.startAt) {
    const start = dayjs(input.startAt);
    if (brazilDateKey(start.toDate()) < todayBrazil) return true;
    if (start.isBefore(dayjs())) return true;
  }
  if (input.endAt && dayjs(input.endAt).isBefore(dayjs())) return true;

  return false;
}

/**
 * Utilitários de fuso do Brasil (America/Sao_Paulo).
 *
 * O servidor normalmente roda em UTC, então Date.getDay()/getHours()/getMinutes()
 * retornam o horário em UTC, e não o horário de parede visto pelo usuário no Brasil.
 * As funções abaixo extraem o dia da semana e o horário HH:mm sempre no fuso local
 * do Brasil, independente do TZ do processo.
 */

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BRAZIL_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const brazilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRAZIL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface BrazilWallClock {
  dayOfWeek: number;
  hhmm: string;
}

export function getBrazilWallClock(date: Date): BrazilWallClock {
  const parts = partsFormatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    lookup[part.type] = part.value;
  }

  const hour = lookup.hour === '24' ? '00' : lookup.hour;
  return {
    dayOfWeek: WEEKDAY_INDEX[lookup.weekday] ?? 0,
    hhmm: `${hour}:${lookup.minute}`,
  };
}

/** YYYY-MM-DD no fuso America/Sao_Paulo (para comparar dias de calendário). */
export function toBrazilDateKey(date: Date): string {
  return brazilDateFormatter.format(date);
}

/** Horário já passou ou cai em dia anterior ao de hoje no Brasil. */
export function isRetroactiveAppointmentInstant(startAt: Date, endAt?: Date): boolean {
  const now = Date.now();
  if (!Number.isNaN(startAt.getTime()) && startAt.getTime() < now) return true;
  if (endAt && !Number.isNaN(endAt.getTime()) && endAt.getTime() < now) return true;

  const todayBrazil = toBrazilDateKey(new Date());
  if (toBrazilDateKey(startAt) < todayBrazil) return true;
  if (endAt && toBrazilDateKey(endAt) < todayBrazil) return true;

  return false;
}

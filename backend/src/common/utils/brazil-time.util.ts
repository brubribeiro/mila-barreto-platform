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

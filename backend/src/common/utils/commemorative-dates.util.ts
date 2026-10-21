/**
 * Datas comemorativas usadas para sugerir promoções.
 * Mantém em sincronia com DATES em frontend/src/components/dashboard/UpcomingDatesCard.tsx.
 */

type DayOf = (year: number) => string;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fixed(month: number, day: number): DayOf {
  return (year) => `${year}-${pad(month)}-${pad(day)}`;
}

/** n-ésimo domingo do mês (Dia das Mães, Dia dos Pais). */
function nthSunday(month: number, n: number): DayOf {
  return (year) => {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((7 - first) % 7) + (n - 1) * 7;
    return `${year}-${pad(month)}-${pad(day)}`;
  };
}

/** Última sexta-feira de novembro. */
const blackFriday: DayOf = (year) => {
  const dow = new Date(Date.UTC(year, 10, 30)).getUTCDay();
  return `${year}-11-${pad(30 - ((dow + 2) % 7))}`;
};

const COMMEMORATIVE_DATES: { name: string; dayOf: DayOf }[] = [
  { name: 'Dia Internacional da Mulher', dayOf: fixed(3, 8) },
  { name: 'Início do Outono', dayOf: fixed(3, 20) },
  { name: 'Dia das Mães', dayOf: nthSunday(5, 2) },
  { name: 'Dia dos Namorados', dayOf: fixed(6, 12) },
  { name: 'Início do Inverno', dayOf: fixed(6, 21) },
  { name: 'Dia dos Pais', dayOf: nthSunday(8, 2) },
  { name: 'Dia Internacional da Beleza', dayOf: fixed(9, 9) },
  { name: 'Dia do Cliente', dayOf: fixed(9, 15) },
  { name: 'Início da Primavera', dayOf: fixed(9, 22) },
  { name: 'Black Friday', dayOf: blackFriday },
  { name: 'Início do Verão', dayOf: fixed(12, 21) },
  { name: 'Natal', dayOf: fixed(12, 25) },
];

/** Próxima ocorrência (YYYY-MM-DD) de cada data a partir de `today` (inclusive), ordenadas. */
export function upcomingCommemorativeDates(today: string) {
  const year = Number(today.slice(0, 4));
  return COMMEMORATIVE_DATES.map(({ name, dayOf }) => {
    const thisYear = dayOf(year);
    return { name, day: thisYear >= today ? thisYear : dayOf(year + 1) };
  }).sort((a, b) => a.day.localeCompare(b.day));
}

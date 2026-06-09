/**
 * Feriados nacionais (fixos + móveis com base na Páscoa) e feriados municipais de Caieiras-SP,
 * segundo calendários publicados na prefeitura (ex.: lei municipal nº 3.472/2003 e nº 4.676/2013).
 *
 * Observação: “pontos facultativos” e calendários anuais de compensação não estão inclusos —
 * apenas feriados nacionais usuais e os municipais fixos da cidade (+ móveis nacionais comuns).
 */
import type { EventInput } from '@fullcalendar/core';

/** Domingo de Páscoa (calendário gregoriano — algoritmo de Meeus/Jones/Butcher). */
export function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Carnaval (terça-feira): 47 dias antes do Domingo de Páscoa. */
function carnivalTuesday(year: number): Date {
  return addDays(computeEasterSunday(year), -47);
}

/** Paixão / Sexta-feira Santa: 2 dias antes do Domingo de Páscoa. */
function goodFriday(year: number): Date {
  return addDays(computeEasterSunday(year), -2);
}

/**
 * Corpus Christi: no Brasil o feriado costuma coincidir com 60 dias após o Domingo de Páscoa
 * (uso civil frequente nos municípios).
 */
function corpusChristi(year: number): Date {
  return addDays(computeEasterSunday(year), 60);
}

type HolidayScope = 'nacional' | 'municipal';

interface HolidaySeed {
  date: Date;
  title: string;
  scope: HolidayScope;
  idSuffix: string;
}

function seedsForBrazilAndCaieiras(year: number): HolidaySeed[] {
  const seeds: HolidaySeed[] = [];

  const pushFixed = (monthIndex0: number, day: number, title: string, scope: HolidayScope, idSuffix: string) => {
    seeds.push({
      date: new Date(year, monthIndex0, day),
      title,
      scope,
      idSuffix,
    });
  };

  pushFixed(0, 1, 'Confraternização Universal', 'nacional', 'ano-novo');
  pushFixed(3, 21, 'Tiradentes', 'nacional', 'tiradentes');
  pushFixed(4, 1, 'Dia do Trabalho', 'nacional', 'trabalho');
  pushFixed(8, 7, 'Independência do Brasil', 'nacional', 'independencia');
  pushFixed(9, 12, 'Nossa Senhora Aparecida', 'nacional', 'aparecida');
  pushFixed(10, 2, 'Finados', 'nacional', 'finados');
  pushFixed(10, 15, 'Proclamação da República', 'nacional', 'republica');
  pushFixed(10, 20, 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional', 'consciencia-negra');
  pushFixed(11, 25, 'Natal', 'nacional', 'natal');

  seeds.push({
    date: carnivalTuesday(year),
    title: 'Carnaval',
    scope: 'nacional',
    idSuffix: 'carnaval',
  });
  seeds.push({
    date: goodFriday(year),
    title: 'Paixão de Cristo / Sexta-feira Santa',
    scope: 'nacional',
    idSuffix: 'sexta-santa',
  });

  // Corpus Christi aparece tanto no calendário nacional de referência quanto no municipal de Caieiras
  seeds.push({
    date: corpusChristi(year),
    title: 'Corpus Christi',
    scope: 'nacional',
    idSuffix: 'corpus-christi',
  });

  pushFixed(5, 13, 'Padroeiro do Município (Caieiras)', 'municipal', 'padroeiro-caieiras');
  pushFixed(11, 14, 'Emancipação política — Aniversário de Caieiras', 'municipal', 'aniversario-caieiras');

  return seeds;
}

function atLocalStartOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function buildBrazilCaieirasHolidayEvents(fromIso: string, toIso: string): EventInput[] {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(+from) || Number.isNaN(+to)) return [];

  const startY = from.getFullYear();
  const endY = to.getFullYear();

  /** `to` exclusivo (como FullCalendar `datesSet`). */
  const tFrom = atLocalStartOfDay(from);
  const tEndExclusive = atLocalStartOfDay(to);

  const inRange = (d: Date) => {
    const t = atLocalStartOfDay(d);
    return t >= tFrom && t < tEndExclusive;
  };

  const out: EventInput[] = [];

  for (let y = startY - 1; y <= endY + 1; y++) {
    for (const h of seedsForBrazilAndCaieiras(y)) {
      if (!inRange(h.date)) continue;
      const ymd = toLocalYmd(h.date);
      out.push({
        id: `holiday-${ymd}-${h.idSuffix}`,
        title: h.title,
        start: ymd,
        allDay: true,
        display: 'block',
        editable: false,
        durationEditable: false,
        overlap: true,
        backgroundColor: h.scope === 'municipal' ? '#DCEFE0' : '#E8E6F8',
        borderColor: h.scope === 'municipal' ? '#7CB342' : '#5E35B1',
        textColor: h.scope === 'municipal' ? '#33691E' : '#4527A0',
        classNames: [`fc-holiday-${h.scope}`],
        extendedProps: {
          holiday: true as const,
          holidayScope: h.scope,
        },
      });
    }
  }

  return out;
}

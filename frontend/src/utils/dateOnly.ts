/**
 * Datas de calendário vindas da API em ISO (ex.: 1997-07-25T00:00:00.000Z) não devem
 * ser formatadas em fuso local — meia-noite UTC vira dia anterior no Brasil.
 * Formata sempre pela parte YYYY-MM-DD.
 */
import dayjs from 'dayjs';

export function formatDateOnlyFromApi(isoOrYmd?: string | null): string {
  if (!isoOrYmd) return '';
  const day = isoOrYmd.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

/** Parse estável para aniversários (dia civil, sem deslocar por UTC). */
export function dayjsFromDateOnlyApi(isoOrYmd?: string | null): dayjs.Dayjs | null {
  if (!isoOrYmd) return null;
  const ymd = isoOrYmd.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = dayjs(new Date(y, mo, d));
  return dt.isValid() ? dt.startOf('day') : null;
}

/** Payload: envia só YYYY-MM-DD (evita meia-noite UTC que desloca o dia ao listar). */
export function birthDatePayloadFromInput(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  return ymd;
}

/** Valor para input type="date" a partir de ISO da API. */
export function dateInputValueFromApi(isoOrYmd?: string | null): string {
  if (!isoOrYmd) return '';
  const day = isoOrYmd.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
}

/**
 * Envia data de calendário para a API (meio-dia UTC — mesmo padrão do backend).
 */
export function dateOnlyToApiIso(ymdOrIso: string): string {
  const dayPart = ymdOrIso.trim().split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayPart);
  if (!m) return ymdOrIso;
  return `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`;
}

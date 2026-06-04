/**
 * Datas de calendário (sem horário) — meio-dia UTC evita exibir o dia anterior no Brasil.
 */
export function parseDateOnlyToUtcNoon(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = String(value).trim();
  const dayPart = s.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayPart);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`);
}

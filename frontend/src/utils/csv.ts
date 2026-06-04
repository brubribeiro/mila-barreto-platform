/**
 * Helpers para exportar CSV no navegador.
 * Gera o arquivo e dispara o download via <a download>.
 */
/** Retorna false se não houver linhas para exportar. */
export function downloadCsv(filename: string, rows: Record<string, any>[], headers?: string[]) {
  if (rows.length === 0) {
    return false;
  }
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    // RFC4180: aspas duplicadas, envolve em "" se contém vírgula, quebra de linha ou aspas
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n');
  // BOM UTF-8 para Excel reconhecer acentos
  const csv = '﻿' + head + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

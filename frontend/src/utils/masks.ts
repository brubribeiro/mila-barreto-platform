/** Mantém apenas dígitos. */
export const onlyDigits = (s: string): string => s.replace(/\D/g, '');

/** Formata "12345678900" → "123.456.789-00" (parcial OK durante digitação) */
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata "11999990000" → "(11) 99999-0000" (parcial OK durante digitação) */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** "01310100" → "01310-100" */
export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Valida CPF segundo o algoritmo padrão (dois dígitos verificadores). */
export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const calc = (sliceEnd: number, weightStart: number) => {
    let sum = 0;
    for (let i = 0; i < sliceEnd; i++) {
      sum += parseInt(d[i], 10) * (weightStart - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return calc(9, 10) === parseInt(d[9], 10) && calc(10, 11) === parseInt(d[10], 10);
}

/** Telefone completo (fixo com DDD = 10 dígitos, celular = 11). */
export function isValidPhone(value: string): boolean {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Número → "1.234,56" (sem "R$"; o símbolo fica no adornment do campo). */
export function formatMoneyInput(value: number | string | null | undefined): string {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Lê o texto digitado como centavos ("123456" → 1234.56), como nas maquininhas.
 * Sem dígitos → ''.
 */
export function parseMoneyInput(text: string): number | '' {
  const d = onlyDigits(text).replace(/^0+(?=\d)/, '').slice(0, 13);
  return d ? Number(d) / 100 : '';
}

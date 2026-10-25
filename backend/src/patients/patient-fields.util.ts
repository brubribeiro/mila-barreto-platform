import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { composePatientAddress } from './patient-address.util';

const ADDRESS_STRING_FIELDS = [
  'addressStreet',
  'addressNeighborhood',
  'addressCity',
  'addressState',
  'addressNumber',
  'addressComplement',
] as const;

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
const trimToNull = (raw: unknown) => String(raw).trim() || null;

/**
 * Se o campo veio no DTO: undefined é descartado, null/'' vira null e o resto passa por
 * `transform`. Retorna se o campo veio no DTO.
 */
function normalizeNullableField(
  dto: object,
  out: Record<string, unknown>,
  key: string,
  transform: (raw: unknown) => unknown,
): boolean {
  if (!hasOwn(dto, key)) return false;
  const raw = out[key];
  if (raw === undefined) {
    delete out[key];
  } else if (raw === null || raw === '') {
    out[key] = null;
  } else {
    out[key] = transform(raw);
  }
  return true;
}

/**
 * CEP (8 dígitos ou null), birthDate como Date em UTC ao meio-dia (YYYYMMDD vem só do cliente),
 * para o motor Prisma aceitar DateTime ISO completo em vez de "YYYY-MM-DD" puro.
 */
export function normalizePatientWritableFields(
  dto: CreatePatientDto | UpdatePatientDto,
): Record<string, unknown> {
  const out = { ...dto } as Record<string, unknown>;

  normalizeNullableField(dto, out, 'cep', normalizeCep);
  normalizeNullableField(dto, out, 'birthDate', (raw) => birthDateInputToUtcNoonDate(raw) ?? null);
  normalizeNullableField(dto, out, 'sex', (raw) => raw);

  // Origem diferente de "Outro" (ou vazia) limpa o texto livre
  if (
    normalizeNullableField(dto, out, 'referralSource', (raw) => raw) &&
    out.referralSource !== undefined &&
    out.referralSource !== 'OTHER'
  ) {
    out.referralSourceOther = null;
  }
  normalizeNullableField(dto, out, 'referralSourceOther', trimToNull);

  let touchedAddress = false;
  for (const key of ADDRESS_STRING_FIELDS) {
    if (normalizeNullableField(dto, out, key, trimToNull)) touchedAddress = true;
  }

  if (touchedAddress || hasOwn(dto, 'address')) {
    const composed = composePatientAddress({
      addressStreet: out.addressStreet as string | null | undefined,
      addressNeighborhood: out.addressNeighborhood as string | null | undefined,
      addressCity: out.addressCity as string | null | undefined,
      addressState: out.addressState as string | null | undefined,
      addressNumber: out.addressNumber as string | null | undefined,
      addressComplement: out.addressComplement as string | null | undefined,
      address: out.address as string | null | undefined,
    });
    out.address = composed ?? null;
  }

  return out;
}

/** null = sem CEP; string com 8 dígitos válido; outros formatos ficam sem persistir dígitos */
function normalizeCep(raw: unknown): string | null {
  const digits = String(raw).replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

/**
 * Converte entrada do formulário/API (somente dia civil) em um instante no meio-dia UTC —
 * alinha com seeds e reduz drift de dia em fusos brasileiros.
 */
function birthDateInputToUtcNoonDate(value: unknown): Date | undefined {
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

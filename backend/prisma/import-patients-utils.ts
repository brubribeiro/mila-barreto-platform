import { Prisma } from '@prisma/client';

export type LegacyPatientRow = Record<string, unknown> & {
  id?: string | number;
  Name?: string;
  Active?: string;
  Deleted?: string;
  MobilePhone?: string;
  Email?: string;
  BirthDate?: string;
  InsertDate?: string;
  Age?: number;
  DocumentId?: string;
  OtherDocumentId?: string;
  Notes?: string;
  Address?: string;
  AddressNumber?: string;
  AddressComplement?: string;
  Neighborhood?: string;
  City?: string;
  state?: string;
  Zip?: string;
  Sex?: string;
  NickName?: string;
  CivilStatus?: string;
  Education?: string;
  Profession?: string;
  HowDidMeet?: string;
  IndicationSource?: string;
  motherName?: string;
  fatherName?: string;
  MotherOtherDocument?: string;
  FatherOtherDocument?: string;
  ImportedId?: string;
};

const ANAMNESIS_SKIP = new Set([
  'id',
  'Name',
  'Active',
  'Deleted',
  'Type',
  'MobilePhone',
  'Email',
  'BirthDate',
  'InsertDate',
  'DocumentId',
  'OtherDocumentId',
  'Notes',
  'Address',
  'AddressNumber',
  'AddressComplement',
  'Neighborhood',
  'City',
  'state',
  'Zip',
]);

export function birthDateFromRow(row: LegacyPatientRow): Date | null {
  if (!row.BirthDate) return null;
  const birth = new Date(String(row.BirthDate));
  if (Number.isNaN(birth.getTime())) return null;

  const insert = row.InsertDate ? new Date(String(row.InsertDate)) : null;
  const age = typeof row.Age === 'number' ? row.Age : null;
  const dayPart = birth.toISOString().split('T')[0];

  if (insert && (age === 0 || age === 1)) {
    const diffDays = Math.abs(birth.getTime() - insert.getTime()) / 86_400_000;
    if (diffDays < 2) return null;
  }

  if (age === 0 && birth.getFullYear() >= 2024) return null;

  return new Date(`${dayPart}T12:00:00.000Z`);
}

export function parseEmail(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined;
  return value;
}

export function formatPhone(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return value;
}

function formatCpf(digits: string): string | undefined {
  if (digits.length !== 11) return undefined;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function parseDocument(row: LegacyPatientRow): string | undefined {
  for (const raw of [row.DocumentId, row.OtherDocumentId]) {
    const value = String(raw ?? '').replace(/\D/g, '');
    if (!value) continue;
    return formatCpf(value) ?? String(raw).trim();
  }
  return undefined;
}

export function parseCep(raw?: string): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

export function buildAddress(row: LegacyPatientRow): string | undefined {
  const parts: string[] = [];
  if (row.Address) {
    let line = String(row.Address);
    if (row.AddressNumber) line += `, ${row.AddressNumber}`;
    if (row.AddressComplement) line += ` — ${row.AddressComplement}`;
    parts.push(line);
  }
  if (row.Neighborhood || row.City || row.state) {
    const cityLine = [row.Neighborhood, row.City, row.state].filter(Boolean).join(', ');
    if (cityLine) parts.push(cityLine);
  }
  if (row.Zip) parts.push(`CEP ${row.Zip}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function sexLabel(sex?: string): string | undefined {
  if (sex === 'F') return 'Feminino';
  if (sex === 'M') return 'Masculino';
  return sex?.trim() || undefined;
}

function civilStatusLabel(value?: string): string | undefined {
  const map: Record<string, string> = {
    SINGLE: 'Solteiro(a)',
    MARRIED: 'Casado(a)',
    DIVORCED: 'Divorciado(a)',
    WIDOWED: 'Viúvo(a)',
  };
  return value ? map[value] ?? value : undefined;
}

export function buildAnamnesis(row: LegacyPatientRow): Prisma.InputJsonValue {
  const extra: Record<string, unknown> = {
    importacaoLegado: true,
    externalId: row.id != null ? String(row.id) : undefined,
  };

  if (row.Sex) extra.sexo = sexLabel(String(row.Sex));
  if (typeof row.Age === 'number' && row.Age > 0) extra.idadeDeclarada = row.Age;
  if (row.NickName) extra.apelido = row.NickName;
  if (row.CivilStatus) extra.estadoCivil = civilStatusLabel(String(row.CivilStatus));
  if (row.Education) extra.escolaridade = row.Education;
  if (row.Profession) extra.profissao = row.Profession;
  if (row.HowDidMeet) extra.comoConheceu = row.HowDidMeet;
  if (row.IndicationSource) extra.indicacao = row.IndicationSource;
  if (row.motherName) extra.mae = row.motherName;
  if (row.fatherName) extra.pai = row.fatherName;
  if (row.MotherOtherDocument) extra.rgMae = row.MotherOtherDocument;
  if (row.FatherOtherDocument) extra.rgPai = row.FatherOtherDocument;
  if (row.ImportedId) extra.importedIdLegado = row.ImportedId;
  if (row.InsertDate) extra.cadastroLegadoEm = row.InsertDate;

  const invalidEmail = row.Email?.trim();
  if (invalidEmail && !parseEmail(invalidEmail)) {
    extra.emailInformadoInvalido = invalidEmail;
  }

  for (const [key, value] of Object.entries(row)) {
    if (ANAMNESIS_SKIP.has(key)) continue;
    if (value === '' || value == null) continue;
    if (extra[key] !== undefined) continue;
    extra[key] = value;
  }

  return extra as Prisma.InputJsonValue;
}

function parseSex(raw?: string): 'M' | 'F' | undefined {
  const v = raw?.trim().toUpperCase();
  if (v === 'M' || v === 'F') return v;
  return undefined;
}

export function mapLegacyPatientRow(row: LegacyPatientRow) {
  const name = String(row.Name ?? '').trim();
  if (!name) throw new Error('Paciente sem nome');

  const addressStreet = row.Address ? String(row.Address).trim() : undefined;
  const addressNumber = row.AddressNumber ? String(row.AddressNumber).trim() : undefined;
  const addressComplement = row.AddressComplement
    ? String(row.AddressComplement).trim()
    : undefined;
  const addressNeighborhood = row.Neighborhood ? String(row.Neighborhood).trim() : undefined;
  const addressCity = row.City ? String(row.City).trim() : undefined;
  const addressState = row.state ? String(row.state).trim() : undefined;

  return {
    name,
    email: parseEmail(row.Email),
    phone: formatPhone(row.MobilePhone),
    birthDate: birthDateFromRow(row),
    sex: parseSex(row.Sex ? String(row.Sex) : undefined),
    document: parseDocument(row),
    cep: parseCep(row.Zip ? String(row.Zip) : undefined),
    addressStreet,
    addressNumber,
    addressComplement,
    addressNeighborhood,
    addressCity,
    addressState,
    address: buildAddress(row),
    notes: row.Notes?.trim() || undefined,
    anamnesis: buildAnamnesis(row),
    externalId: row.id != null ? String(row.id) : undefined,
  };
}

export function shouldSkipRow(row: LegacyPatientRow): boolean {
  if (row.Deleted && String(row.Deleted).trim()) return true;
  if (row.Active && String(row.Active).trim() && String(row.Active).trim() !== 'X') return true;
  if (row.Type && String(row.Type) !== 'PATIENT') return true;
  return false;
}

export type PatientReferralSource =
  | 'INSTAGRAM'
  | 'REFERRAL'
  | 'GOOGLE'
  | 'LOCATION'
  | 'OTHER';

export const PATIENT_REFERRAL_SOURCE_OPTIONS: {
  value: PatientReferralSource;
  label: string;
}[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Indicação' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'LOCATION', label: 'Localização' },
  { value: 'OTHER', label: 'Outros' },
];

export function patientReferralSourceLabel(
  source?: string | null,
  other?: string | null,
): string {
  if (!source) return '—';
  const opt = PATIENT_REFERRAL_SOURCE_OPTIONS.find((o) => o.value === source);
  if (source === 'OTHER' && other?.trim()) {
    return `Outros — ${other.trim()}`;
  }
  return opt?.label ?? source;
}

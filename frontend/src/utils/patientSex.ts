export type PatientSex = 'M' | 'F';

export const PATIENT_SEX_OPTIONS: { value: PatientSex; label: string }[] = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

export function patientSexLabel(sex?: string | null): string {
  if (sex === 'M') return 'Masculino';
  if (sex === 'F') return 'Feminino';
  return '—';
}

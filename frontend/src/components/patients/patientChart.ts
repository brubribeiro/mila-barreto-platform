import dayjs from 'dayjs';

import type { AppointmentKind } from '../../types';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';

export const appointmentStatusAccent: Record<string, string> = {
  SCHEDULED: 'info.main',
  CONFIRMED: 'primary.main',
  IN_PROGRESS: 'warning.main',
  COMPLETED: 'success.main',
  CANCELLED: 'error.main',
  NO_SHOW: 'error.main',
};

export const appointmentKindLabel: Record<AppointmentKind, string> = {
  EVALUATION: 'Avaliação',
  PROCEDURE: 'Procedimento',
  RETURN: 'Retorno',
};

export function scoreTone(v: number) {
  if (v >= 90) return { main: '#15998B', label: 'Excelente' };
  if (v >= 75) return { main: '#C98A12', label: 'Bom' };
  return { main: '#D65A5A', label: 'Atenção' };
}

export function patientAgeLabel(birthDate?: string | null) {
  const birth = dayjsFromDateOnlyApi(birthDate);
  if (!birth) return null;
  const age = dayjs().diff(birth, 'year');
  return age >= 0 ? `${age} anos` : null;
}

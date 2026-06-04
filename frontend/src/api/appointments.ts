import { api } from './client';
import type { Appointment, AppointmentKind, AppointmentStatus } from '../types';

export interface AppointmentPayload {
  patientId: string;
  procedureId?: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  status?: AppointmentStatus;
  kind?: AppointmentKind;
  notes?: string;
  clinicalNotes?: string;
  paymentMethodId?: string;
  patientPackageId?: string | null;
  extraMaterials?: { itemId: string; quantity: number }[];
}

export const appointmentsBackfillFinance = async (): Promise<{ created: number }> => {
  const { data } = await api.post<{ created: number }>('/appointments/backfill-finance');
  return data;
};

export interface RecurrenceLimitResult {
  earliestDate: string | null;
  recurrenceDays: number | null;
  lastCompletedAt: string | null;
}

export const appointmentsApi = {
  list: async (from?: string, to?: string): Promise<Appointment[]> => {
    const { data } = await api.get<Appointment[]>('/appointments', {
      params: { from, to },
    });
    return data;
  },
  getRecurrenceLimit: async (
    patientId: string,
    procedureId: string,
    excludeId?: string,
  ): Promise<RecurrenceLimitResult> => {
    const { data } = await api.get<RecurrenceLimitResult>('/appointments/recurrence-limit', {
      params: { patientId, procedureId, excludeId },
    });
    return data;
  },
  findOne: async (id: string): Promise<Appointment> => {
    const { data } = await api.get<Appointment>(`/appointments/${id}`);
    return data;
  },
  create: async (payload: AppointmentPayload): Promise<Appointment> => {
    const { data } = await api.post<Appointment>('/appointments', payload);
    return data;
  },
  update: async (id: string, payload: Partial<AppointmentPayload>): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
  start: async (id: string): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}/start`);
    return data;
  },
  finish: async (id: string): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}/finish`);
    return data;
  },
  resume: async (id: string): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}/resume`);
    return data;
  },
};

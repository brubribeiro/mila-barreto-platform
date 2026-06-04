import { api } from './client';
import type { Patient, Appointment, PatientSex } from '../types';

export interface PatientPayload {
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  /** M = masculino, F = feminino; string vazia limpa ao editar */
  sex?: PatientSex | '';
  document?: string;
  /** 8 dígitos; ao editar, string vazia limpa o CEP salvo no backend */
  cep?: string;
  addressStreet?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressNumber?: string;
  addressComplement?: string;
  address?: string;
  notes?: string;
  anamnesis?: Record<string, any>;
}

export type PatientWithHistory = Patient & {
  appointments: Appointment[];
};

export const patientsApi = {
  list: async (search?: string): Promise<Patient[]> => {
    const { data } = await api.get<Patient[]>('/patients', { params: { search } });
    return data;
  },
  findOne: async (id: string): Promise<PatientWithHistory> => {
    const { data } = await api.get<PatientWithHistory>(`/patients/${id}`);
    return data;
  },
  create: async (payload: PatientPayload): Promise<Patient> => {
    const { data } = await api.post<Patient>('/patients', payload);
    return data;
  },
  update: async (id: string, payload: PatientPayload): Promise<Patient> => {
    const { data } = await api.patch<Patient>(`/patients/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
  getReliability: async (id: string): Promise<PatientReliability> => {
    const { data } = await api.get<PatientReliability>(`/patients/${id}/reliability`);
    return data;
  },
};

export interface PatientReliability {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  reliabilityPercent: number;
}

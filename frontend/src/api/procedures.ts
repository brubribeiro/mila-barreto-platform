import { api } from './client';
import type { Procedure } from '../types';

export interface ProcedureMaterialInput {
  itemId: string;
  quantity: number;
}

export interface ProcedurePayload {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  active?: boolean;
  recurrenceDays?: number | null;
  materials?: ProcedureMaterialInput[];
}

export const proceduresApi = {
  list: async (): Promise<Procedure[]> => {
    const { data } = await api.get<Procedure[]>('/procedures');
    return data;
  },
  findOne: async (id: string): Promise<Procedure> => {
    const { data } = await api.get<Procedure>(`/procedures/${id}`);
    return data;
  },
  create: async (payload: ProcedurePayload): Promise<Procedure> => {
    const { data } = await api.post<Procedure>('/procedures', payload);
    return data;
  },
  update: async (id: string, payload: ProcedurePayload): Promise<Procedure> => {
    const { data } = await api.patch<Procedure>(`/procedures/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/procedures/${id}`);
  },
};

import { api } from './client';
import type { UserSummary } from '../types';

export interface UserPayload {
  name: string;
  email: string;
  roleId: string;
  active?: boolean;
  providesAppointments?: boolean;
  isPrimary?: boolean;
}

export const usersApi = {
  list: async (): Promise<UserSummary[]> => {
    const { data } = await api.get<UserSummary[]>('/users');
    return data;
  },
  listActive: async (forAppointments = false): Promise<UserSummary[]> => {
    const { data } = await api.get<UserSummary[]>('/users/active', {
      params: forAppointments ? { forAppointments: 'true' } : undefined,
    });
    return data;
  },
  listAppointmentProviders: async (): Promise<UserSummary[]> => {
    return usersApi.listActive(true);
  },
  create: async (payload: UserPayload): Promise<UserSummary> => {
    const { data } = await api.post<UserSummary>('/users', payload);
    return data;
  },
  update: async (id: string, payload: Partial<UserPayload>): Promise<UserSummary> => {
    const { data } = await api.patch<UserSummary>(`/users/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

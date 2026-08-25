import { api } from './client';
import type { UserSummary } from '../types';

export interface UserPayload {
  name: string;
  email: string;
  roleId: string;
  active?: boolean;
  providesAppointments?: boolean;
  isPrimary?: boolean;
  specialty?: string | null;
  specialties?: string[];
  councilRegister?: string | null;
  calendarColor?: string | null;
  bio?: string | null;
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
  uploadPhoto: async (id: string, file: File): Promise<UserSummary> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post<UserSummary>(`/users/${id}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  removePhoto: async (id: string): Promise<UserSummary> => {
    const { data } = await api.delete<UserSummary>(`/users/${id}/photo`);
    return data;
  },
  getPhotoUrl: async (id: string): Promise<string | null> => {
    const { data } = await api.get<{ url: string | null }>(`/users/${id}/photo-url`);
    return data.url;
  },
};

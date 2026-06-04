import { api } from './client';
import type { Role } from '../types';

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
  restrictToOwnAppointments?: boolean;
}

export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const { data } = await api.get<Role[]>('/roles');
    return data;
  },
  catalog: async (): Promise<{ permissions: string[] }> => {
    const { data } = await api.get<{ permissions: string[] }>('/roles/catalog');
    return data;
  },
  create: async (payload: RolePayload): Promise<Role> => {
    const { data } = await api.post<Role>('/roles', payload);
    return data;
  },
  update: async (id: string, payload: Partial<RolePayload>): Promise<Role> => {
    const { data } = await api.patch<Role>(`/roles/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },
};

import { api } from './client';
import type { PendingCategory, PendingList, PendingRuleConfig, PendingTask } from '../types';

export interface PendingTaskPayload {
  title: string;
  description?: string | null;
  category: PendingCategory;
  dueDate?: string | null;
  urgent?: boolean;
  assigneeId?: string | null;
}

export const pendenciasApi = {
  list: async (): Promise<PendingList> => {
    const { data } = await api.get<PendingList>('/pendencias');
    return data;
  },
  listResolved: async (): Promise<PendingTask[]> => {
    const { data } = await api.get<PendingTask[]>('/pendencias/resolved');
    return data;
  },
  getRules: async (): Promise<PendingRuleConfig[]> => {
    const { data } = await api.get<PendingRuleConfig[]>('/pendencias/rules');
    return data;
  },
  updateRules: async (rules: PendingRuleConfig[]): Promise<PendingRuleConfig[]> => {
    const { data } = await api.put<PendingRuleConfig[]>('/pendencias/rules', { rules });
    return data;
  },
  resolve: async (key: string): Promise<void> => {
    await api.post('/pendencias/resolve', { key });
  },
  assign: async (key: string, assigneeId: string | null): Promise<void> => {
    await api.post('/pendencias/assign', { key, assigneeId });
  },
  reopen: async (id: string): Promise<void> => {
    await api.post(`/pendencias/${id}/reopen`);
  },
  create: async (payload: PendingTaskPayload): Promise<PendingTask> => {
    const { data } = await api.post<PendingTask>('/pendencias', payload);
    return data;
  },
  update: async (id: string, payload: Partial<PendingTaskPayload>): Promise<PendingTask> => {
    const { data } = await api.patch<PendingTask>(`/pendencias/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/pendencias/${id}`);
  },
};

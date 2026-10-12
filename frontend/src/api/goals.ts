import { api } from './client';
import type { Goal, GoalFormat, GoalMetric, GoalPeriodType } from '../types';

export type GoalScope = 'current' | 'upcoming' | 'past' | 'all';

export interface CreateGoalPayload {
  name: string;
  metric: GoalMetric;
  format?: GoalFormat;
  target: number;
  manualValue?: number | null;
  periodType: GoalPeriodType;
  periodStart: string;
  color?: string;
}

export type UpdateGoalPayload = Partial<CreateGoalPayload>;

export const goalsApi = {
  list: async (params: { scope?: GoalScope; at?: string } = {}): Promise<Goal[]> => {
    const { data } = await api.get<Goal[]>('/goals', { params });
    return data;
  },

  preview: async (params: {
    metric: GoalMetric;
    periodType: GoalPeriodType;
    periodStart: string;
  }): Promise<{ currentValue: number | null }> => {
    const { data } = await api.get<{ currentValue: number | null }>('/goals/preview', { params });
    return data;
  },

  create: async (payload: CreateGoalPayload): Promise<Goal> => {
    const { data } = await api.post<Goal>('/goals', payload);
    return data;
  },

  update: async (id: string, payload: UpdateGoalPayload): Promise<Goal> => {
    const { data } = await api.patch<Goal>(`/goals/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/goals/${id}`);
  },
};

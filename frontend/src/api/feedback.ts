import { api } from './client';
import type { FeedbackReport, FeedbackType } from '../types';

export interface CreateFeedbackReportPayload {
  type: FeedbackType;
  title: string;
  description: string;
  pageUrl?: string;
}

export const feedbackApi = {
  create: async (payload: CreateFeedbackReportPayload): Promise<FeedbackReport> => {
    const { data } = await api.post<FeedbackReport>('/feedback', payload);
    return data;
  },

  list: async (type?: FeedbackType): Promise<FeedbackReport[]> => {
    const { data } = await api.get<FeedbackReport[]>('/feedback', {
      params: type ? { type } : undefined,
    });
    return data;
  },
};

import { api } from './client';
import type { MessageTemplate } from '../types';

export interface MessageTemplatePayload {
  name: string;
  category?: string;
  content: string;
  procedureId?: string | null;
}

export const messagesApi = {
  list: async (): Promise<MessageTemplate[]> => {
    const { data } = await api.get<MessageTemplate[]>('/messages');
    return data;
  },
  create: async (payload: MessageTemplatePayload): Promise<MessageTemplate> => {
    const { data } = await api.post<MessageTemplate>('/messages', payload);
    return data;
  },
  update: async (id: string, payload: Partial<MessageTemplatePayload>): Promise<MessageTemplate> => {
    const { data } = await api.patch<MessageTemplate>(`/messages/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/messages/${id}`);
  },
};

import { api } from './client';
import type { Notification, NotificationPreference, NotificationType } from '../types';

export const notificationsApi = {
  list: async (opts: { unreadOnly?: boolean; limit?: number } = {}): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/notifications', {
      params: {
        unread: opts.unreadOnly ? 'true' : undefined,
        limit: opts.limit,
      },
    });
    return data;
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
  getPreferences: async (): Promise<NotificationPreference[]> => {
    const { data } = await api.get<NotificationPreference[]>('/notifications/preferences');
    return data;
  },
  setPreference: async (type: NotificationType, enabled: boolean): Promise<void> => {
    await api.patch('/notifications/preferences', { type, enabled });
  },
};

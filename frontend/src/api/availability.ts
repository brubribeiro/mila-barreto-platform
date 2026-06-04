import { api } from './client';
import type { Unavailability, UnavailabilityCalendarItem, WorkingHours, UserSummary } from '../types';

export const availabilityApi = {
  listWorkingHours: async (userId: string): Promise<WorkingHours[]> => {
    const { data } = await api.get<WorkingHours[]>(`/users/${userId}/availability/working-hours`);
    return data;
  },
  upsertWorkingHours: async (
    userId: string,
    payload: { dayOfWeek: number; startTime: string; endTime: string },
  ): Promise<WorkingHours> => {
    const { data } = await api.put<WorkingHours>(
      `/users/${userId}/availability/working-hours`,
      payload,
    );
    return data;
  },
  removeWorkingHours: async (userId: string, dayOfWeek: number): Promise<void> => {
    await api.delete(`/users/${userId}/availability/working-hours/${dayOfWeek}`);
  },

  listUnavailability: async (userId: string): Promise<Unavailability[]> => {
    const { data } = await api.get<Unavailability[]>(`/users/${userId}/availability/unavailability`);
    return data;
  },
  createUnavailability: async (
    userId: string,
    payload: { startAt: string; endAt: string; reason?: string },
  ): Promise<Unavailability> => {
    const { data } = await api.post<Unavailability>(
      `/users/${userId}/availability/unavailability`,
      payload,
    );
    return data;
  },
  removeUnavailability: async (userId: string, id: string): Promise<void> => {
    await api.delete(`/users/${userId}/availability/unavailability/${id}`);
  },

  listUnavailabilityInRange: async (
    from: string,
    to: string,
  ): Promise<UnavailabilityCalendarItem[]> => {
    const { data } = await api.get<UnavailabilityCalendarItem[]>('/availability/unavailability-range', {
      params: { from, to },
    });
    return data;
  },

  listAvailableProfessionals: async (
    startAt: string,
    endAt: string,
    excludeAppointmentId?: string,
  ): Promise<UserSummary[]> => {
    const { data } = await api.get<UserSummary[]>('/availability/available-professionals', {
      params: { startAt, endAt, excludeAppointmentId },
    });
    return data;
  },
};

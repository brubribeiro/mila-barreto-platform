import type { Appointment, AppointmentStatus } from '../types';

const BLOCKING_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];

export function isBlockingAppointmentStatus(status: AppointmentStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

export function slotOverlapsProfessionalAppointment(
  start: Date,
  end: Date,
  appointments: Appointment[],
  professionalId: string,
  excludeAppointmentId?: string,
): boolean {
  return appointments.some((appointment) => {
    if (appointment.professionalId !== professionalId) return false;
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) return false;
    if (!isBlockingAppointmentStatus(appointment.status)) return false;
    return new Date(appointment.startAt) < end && new Date(appointment.endAt) > start;
  });
}

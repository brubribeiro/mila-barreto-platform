import { Injectable } from '@nestjs/common';
import { AppointmentKind, NotificationType } from '@prisma/client';

import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { appointmentServiceLabel, formatAppointmentDateTime } from './appointment.helpers';

type NotifiableAppointment = {
  id: string;
  professionalId: string;
  startAt: Date;
  kind: AppointmentKind;
  patient: { name: string };
  procedure?: { name: string } | null;
};

const asRecord = (value: unknown) => value as Record<string, unknown>;

/** Notificações e auditoria de agendamentos (fire-and-forget: falhas não afetam a operação). */
@Injectable()
export class AppointmentEventsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  created(appt: NotifiableAppointment, user?: AuditUser) {
    this.notifications
      .notify({
        userId: appt.professionalId,
        type: NotificationType.APPOINTMENT_CREATED,
        title: 'Novo agendamento',
        message: `${appt.patient.name} - ${appointmentServiceLabel(appt)} em ${formatAppointmentDateTime(
          new Date(appt.startAt),
        )}`,
        link: '/agenda',
        metadata: { appointmentId: appt.id },
      })
      .catch(() => undefined);

    this.auditLog.logCreate('Appointment', appt.id, asRecord(appt), user).catch(() => undefined);
  }

  updated(before: unknown, after: NotifiableAppointment, cancelled: boolean, user?: AuditUser) {
    this.auditLog
      .logUpdate('Appointment', after.id, asRecord(before), asRecord(after), user)
      .catch(() => undefined);

    if (!cancelled) return;
    this.notifications
      .notify({
        userId: after.professionalId,
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Agendamento cancelado',
        message: `${after.patient.name} - ${appointmentServiceLabel(after)}`,
        link: '/agenda',
        metadata: { appointmentId: after.id },
      })
      .catch(() => undefined);
  }

  deleted(id: string, oldData: unknown, user?: AuditUser) {
    this.auditLog.logDelete('Appointment', id, asRecord(oldData), user).catch(() => undefined);
  }
}

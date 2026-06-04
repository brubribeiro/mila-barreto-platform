import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EquipmentService } from '../equipment/equipment.service';

/** Intervalo entre execuções das tarefas automáticas (1× por hora). */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Serviço de tarefas agendadas. Executa verificações periódicas
 * e dispara notificações automáticas.
 *
 * Tarefas:
 *  1. Manutenção de equipamentos (EQUIPMENT_MAINTENANCE) — já existia, faltava cron
 *  2. Validade de estoque (INVENTORY_EXPIRING) — novo
 *  3. Retorno de paciente (PATIENT_RETURN_DUE) — novo
 *  4. Reativação de paciente (PATIENT_REACTIVATION) — novo
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly equipment: EquipmentService,
  ) {}

  onModuleInit() {
    // Executa na inicialização e depois a cada hora
    this.runAll().catch((e) => this.logger.error('Scheduler init error', e));
    this.intervalRef = setInterval(
      () => this.runAll().catch((e) => this.logger.error('Scheduler error', e)),
      CHECK_INTERVAL_MS,
    );
    this.logger.log('Scheduler iniciado — verificações a cada 1h');
  }

  onModuleDestroy() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  private async runAll() {
    await Promise.allSettled([
      this.checkEquipmentMaintenance(),
      this.checkInventoryExpiring(),
      this.checkPatientReturnDue(),
      this.checkPatientReactivation(),
    ]);
  }

  // ─── 1. Manutenção de equipamentos ───────────────────────────────

  private async checkEquipmentMaintenance() {
    try {
      await this.equipment.checkMaintenanceNotifications();
    } catch (e) {
      this.logger.error('Erro ao verificar manutenção de equipamentos', e);
    }
  }

  // ─── 2. Validade de produtos no estoque ──────────────────────────

  private async checkInventoryExpiring() {
    try {
      const items = await this.prisma.inventoryItem.findMany({
        where: {
          expiresAt: { not: null },
          expiryNotifyDaysBefore: { not: null },
          quantity: { gt: 0 },
        },
      });

      const now = new Date();
      const recipients = await this.notifications.findUsersWithPermission('inventory:view');
      if (recipients.length === 0) return;

      for (const item of items) {
        const expiresAt = item.expiresAt!;
        const notifyDays = item.expiryNotifyDaysBefore!;

        const diffMs = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Notifica se está dentro da janela de alerta (incluindo já vencidos)
        if (diffDays <= notifyDays) {
          const isExpired = diffDays <= 0;
          const title = isExpired
            ? `Produto vencido: ${item.name}`
            : `Produto vencendo: ${item.name}`;
          const message = isExpired
            ? `${item.name} venceu em ${expiresAt.toLocaleDateString('pt-BR')}.`
            : `${item.name} vence em ${expiresAt.toLocaleDateString('pt-BR')} (${diffDays} dia${diffDays !== 1 ? 's' : ''}).`;

          for (const user of recipients) {
            // Evita duplicar: verifica se já existe notificação nas últimas 24h
            const existing = await this.prisma.notification.findFirst({
              where: {
                userId: user.id,
                type: 'INVENTORY_EXPIRING',
                metadata: { path: ['itemId'], equals: item.id },
                createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
              },
            });
            if (existing) continue;

            await this.notifications.notify({
              userId: user.id,
              type: NotificationType.INVENTORY_EXPIRING,
              title,
              message,
              link: `/estoque/${item.id}`,
              metadata: { itemId: item.id },
            });
          }
        }
      }
    } catch (e) {
      this.logger.error('Erro ao verificar validade do estoque', e);
    }
  }

  // ─── 3. Retorno de paciente (baseado em recurrenceDays) ──────────

  private async checkPatientReturnDue() {
    try {
      // Busca agendamentos concluídos com procedimento que tem recurrenceDays
      // e que não possuem agendamento futuro para o mesmo paciente+procedimento
      const completedAppts = await this.prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          procedure: { recurrenceDays: { not: null } },
        },
        include: {
          patient: { select: { id: true, name: true } },
          procedure: { select: { id: true, name: true, recurrenceDays: true } },
        },
        orderBy: { startAt: 'desc' },
      });

      if (completedAppts.length === 0) return;

      const now = new Date();
      const recipients = await this.notifications.findUsersWithPermission('patients:view');
      if (recipients.length === 0) return;

      // Agrupa por paciente+procedimento, pega o mais recente
      const latestByPatientProc = new Map<string, typeof completedAppts[0]>();
      for (const appt of completedAppts) {
        if (!appt.procedureId || !appt.patientId) continue;
        const key = `${appt.patientId}::${appt.procedureId}`;
        if (!latestByPatientProc.has(key)) {
          latestByPatientProc.set(key, appt);
        }
      }

      // Verifica se já existe agendamento futuro para o mesmo par
      for (const [key, appt] of latestByPatientProc) {
        const recDays = appt.procedure?.recurrenceDays;
        if (!recDays) continue;

        const dueDate = new Date(appt.startAt);
        dueDate.setDate(dueDate.getDate() + recDays);

        // Só notifica se o retorno já está vencido (dueDate passou)
        if (dueDate.getTime() > now.getTime()) continue;

        // Verifica se já tem agendamento futuro (não cancelado) para esse par
        const futureAppt = await this.prisma.appointment.findFirst({
          where: {
            patientId: appt.patientId,
            procedureId: appt.procedureId,
            startAt: { gte: appt.startAt },
            id: { not: appt.id },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        });
        if (futureAppt) continue;

        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        for (const user of recipients) {
          // Evita duplicar: verifica se já existe notificação na última semana
          const existing = await this.prisma.notification.findFirst({
            where: {
              userId: user.id,
              type: 'PATIENT_RETURN_DUE',
              metadata: { path: ['patientId'], equals: appt.patientId },
              createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
          });
          if (existing) continue;

          await this.notifications.notify({
            userId: user.id,
            type: NotificationType.PATIENT_RETURN_DUE,
            title: `Retorno pendente: ${appt.patient?.name}`,
            message: `${appt.procedure?.name} — retorno era previsto há ${diffDays} dia${diffDays !== 1 ? 's' : ''}.`,
            link: '/pacientes',
            metadata: {
              patientId: appt.patientId,
              procedureId: appt.procedureId,
              appointmentId: appt.id,
            },
          });
        }
      }
    } catch (e) {
      this.logger.error('Erro ao verificar retornos de pacientes', e);
    }
  }

  // ─── 4. Reativação de paciente (sem atendimento há 3+ meses) ────

  private async checkPatientReactivation() {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Busca pacientes que:
      // 1. Têm pelo menos 1 agendamento concluído (não são leads)
      // 2. Não têm nenhum agendamento (qualquer status exceto CANCELLED) nos últimos 3 meses
      const allPatients = await this.prisma.patient.findMany({
        select: { id: true, name: true },
      });

      const now = new Date();
      const recipients = await this.notifications.findUsersWithPermission('patients:view');
      if (recipients.length === 0) return;

      for (const patient of allPatients) {
        // Verifica se tem histórico (pelo menos 1 atendimento concluído)
        const hasHistory = await this.prisma.appointment.findFirst({
          where: { patientId: patient.id, status: 'COMPLETED' },
          select: { id: true },
        });
        if (!hasHistory) continue;

        // Verifica se tem atendimento recente (últimos 3 meses)
        const recentAppt = await this.prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            startAt: { gte: threeMonthsAgo },
            status: { notIn: ['CANCELLED'] },
          },
          select: { id: true },
        });
        if (recentAppt) continue;

        // Pega o último atendimento para calcular há quanto tempo
        const lastAppt = await this.prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            status: { notIn: ['CANCELLED'] },
          },
          orderBy: { startAt: 'desc' },
          select: { startAt: true },
        });
        if (!lastAppt) continue;

        const daysSinceLast = Math.floor(
          (now.getTime() - lastAppt.startAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        const monthsSinceLast = Math.floor(daysSinceLast / 30);

        for (const user of recipients) {
          // Evita duplicar: verifica se já existe notificação no último mês
          const existing = await this.prisma.notification.findFirst({
            where: {
              userId: user.id,
              type: 'PATIENT_REACTIVATION',
              metadata: { path: ['patientId'], equals: patient.id },
              createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            },
          });
          if (existing) continue;

          await this.notifications.notify({
            userId: user.id,
            type: NotificationType.PATIENT_REACTIVATION,
            title: `Reativação: ${patient.name}`,
            message: `Sem atendimento há ${monthsSinceLast} mes${monthsSinceLast !== 1 ? 'es' : ''} (${daysSinceLast} dias).`,
            link: '/pacientes',
            metadata: { patientId: patient.id },
          });
        }
      }
    } catch (e) {
      this.logger.error('Erro ao verificar reativação de pacientes', e);
    }
  }
}

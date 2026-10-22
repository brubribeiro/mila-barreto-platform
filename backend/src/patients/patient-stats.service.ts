import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Score: percentual de COMPLETED dentre os finalizados (COMPLETED + CANCELLED + NO_SHOW). */
function reliabilityPercent(completed: number, resolved: number) {
  return resolved > 0 ? Math.round((completed / resolved) * 100) : 100; // sem histórico, assume confiável
}

/** Agregações de pacientes: indicadores da lista, cards da tela e confiabilidade. */
@Injectable()
export class PatientStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Última visita, total gasto, confiabilidade e nº de agendamentos por paciente. */
  async withListStats<T extends { id: string }>(patients: T[]) {
    const ids = patients.map((p) => p.id);

    const [lastVisits, spentByPatient, statusCounts, apptCounts] = ids.length
      ? await Promise.all([
          this.prisma.appointment.groupBy({
            by: ['patientId'],
            where: { patientId: { in: ids }, status: 'COMPLETED' },
            _max: { startAt: true },
          }),
          this.prisma.financialEntry.groupBy({
            by: ['patientId'],
            where: { patientId: { in: ids }, type: 'INCOME' },
            _sum: { amount: true },
          }),
          this.prisma.appointment.groupBy({
            by: ['patientId', 'status'],
            where: { patientId: { in: ids } },
            _count: { id: true },
          }),
          this.prisma.appointment.groupBy({
            by: ['patientId'],
            where: { patientId: { in: ids } },
            _count: { id: true },
          }),
        ])
      : [[], [], [], []];

    const apptCountMap = new Map(apptCounts.map((row) => [row.patientId, row._count.id]));
    const lastVisitMap = new Map(lastVisits.map((row) => [row.patientId, row._max.startAt ?? null]));
    const spentMap = new Map<string, number>();
    for (const row of spentByPatient) {
      if (row.patientId) spentMap.set(row.patientId, Number(row._sum.amount ?? 0));
    }

    const relAcc = new Map<string, { completed: number; resolved: number }>();
    for (const row of statusCounts) {
      const acc = relAcc.get(row.patientId) ?? { completed: 0, resolved: 0 };
      const n = row._count.id;
      if (row.status === 'COMPLETED') {
        acc.completed += n;
        acc.resolved += n;
      } else if (row.status === 'CANCELLED' || row.status === 'NO_SHOW') {
        acc.resolved += n;
      }
      relAcc.set(row.patientId, acc);
    }

    return patients.map((p) => {
      const rel = relAcc.get(p.id);
      return {
        ...p,
        lastVisit: lastVisitMap.get(p.id) ?? null,
        totalSpent: spentMap.get(p.id) ?? 0,
        reliabilityPercent: reliabilityPercent(rel?.completed ?? 0, rel?.resolved ?? 0),
        appointmentsCount: apptCountMap.get(p.id) ?? 0,
      };
    });
  }

  /** Estatísticas agregadas para os cards da tela de pacientes. */
  async overview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [total, newThisMonth, activeRows, income] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.patient.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.appointment.groupBy({
        by: ['patientId'],
        where: { status: 'COMPLETED', startAt: { gte: ninetyDaysAgo } },
      }),
      this.prisma.financialEntry.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const incomeSum = Number(income._sum.amount ?? 0);
    const incomeCount = income._count.id ?? 0;
    const averageTicket = incomeCount > 0 ? incomeSum / incomeCount : 0;

    return {
      total,
      active90: activeRows.length,
      newThisMonth,
      averageTicket,
    };
  }

  async totalSpent(patientId: string) {
    const spent = await this.prisma.financialEntry.aggregate({
      where: { patientId, type: 'INCOME' },
      _sum: { amount: true },
    });
    return Number(spent._sum.amount ?? 0);
  }

  async reliability(patientId: string) {
    const counts = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { patientId },
      _count: { id: true },
    });

    let total = 0;
    let completed = 0;
    let cancelled = 0;
    let noShow = 0;

    for (const row of counts) {
      const n = row._count.id;
      total += n;
      if (row.status === 'COMPLETED') completed = n;
      if (row.status === 'CANCELLED') cancelled = n;
      if (row.status === 'NO_SHOW') noShow = n;
    }

    return {
      total,
      completed,
      cancelled,
      noShow,
      reliabilityPercent: reliabilityPercent(completed, completed + cancelled + noShow),
    };
  }
}

import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  PatientPackageStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface MetricsQuery {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface MetricsResult {
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
    confirmed: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    byProfessional: { name: string; total: number; completed: number }[];
    byProcedure: { name: string; total: number; revenue: number }[];
    procedureCombos: { procedures: string; count: number }[];
    byDayOfWeek: { day: number; total: number }[];
    byHour: { hour: number; total: number }[];
  };
  patients: {
    totalActive: number;
    newInPeriod: number;
    returningInPeriod: number;
    uniqueInPeriod: number;
    averageAge: number | null;
    averageProceduresPerPatient: number;
    topPatients: { name: string; appointments: number }[];
    topLocations: { location: string; count: number }[];
  };
  procedures: {
    totalCatalog: number;
    activeCatalog: number;
    totalPerformed: number;
    uniquePerformed: number;
    averageDuration: number;
    averagePrice: number;
    ranking: { name: string; count: number; revenue: number; avgDuration: number }[];
    byProfessional: { procedure: string; professional: string; count: number }[];
    byMonth: { month: string; count: number }[];
    materialCost: { name: string; baseCost: number; price: number; margin: number }[];
    /** Tempo real médio de atendimento (em minutos, baseado em startedAt/finishedAt) */
    averageRealDuration: number | null;
    durationByProcedure: { name: string; avgMinutes: number; count: number }[];
    durationByProfessional: { name: string; avgMinutes: number; count: number }[];
  };
  packages: {
    totalSold: number;
    totalRevenue: number;
    activeCount: number;
    completedCount: number;
    sessionsUsed: number;
    sessionsTotal: number;
    completionRate: number;
    topPackages: { name: string; sold: number; revenue: number }[];
  };
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(query: MetricsQuery): Promise<MetricsResult> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    // Ajusta o "to" para o final do dia
    to.setHours(23, 59, 59, 999);

    const [appointments, patients, procedures, packages] = await Promise.all([
      this.getAppointmentMetrics(from, to),
      this.getPatientMetrics(from, to),
      this.getProcedureMetrics(from, to),
      this.getPackageMetrics(from, to),
    ]);

    return { appointments, patients, procedures, packages };
  }

  // ─── Agendamentos ───

  private async getAppointmentMetrics(from: Date, to: Date) {
    const appts = await this.prisma.appointment.findMany({
      where: { startAt: { gte: from, lte: to } },
      include: {
        professional: { select: { name: true } },
        procedure: { select: { name: true, price: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    const total = appts.length;
    const completed = appts.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const cancelled = appts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const noShow = appts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
    const scheduled = appts.filter((a) => a.status === AppointmentStatus.SCHEDULED).length;
    const confirmed = appts.filter((a) => a.status === AppointmentStatus.CONFIRMED).length;

    // Por profissional
    const profMap = new Map<string, { name: string; total: number; completed: number }>();
    for (const a of appts) {
      const name = a.professional?.name ?? 'Sem profissional';
      const entry = profMap.get(name) ?? { name, total: 0, completed: 0 };
      entry.total++;
      if (a.status === AppointmentStatus.COMPLETED) entry.completed++;
      profMap.set(name, entry);
    }

    // Por procedimento
    const procMap = new Map<string, { name: string; total: number; revenue: number }>();
    for (const a of appts) {
      if (!a.procedure) continue;
      const name = a.procedure.name;
      const entry = procMap.get(name) ?? { name, total: 0, revenue: 0 };
      entry.total++;
      if (a.status === AppointmentStatus.COMPLETED) {
        entry.revenue += Number(a.procedure.price);
      }
      procMap.set(name, entry);
    }

    // Por dia da semana (0 = domingo)
    const dayMap = new Map<number, number>();
    for (const a of appts) {
      const day = a.startAt.getDay();
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const byDayOfWeek = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      total: dayMap.get(i) ?? 0,
    }));

    // Por hora
    const hourMap = new Map<number, number>();
    for (const a of appts) {
      const hour = a.startAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }
    const byHour = Array.from(hourMap.entries())
      .map(([hour, total]) => ({ hour, total }))
      .sort((a, b) => a.hour - b.hour);

    // Combos de procedimentos: quais procedimentos cada paciente fez no período
    // e agrupar as combinações mais comuns (pares)
    const patientProcs = new Map<string, Set<string>>();
    for (const a of appts) {
      if (!a.procedure || a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.NO_SHOW) continue;
      const pid = a.patient?.id;
      if (!pid) continue;
      const set = patientProcs.get(pid) ?? new Set<string>();
      set.add(a.procedure.name);
      patientProcs.set(pid, set);
    }
    // Gerar pares de procedimentos realizados pelo mesmo paciente
    const comboMap = new Map<string, number>();
    for (const procs of patientProcs.values()) {
      const arr = Array.from(procs).sort();
      if (arr.length < 2) continue;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const key = `${arr[i]} + ${arr[j]}`;
          comboMap.set(key, (comboMap.get(key) ?? 0) + 1);
        }
      }
    }
    const procedureCombos = Array.from(comboMap.entries())
      .map(([procedures, count]) => ({ procedures, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      confirmed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      byProfessional: Array.from(profMap.values()).sort((a, b) => b.total - a.total),
      byProcedure: Array.from(procMap.values()).sort((a, b) => b.revenue - a.revenue),
      procedureCombos,
      byDayOfWeek,
      byHour,
    };
  }

  // ─── Pacientes ───

  private async getPatientMetrics(from: Date, to: Date) {
    const totalActive = await this.prisma.patient.count();

    const newInPeriod = await this.prisma.patient.count({
      where: { createdAt: { gte: from, lte: to } },
    });

    // Pacientes únicos com agendamento no período
    const uniquePatients = await this.prisma.appointment.findMany({
      where: { startAt: { gte: from, lte: to } },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    const uniqueInPeriod = uniquePatients.length;

    // Pacientes que já existiam antes do período e tiveram agendamento no período
    const newPatientIds = new Set(
      (
        await this.prisma.patient.findMany({
          where: { createdAt: { gte: from, lte: to } },
          select: { id: true },
        })
      ).map((p) => p.id),
    );
    const returningInPeriod = uniquePatients.filter(
      (p) => !newPatientIds.has(p.patientId),
    ).length;

    // ─── Média de idade ───
    const patientsWithBirth = await this.prisma.patient.findMany({
      where: { birthDate: { not: null } },
      select: { birthDate: true },
    });
    let averageAge: number | null = null;
    if (patientsWithBirth.length > 0) {
      const now = new Date();
      const totalAge = patientsWithBirth.reduce((sum, p) => {
        const birth = new Date(p.birthDate!);
        let age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
          age--;
        }
        return sum + age;
      }, 0);
      averageAge = Math.round((totalAge / patientsWithBirth.length) * 10) / 10;
    }

    // ─── Maior localidade (por CEP — primeiros 5 dígitos = região) ───
    const patientsWithCep = await this.prisma.patient.findMany({
      where: { cep: { not: null } },
      select: { cep: true, address: true },
    });
    const locationMap = new Map<string, { location: string; count: number }>();
    for (const p of patientsWithCep) {
      const cep = (p.cep ?? '').replace(/\D/g, '');
      if (cep.length < 5) continue;
      // Usar os 5 primeiros dígitos como região (faixa de CEP)
      const regionKey = cep.substring(0, 5);
      // Formatar como CEP parcial para exibição
      const displayCep = `${regionKey}-xxx`;
      const entry = locationMap.get(regionKey) ?? { location: displayCep, count: 0 };
      entry.count++;
      locationMap.set(regionKey, entry);
    }
    // Se tiver endereço, tentar extrair cidade (última parte antes do estado)
    // Fallback: usar o CEP parcial
    const topLocations = Array.from(locationMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── Top pacientes + média de procedimentos por paciente ───
    const patientCounts = new Map<string, { name: string; appointments: number }>();
    const appts = await this.prisma.appointment.findMany({
      where: { startAt: { gte: from, lte: to } },
      include: { patient: { select: { name: true } } },
    });
    for (const a of appts) {
      const key = a.patientId;
      const entry = patientCounts.get(key) ?? {
        name: a.patient?.name ?? 'Paciente',
        appointments: 0,
      };
      entry.appointments++;
      patientCounts.set(key, entry);
    }
    const topPatients = Array.from(patientCounts.values())
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 10);

    // Média de procedimentos por paciente (no período)
    const averageProceduresPerPatient =
      uniqueInPeriod > 0
        ? Math.round((appts.filter((a) => a.procedureId).length / uniqueInPeriod) * 10) / 10
        : 0;

    return {
      totalActive,
      newInPeriod,
      returningInPeriod,
      uniqueInPeriod,
      averageAge,
      averageProceduresPerPatient,
      topPatients,
      topLocations,
    };
  }

  // ─── Procedimentos ───

  private async getProcedureMetrics(from: Date, to: Date) {
    // Catálogo
    const allProcs = await this.prisma.procedure.findMany({
      include: {
        materials: { include: { item: { select: { costPrice: true } } } },
      },
    });
    const totalCatalog = allProcs.length;
    const activeCatalog = allProcs.filter((p) => p.active).length;

    // Agendamentos com procedimento no período
    const appts = await this.prisma.appointment.findMany({
      where: {
        startAt: { gte: from, lte: to },
        procedureId: { not: null },
      },
      include: {
        procedure: { select: { id: true, name: true, price: true, durationMinutes: true } },
        professional: { select: { name: true } },
      },
    });

    const performed = appts.filter(
      (a) => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.NO_SHOW,
    );
    const totalPerformed = performed.length;
    const uniquePerformed = new Set(performed.map((a) => a.procedureId)).size;

    // Duração média e preço médio
    const durations = performed.filter((a) => a.procedure).map((a) => a.procedure!.durationMinutes);
    const averageDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;
    const prices = performed.filter((a) => a.procedure).map((a) => Number(a.procedure!.price));
    const averagePrice = prices.length > 0
      ? Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100
      : 0;

    // Ranking de procedimentos
    const rankMap = new Map<string, { name: string; count: number; revenue: number; totalDur: number }>();
    for (const a of performed) {
      if (!a.procedure) continue;
      const name = a.procedure.name;
      const entry = rankMap.get(name) ?? { name, count: 0, revenue: 0, totalDur: 0 };
      entry.count++;
      if (a.status === AppointmentStatus.COMPLETED) {
        entry.revenue += Number(a.procedure.price);
      }
      entry.totalDur += a.procedure.durationMinutes;
      rankMap.set(name, entry);
    }
    const ranking = Array.from(rankMap.values())
      .map((r) => ({
        name: r.name,
        count: r.count,
        revenue: Math.round(r.revenue * 100) / 100,
        avgDuration: Math.round(r.totalDur / r.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Por profissional × procedimento
    const profProcMap = new Map<string, { procedure: string; professional: string; count: number }>();
    for (const a of performed) {
      if (!a.procedure) continue;
      const key = `${a.procedure.name}||${a.professional?.name ?? '?'}`;
      const entry = profProcMap.get(key) ?? {
        procedure: a.procedure.name,
        professional: a.professional?.name ?? 'Sem profissional',
        count: 0,
      };
      entry.count++;
      profProcMap.set(key, entry);
    }
    const byProfessional = Array.from(profProcMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Evolução mensal de procedimentos realizados
    const monthMap = new Map<string, number>();
    for (const a of performed) {
      const key = `${a.startAt.getFullYear()}-${String(a.startAt.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
    const byMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Custo de materiais vs preço (margem)
    const materialCost = allProcs
      .filter((p) => p.active && p.materials.length > 0)
      .map((p) => {
        const baseCost = p.materials.reduce((sum, m) => {
          const unitCost = Number(m.item?.costPrice ?? 0);
          return sum + unitCost * Number(m.quantity);
        }, 0);
        const price = Number(p.price);
        const margin = price > 0 ? Math.round(((price - baseCost) / price) * 100) : 0;
        return {
          name: p.name,
          baseCost: Math.round(baseCost * 100) / 100,
          price: Math.round(price * 100) / 100,
          margin,
        };
      })
      .sort((a, b) => a.margin - b.margin);

    // ─── Tempo real de atendimento (startedAt → finishedAt) ───
    const timedAppts = await this.prisma.appointment.findMany({
      where: {
        startAt: { gte: from, lte: to },
        startedAt: { not: null },
        finishedAt: { not: null },
      },
      include: {
        procedure: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    const realDurations = timedAppts.map((a) => {
      const mins = (a.finishedAt!.getTime() - a.startedAt!.getTime()) / 60000;
      return { mins, procedure: a.procedure?.name, professional: a.professional?.name };
    });

    const averageRealDuration = realDurations.length > 0
      ? Math.round(realDurations.reduce((s, d) => s + d.mins, 0) / realDurations.length)
      : null;

    // Por procedimento
    const durByProcMap = new Map<string, { total: number; count: number }>();
    for (const d of realDurations) {
      if (!d.procedure) continue;
      const entry = durByProcMap.get(d.procedure) ?? { total: 0, count: 0 };
      entry.total += d.mins;
      entry.count++;
      durByProcMap.set(d.procedure, entry);
    }
    const durationByProcedure = Array.from(durByProcMap.entries())
      .map(([name, v]) => ({ name, avgMinutes: Math.round(v.total / v.count), count: v.count }))
      .sort((a, b) => b.count - a.count);

    // Por profissional
    const durByProfMap = new Map<string, { total: number; count: number }>();
    for (const d of realDurations) {
      const name = d.professional ?? 'Sem profissional';
      const entry = durByProfMap.get(name) ?? { total: 0, count: 0 };
      entry.total += d.mins;
      entry.count++;
      durByProfMap.set(name, entry);
    }
    const durationByProfessional = Array.from(durByProfMap.entries())
      .map(([name, v]) => ({ name, avgMinutes: Math.round(v.total / v.count), count: v.count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCatalog,
      activeCatalog,
      totalPerformed,
      uniquePerformed,
      averageDuration,
      averagePrice,
      ranking,
      byProfessional,
      byMonth,
      materialCost,
      averageRealDuration,
      durationByProcedure,
      durationByProfessional,
    };
  }

  // ─── Pacotes ───

  private async getPackageMetrics(from: Date, to: Date) {
    const patientPackages = await this.prisma.patientPackage.findMany({
      where: { purchaseDate: { gte: from, lte: to } },
      include: { package: { select: { name: true } } },
    });

    const totalSold = patientPackages.length;
    const totalRevenue = patientPackages.reduce((sum, pp) => sum + Number(pp.totalPaid), 0);

    // Status geral (todos, não apenas do período)
    const allPP = await this.prisma.patientPackage.findMany({
      select: { status: true, sessionsUsed: true, sessionsTotal: true },
    });
    const activeCount = allPP.filter((pp) => pp.status === PatientPackageStatus.ACTIVE).length;
    const completedCount = allPP.filter((pp) => pp.status === PatientPackageStatus.COMPLETED).length;
    const sessionsUsed = allPP.reduce((sum, pp) => sum + pp.sessionsUsed, 0);
    const sessionsTotal = allPP.reduce((sum, pp) => sum + pp.sessionsTotal, 0);
    const completionRate = sessionsTotal > 0 ? Math.round((sessionsUsed / sessionsTotal) * 100) : 0;

    // Top pacotes vendidos no período
    const pkgMap = new Map<string, { name: string; sold: number; revenue: number }>();
    for (const pp of patientPackages) {
      const name = pp.package?.name ?? 'Pacote';
      const entry = pkgMap.get(name) ?? { name, sold: 0, revenue: 0 };
      entry.sold++;
      entry.revenue += Number(pp.totalPaid);
      pkgMap.set(name, entry);
    }

    return {
      totalSold,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeCount,
      completedCount,
      sessionsUsed,
      sessionsTotal,
      completionRate,
      topPackages: Array.from(pkgMap.values()).sort((a, b) => b.sold - a.sold),
    };
  }
}

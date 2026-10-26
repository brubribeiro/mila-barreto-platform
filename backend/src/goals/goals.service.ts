import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentKind,
  AppointmentStatus,
  Goal,
  GoalFormat,
  GoalMetric,
  GoalPeriodType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

export type GoalScope = 'current' | 'upcoming' | 'past' | 'all';

/** Formato fixo dos indicadores automáticos; metas manuais escolhem o próprio. */
const METRIC_FORMAT: Record<Exclude<GoalMetric, 'MANUAL'>, GoalFormat> = {
  REVENUE: GoalFormat.CURRENCY,
  NEW_PATIENTS: GoalFormat.NUMBER,
  PROCEDURES: GoalFormat.NUMBER,
  AVERAGE_TICKET: GoalFormat.CURRENCY,
  OCCUPANCY: GoalFormat.PERCENT,
  RETURN_RATE: GoalFormat.PERCENT,
};

const PERIOD_MONTHS: Record<GoalPeriodType, number> = { MONTH: 1, QUARTER: 3, YEAR: 12 };

/**
 * Os períodos são calendário do Brasil. São Paulo não tem horário de verão desde 2019,
 * então o deslocamento fixo -03:00 converte o início/fim de cada dia corretamente.
 */
const BRAZIL_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

interface PeriodBounds {
  /** Primeiro dia do período (YYYY-MM-DD). */
  startDay: string;
  /** Primeiro dia do período seguinte (YYYY-MM-DD, exclusivo). */
  endDay: string;
  from: Date;
  to: Date;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dayKey(year: number, month: number, day = 1) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function brazilInstant(day: string, hhmm = '00:00') {
  return new Date(`${day}T${hhmm}:00${BRAZIL_OFFSET}`);
}

/** Data de hoje (YYYY-MM-DD) no fuso do Brasil. */
function brazilToday() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Normaliza qualquer data para o primeiro dia do mês/trimestre/ano que a contém. */
function normalizePeriodStart(value: string, type: GoalPeriodType) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new BadRequestException('Período inválido');
  }
  if (type === GoalPeriodType.YEAR) return dayKey(year, 1);
  if (type === GoalPeriodType.QUARTER) return dayKey(year, Math.floor((month - 1) / 3) * 3 + 1);
  return dayKey(year, month);
}

function periodBounds(periodStart: Date, type: GoalPeriodType): PeriodBounds {
  const startDay = periodStart.toISOString().slice(0, 10);
  const [year, month] = startDay.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + PERIOD_MONTHS[type];
  const endDay = dayKey(Math.floor(totalMonths / 12), (totalMonths % 12) + 1);
  return { startDay, endDay, from: brazilInstant(startDay), to: brazilInstant(endDay) };
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, (end - start) / 60000);
}

function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Lista metas com valor atual e progresso calculados.
   * `at` (YYYY-MM-DD) filtra as metas cujo período contém a data e tem prioridade sobre `scope`.
   */
  async list(scope: GoalScope = 'current', at?: string) {
    const goals = await this.prisma.goal.findMany({
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'asc' }],
    });
    const today = at && /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : brazilToday();
    const effectiveScope: GoalScope = at ? 'current' : scope;

    const filtered = goals.filter((g) => {
      const { startDay, endDay } = periodBounds(g.periodStart, g.periodType);
      if (effectiveScope === 'current') return startDay <= today && today < endDay;
      if (effectiveScope === 'upcoming') return startDay > today;
      if (effectiveScope === 'past') return endDay <= today;
      return true;
    });

    const cache = new Map<string, Promise<number>>();
    return Promise.all(filtered.map((g) => this.withProgress(g, cache)));
  }

  async findOne(id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    return this.withProgress(goal, new Map());
  }

  /** Valor atual de um indicador num período, sem salvar (prévia do formulário). */
  async preview(metric: GoalMetric, periodType: GoalPeriodType, periodStart: string) {
    if (metric === GoalMetric.MANUAL) return { currentValue: null };
    const start = normalizePeriodStart(periodStart, periodType);
    const bounds = periodBounds(new Date(`${start}T00:00:00Z`), periodType);
    return { currentValue: await this.computeMetric(metric, bounds) };
  }

  async create(dto: CreateGoalDto, user?: AuditUser) {
    const data = this.toData(dto);
    const created = await this.prisma.goal.create({
      data: data as Prisma.GoalCreateInput,
    });
    this.auditLog.logCreate('Goal', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);
    return this.withProgress(created, new Map());
  }

  async update(id: string, dto: UpdateGoalDto, user?: AuditUser) {
    const existing = await this.prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meta não encontrada');
    const data = this.toData(dto, existing);
    const updated = await this.prisma.goal.update({ where: { id }, data });
    this.auditLog.logUpdate('Goal', id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    return this.withProgress(updated, new Map());
  }

  async remove(id: string, user?: AuditUser) {
    const existing = await this.prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meta não encontrada');
    await this.prisma.goal.delete({ where: { id } });
    this.auditLog.logDelete('Goal', id, existing as unknown as Record<string, unknown>, user).catch(() => undefined);
    return { ok: true };
  }

  private toData(dto: UpdateGoalDto, existing?: Goal): Prisma.GoalUpdateInput {
    const metric = dto.metric ?? existing?.metric ?? GoalMetric.MANUAL;
    const periodType = dto.periodType ?? existing?.periodType ?? GoalPeriodType.MONTH;
    const isManual = metric === GoalMetric.MANUAL;

    const data: Prisma.GoalUpdateInput = {
      metric,
      periodType,
      format: isManual ? (dto.format ?? existing?.format ?? GoalFormat.NUMBER) : METRIC_FORMAT[metric],
      // Indicadores automáticos não guardam valor manual.
      manualValue: isManual
        ? dto.manualValue !== undefined
          ? dto.manualValue
          : (existing?.manualValue ?? 0)
        : null,
    };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.target !== undefined) data.target = dto.target;
    if (dto.color !== undefined) data.color = dto.color;

    const startSource = dto.periodStart ?? existing?.periodStart.toISOString().slice(0, 10);
    if (startSource) {
      data.periodStart = new Date(`${normalizePeriodStart(startSource, periodType)}T00:00:00Z`);
    }
    return data;
  }

  private async withProgress(goal: Goal, cache: Map<string, Promise<number>>) {
    const bounds = periodBounds(goal.periodStart, goal.periodType);
    let currentValue: number;
    if (goal.metric === GoalMetric.MANUAL) {
      currentValue = Number(goal.manualValue ?? 0);
    } else {
      const key = `${goal.metric}:${bounds.startDay}:${bounds.endDay}`;
      let pending = cache.get(key);
      if (!pending) {
        pending = this.computeMetric(goal.metric, bounds);
        cache.set(key, pending);
      }
      currentValue = await pending;
    }
    const target = Number(goal.target);
    const lastDay = new Date(new Date(`${bounds.endDay}T00:00:00Z`).getTime() - DAY_MS);
    return {
      ...goal,
      target,
      manualValue: goal.manualValue === null ? null : Number(goal.manualValue),
      periodStart: bounds.startDay,
      periodEnd: lastDay.toISOString().slice(0, 10),
      currentValue,
      progress: target > 0 ? round((currentValue / target) * 100, 1) : 0,
    };
  }

  private computeMetric(metric: GoalMetric, bounds: PeriodBounds): Promise<number> {
    switch (metric) {
      case GoalMetric.REVENUE:
        return this.revenue(bounds);
      case GoalMetric.NEW_PATIENTS:
        return this.prisma.patient.count({ where: { createdAt: { gte: bounds.from, lt: bounds.to } } });
      case GoalMetric.PROCEDURES:
        return this.prisma.appointment.count({
          where: {
            startAt: { gte: bounds.from, lt: bounds.to },
            status: AppointmentStatus.COMPLETED,
            kind: AppointmentKind.PROCEDURE,
          },
        });
      case GoalMetric.AVERAGE_TICKET:
        return this.averageTicket(bounds);
      case GoalMetric.OCCUPANCY:
        return this.occupancy(bounds);
      case GoalMetric.RETURN_RATE:
        return this.returnRate(bounds);
      default:
        return Promise.resolve(0);
    }
  }

  /** Mesmo critério do resumo financeiro: receitas pagas ou com vencimento no período. */
  private async revenue({ from, to }: PeriodBounds) {
    const bounds = { gte: from, lt: to };
    const income = await this.prisma.financialEntry.aggregate({
      where: { type: 'INCOME', OR: [{ paidAt: bounds }, { dueDate: bounds }] },
      _sum: { amount: true },
    });
    return round(Number(income._sum.amount ?? 0));
  }

  /** Faturamento do período dividido pelos atendimentos concluídos. */
  private async averageTicket(bounds: PeriodBounds) {
    const [revenue, completed] = await Promise.all([
      this.revenue(bounds),
      this.prisma.appointment.count({
        where: { startAt: { gte: bounds.from, lt: bounds.to }, status: AppointmentStatus.COMPLETED },
      }),
    ]);
    return completed > 0 ? round(revenue / completed) : 0;
  }

  /**
   * Minutos agendados (exceto cancelados/faltas) sobre os minutos de expediente dos
   * profissionais ativos no período, descontadas as indisponibilidades.
   */
  private async occupancy({ startDay, endDay, from, to }: PeriodBounds) {
    const professionals = await this.prisma.user.findMany({
      where: { active: true, providesAppointments: true },
      select: {
        id: true,
        workingHours: true,
        unavailabilities: { where: { startAt: { lt: to }, endAt: { gt: from } } },
      },
    });
    if (professionals.length === 0) return 0;

    let available = 0;
    for (let t = Date.parse(`${startDay}T00:00:00Z`); t < Date.parse(`${endDay}T00:00:00Z`); t += DAY_MS) {
      const day = new Date(t).toISOString().slice(0, 10);
      const dayOfWeek = new Date(t).getUTCDay();
      for (const p of professionals) {
        const wh = p.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
        if (!wh) continue;
        const start = brazilInstant(day, wh.startTime);
        const end = brazilInstant(day, wh.endTime);
        const blocked = p.unavailabilities.reduce(
          (sum, u) => sum + overlapMinutes(start, end, u.startAt, u.endAt),
          0,
        );
        available += Math.max(0, minutesBetween(start, end) - blocked);
      }
    }
    if (available === 0) return 0;

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startAt: { lt: to },
        endAt: { gt: from },
        professionalId: { in: professionals.map((p) => p.id) },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      select: { startAt: true, endAt: true },
    });
    const booked = appointments.reduce((sum, a) => sum + overlapMinutes(a.startAt, a.endAt, from, to), 0);
    return round(Math.min(100, (booked / available) * 100), 1);
  }

  /** % dos pacientes atendidos no período que já tinham um atendimento concluído antes. */
  private async returnRate({ from, to }: PeriodBounds) {
    const attended = await this.prisma.appointment.findMany({
      where: { startAt: { gte: from, lt: to }, status: AppointmentStatus.COMPLETED },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    if (attended.length === 0) return 0;
    const returning = await this.prisma.appointment.findMany({
      where: {
        patientId: { in: attended.map((a) => a.patientId) },
        startAt: { lt: from },
        status: AppointmentStatus.COMPLETED,
      },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    return round((returning.length / attended.length) * 100, 1);
  }
}

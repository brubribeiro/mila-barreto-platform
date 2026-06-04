import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const PROFESSIONAL_SELECT = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  active: true,
  createdAt: true,
  role: { select: { id: true, name: true, isSystem: true } },
} as const;

export class UpsertWorkingHoursDto {
  @IsInt() @Min(0) @Max(6)
  dayOfWeek: number;

  @IsString() @Matches(HHMM, { message: 'startTime deve ser HH:mm' })
  startTime: string;

  @IsString() @Matches(HHMM, { message: 'endTime deve ser HH:mm' })
  endTime: string;
}

export class CreateUnavailabilityDto {
  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional() @IsString()
  reason?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Working hours =====

  listWorkingHours(userId: string) {
    return this.prisma.workingHours.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertWorkingHours(userId: string, dto: UpsertWorkingHoursDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('O horário de início deve ser anterior ao de término.');
    }
    return this.prisma.workingHours.upsert({
      where: { userId_dayOfWeek: { userId, dayOfWeek: dto.dayOfWeek } },
      create: { userId, ...dto },
      update: { startTime: dto.startTime, endTime: dto.endTime },
    });
  }

  async removeWorkingHours(userId: string, dayOfWeek: number) {
    await this.prisma.workingHours.deleteMany({ where: { userId, dayOfWeek } });
    return { ok: true };
  }

  // ===== Unavailability =====

  listUnavailability(userId: string) {
    return this.prisma.unavailability.findMany({
      where: { userId },
      orderBy: { startAt: 'asc' },
    });
  }

  async createUnavailability(userId: string, dto: CreateUnavailabilityDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) {
      throw new BadRequestException('O início deve ser anterior ao fim.');
    }
    return this.prisma.unavailability.create({
      data: { userId, startAt, endAt, reason: dto.reason },
    });
  }

  async removeUnavailability(userId: string, id: string) {
    const ua = await this.prisma.unavailability.findUnique({ where: { id } });
    if (!ua || ua.userId !== userId) {
      throw new NotFoundException('Indisponibilidade não encontrada');
    }
    await this.prisma.unavailability.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Calendário / agendamento =====

  listUnavailabilityInRange(from: string, to: string, onlyUserId?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.prisma.unavailability.findMany({
      where: {
        ...(onlyUserId ? { userId: onlyUserId } : {}),
        startAt: { lt: toDate },
        endAt: { gt: fromDate },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Mesma regra usada ao criar/editar agendamento: indisponibilidade, expediente semanal e conflito.
   */
  async checkProfessionalSlot(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ) {
    const overlap = await this.prisma.unavailability.findFirst({
      where: {
        userId: professionalId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        `Profissional indisponível no período (motivo: ${overlap.reason ?? 'folga'}).`,
      );
    }

    const wh = await this.prisma.workingHours.findMany({
      where: { userId: professionalId },
    });
    if (wh.length > 0) {
      const dayOfWeek = startAt.getDay();
      const dayHours = wh.find((w) => w.dayOfWeek === dayOfWeek);
      if (!dayHours) {
        throw new BadRequestException('O profissional não atende neste dia da semana.');
      }
      const hhmm = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const startHM = hhmm(startAt);
      const endHM = hhmm(endAt);
      if (startHM < dayHours.startTime || endHM > dayHours.endTime) {
        throw new BadRequestException(
          `Horário fora do expediente do profissional (${dayHours.startTime}–${dayHours.endTime}).`,
        );
      }
    }

    await this.assertNoAppointmentConflict(
      professionalId,
      startAt,
      endAt,
      excludeAppointmentId,
    );
  }

  async assertNoAppointmentConflict(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const conflicting = await db.appointment.findFirst({
      where: {
        professionalId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (conflicting) {
      throw new BadRequestException(
        'Já existe outro agendamento ativo do mesmo profissional nesse horário.',
      );
    }
  }

  async listAvailableProfessionals(
    startAt: string,
    endAt: string,
    excludeAppointmentId?: string,
  ) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Intervalo de horário inválido.');
    }

    const professionals = await this.prisma.user.findMany({
      where: { active: true, providesAppointments: true },
      select: PROFESSIONAL_SELECT,
      orderBy: { name: 'asc' },
    });

    type ProfessionalRow = (typeof professionals)[number];
    const available: ProfessionalRow[] = [];
    for (const professional of professionals) {
      try {
        await this.checkProfessionalSlot(professional.id, start, end, excludeAppointmentId);
        available.push(professional);
      } catch {
        // indisponível neste intervalo
      }
    }
    return available;
  }
}

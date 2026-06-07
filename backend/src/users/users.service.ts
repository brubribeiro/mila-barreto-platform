import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  active: true,
  providesAppointments: true,
  isPrimary: true,
  createdAt: true,
  role: { select: { id: true, name: true, isSystem: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Versão completa com password e relação para autenticação. */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  list() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** Lista resumida usada em dropdowns (qualquer autenticado) — campos mínimos */
  async listActive(forAppointments?: boolean) {
    return this.prisma.user.findMany({
      where: {
        active: true,
        ...(forAppointments ? { providesAppointments: true } : {}),
      },
      select: {
        id: true,
        name: true,
        active: true,
        providesAppointments: true,
        roleId: true,
        role: { select: { id: true, name: true, isSystem: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto, user?: AuditUser) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException('Grupo (role) inválido.');

    // Senha aleatória — autenticação é feita exclusivamente via Google OAuth
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const password = await bcrypt.hash(randomPassword, 10);
    // Se marcado como principal, desmarca o anterior
    if (dto.isPrimary) {
      await this.prisma.user.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password,
        roleId: dto.roleId,
        active: dto.active ?? true,
        providesAppointments: dto.providesAppointments ?? true,
        isPrimary: dto.isPrimary ?? false,
      },
      select: SAFE_SELECT,
    });

    this.auditLog.logCreate('User', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);

    // Notifica outros administradores (exceto o próprio recém-criado)
    const admins = await this.notifications.findUsersWithPermission('users:view');
    this.notifications
      .notifyMany(
        admins.filter((a) => a.id !== created.id).map((a) => a.id),
        {
          type: NotificationType.USER_CREATED,
          title: 'Novo profissional cadastrado',
          message: `${created.name} (${created.role?.name ?? '—'})`,
          link: '/profissionais',
          metadata: { userId: created.id },
        },
      )
      .catch(() => undefined);

    return created;
  }

  async update(id: string, dto: UpdateUserDto, auditUser?: AuditUser) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.findByEmail(dto.email);
      if (exists) throw new ConflictException('E-mail já cadastrado');
    }

    if (dto.roleId && dto.roleId !== user.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException('Grupo (role) inválido.');
    }

    // Se marcado como principal, desmarca o anterior
    if (dto.isPrimary) {
      await this.prisma.user.updateMany({
        where: { isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const data: any = { ...dto };

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
    this.auditLog.logUpdate('User', id, user as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, auditUser).catch(() => undefined);
    return updated;
  }

  async remove(id: string, requesterId: string, auditUser?: AuditUser) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (id === requesterId) {
      throw new BadRequestException('Você não pode excluir o próprio usuário.');
    }
    const apptCount = await this.prisma.appointment.count({ where: { professionalId: id } });
    if (apptCount > 0) {
      const updated = await this.prisma.user.update({
        where: { id },
        data: { active: false },
        select: SAFE_SELECT,
      });
      this.auditLog.logUpdate('User', id, user as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, auditUser).catch(() => undefined);
      return updated;
    }
    await this.prisma.user.delete({ where: { id } });
    this.auditLog.logDelete('User', id, user as unknown as Record<string, unknown>, auditUser).catch(() => undefined);
    return { ok: true };
  }
}

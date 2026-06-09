import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ALL_PERMISSIONS, isValidPermission, SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private normalizeRole<T extends { name: string; permissions: string[] }>(role: T): T {
    if (role.name === SYSTEM_ADMIN_ROLE_NAME) {
      return { ...role, permissions: [...ALL_PERMISSIONS] };
    }
    return role;
  }

  list() {
    return this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    }).then((roles) => roles.map((role) => this.normalizeRole(role)));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Grupo não encontrado');
    return this.normalizeRole(role);
  }

  private validatePermissions(perms: string[]) {
    const invalid = perms.filter((p) => !isValidPermission(p));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Permissões inválidas: ${invalid.join(', ')}. Válidas: ${ALL_PERMISSIONS.join(', ')}`,
      );
    }
  }

  async create(dto: CreateRoleDto, user?: AuditUser) {
    this.validatePermissions(dto.permissions);

    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Já existe um grupo com esse nome.');

    const created = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        restrictToOwnAppointments: dto.restrictToOwnAppointments ?? false,
        isSystem: false,
      },
    });
    this.auditLog.logCreate('Role', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);
    return created;
  }

  async update(id: string, dto: UpdateRoleDto, user?: AuditUser) {
    const role = await this.findOne(id);

    // Roles do sistema: pode editar permissões mas não pode mudar nome nem desativar
    if (role.isSystem) {
      if (dto.name && dto.name !== role.name) {
        throw new ForbiddenException('Não é possível renomear um grupo do sistema.');
      }
    }

    if (role.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME) {
      dto.permissions = [...ALL_PERMISSIONS];
    } else if (dto.permissions) {
      this.validatePermissions(dto.permissions);
    }

    if (dto.name && dto.name !== role.name) {
      const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Já existe um grupo com esse nome.');
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        restrictToOwnAppointments: dto.restrictToOwnAppointments,
      },
    });
    this.auditLog.logUpdate('Role', id, role as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    return this.normalizeRole(updated);
  }

  async remove(id: string, user?: AuditUser) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('Grupos do sistema não podem ser excluídos.');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Existem ${role._count.users} usuário(s) vinculado(s) a este grupo. Realoque-os antes de excluir.`,
      );
    }
    await this.prisma.role.delete({ where: { id } });
    this.auditLog.logDelete('Role', id, role as unknown as Record<string, unknown>, user).catch(() => undefined);
    return { ok: true };
  }

  /** Retorna o catálogo de permissões disponíveis. Usado pelo frontend. */
  catalog() {
    return {
      permissions: ALL_PERMISSIONS,
    };
  }
}

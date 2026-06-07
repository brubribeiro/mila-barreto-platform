import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';

export class CreateMessageTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  procedureId?: string | null;
}

export class UpdateMessageTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  procedureId?: string | null;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.messageTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { procedure: { select: { id: true, name: true, price: true } } },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.messageTemplate.findUnique({
      where: { id },
      include: { procedure: { select: { id: true, name: true, price: true } } },
    });
    if (!t) throw new NotFoundException('Template não encontrado');
    return t;
  }

  async create(dto: CreateMessageTemplateDto, user?: AuditUser) {
    const exists = await this.prisma.messageTemplate.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Já existe um template com esse nome.');
    const created = await this.prisma.messageTemplate.create({ data: dto });
    this.auditLog.logCreate('MessageTemplate', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);
    return created;
  }

  async update(id: string, dto: UpdateMessageTemplateDto, user?: AuditUser) {
    const oldData = await this.findOne(id);
    if (dto.name) {
      const exists = await this.prisma.messageTemplate.findUnique({ where: { name: dto.name } });
      if (exists && exists.id !== id) {
        throw new ConflictException('Já existe um template com esse nome.');
      }
    }
    const updated = await this.prisma.messageTemplate.update({ where: { id }, data: dto });
    this.auditLog.logUpdate('MessageTemplate', id, oldData as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    return updated;
  }

  async remove(id: string, user?: AuditUser) {
    const oldData = await this.findOne(id);
    await this.prisma.messageTemplate.delete({ where: { id } });
    this.auditLog.logDelete('MessageTemplate', id, oldData as unknown as Record<string, unknown>, user).catch(() => undefined);
    return { ok: true };
  }
}

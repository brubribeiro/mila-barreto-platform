import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateMessageTemplateDto) {
    const exists = await this.prisma.messageTemplate.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Já existe um template com esse nome.');
    return this.prisma.messageTemplate.create({ data: dto });
  }

  async update(id: string, dto: UpdateMessageTemplateDto) {
    await this.findOne(id);
    if (dto.name) {
      const exists = await this.prisma.messageTemplate.findUnique({ where: { name: dto.name } });
      if (exists && exists.id !== id) {
        throw new ConflictException('Já existe um template com esse nome.');
      }
    }
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { ok: true };
  }
}

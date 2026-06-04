import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from './r2-storage.service';

export class CreateDocumentDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  patientId?: string;

  @IsOptional() @IsUUID()
  equipmentId?: string;
}

export class LinkExternalFileDto {
  @IsString()
  name: string;

  @IsString()
  fileUrl: string;

  @IsOptional() @IsString()
  mimeType?: string;

  @IsOptional()
  size?: number;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  patientId?: string;

  @IsOptional() @IsUUID()
  equipmentId?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2StorageService,
  ) {}

  list(filter?: { patientId?: string; equipmentId?: string }) {
    return this.prisma.document.findMany({
      where: {
        ...(filter?.patientId ? { patientId: filter.patientId } : {}),
        ...(filter?.equipmentId ? { equipmentId: filter.equipmentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const d = await this.prisma.document.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Documento não encontrado');
    return d;
  }

  /** Upload de arquivo: envia para o Cloudflare R2 e salva referência no banco */
  async upload(dto: CreateDocumentDto, file: Express.Multer.File) {
    if (!this.r2.isConfigured) {
      throw new BadRequestException('Cloudflare R2 não está configurado. Verifique as variáveis de ambiente.');
    }

    // Subfolder baseado no vínculo
    let subfolder: string | undefined;
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { name: true },
      });
      if (patient) subfolder = `pacientes/${patient.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}`;
    } else if (dto.equipmentId) {
      const equip = await this.prisma.equipment.findUnique({
        where: { id: dto.equipmentId },
        select: { name: true },
      });
      if (equip) subfolder = `equipamentos/${equip.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}`;
    }

    const { key, url } = await this.r2.upload(
      dto.name || file.originalname,
      file.mimetype,
      file.buffer,
      subfolder,
    );

    return this.prisma.document.create({
      data: {
        name: dto.name || file.originalname,
        category: dto.category,
        notes: dto.notes,
        storageKey: key,
        fileUrl: url,
        mimeType: file.mimetype,
        size: file.size,
        patientId: dto.patientId,
        equipmentId: dto.equipmentId,
      },
    });
  }

  /** Vincular um arquivo externo (URL manual) */
  async linkExternalFile(dto: LinkExternalFileDto) {
    return this.prisma.document.create({
      data: {
        name: dto.name,
        category: dto.category,
        notes: dto.notes,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        size: dto.size,
        patientId: dto.patientId,
        equipmentId: dto.equipmentId,
      },
    });
  }

  async remove(id: string) {
    const d = await this.findOne(id);
    if (d.storageKey) {
      await this.r2.remove(d.storageKey);
    }
    await this.prisma.document.delete({ where: { id } });
    return { ok: true };
  }
}

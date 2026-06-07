import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from './r2-storage.service';
import { CompressionService } from './compression.service';

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

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2StorageService,
    private readonly compression: CompressionService,
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

  /** URL temporária assinada para arquivo privado no R2. */
  async getAccessUrl(id: string): Promise<{ url: string }> {
    const doc = await this.findOne(id);

    if (!doc.storageKey) {
      throw new NotFoundException('Arquivo não disponível para visualização.');
    }
    if (!this.r2.isConfigured) {
      throw new BadRequestException('Cloudflare R2 não está configurado.');
    }

    const url = await this.r2.getPresignedUrl(doc.storageKey);
    return { url };
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

    // Comprimir arquivo antes do upload
    const compressed = await this.compression.compress(file.buffer, file.mimetype);

    const { key, url } = await this.r2.upload(
      dto.name || file.originalname,
      compressed.mimeType,
      compressed.buffer,
      subfolder,
    );

    return this.prisma.document.create({
      data: {
        name: dto.name || file.originalname,
        category: dto.category,
        notes: dto.notes,
        storageKey: key,
        fileUrl: url,
        mimeType: compressed.mimeType,
        size: compressed.compressedSize,
        patientId: dto.patientId,
        equipmentId: dto.equipmentId,
      },
      include: {
        patient: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
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

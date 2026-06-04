import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { composePatientAddress } from './patient-address.util';
import { NotificationsService } from '../notifications/notifications.service';
import { R2StorageService } from '../documents/r2-storage.service';

const PATIENT_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PATIENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const ADDRESS_STRING_FIELDS = [
  'addressStreet',
  'addressNeighborhood',
  'addressCity',
  'addressState',
  'addressNumber',
  'addressComplement',
] as const;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly r2: R2StorageService,
  ) {}

  list(search?: string) {
    return this.prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { startAt: 'desc' },
          include: {
            procedure: { select: { id: true, name: true } },
            professional: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  async create(dto: CreatePatientDto) {
    const data = this.normalizePatientWritableFields(dto);

    const patient = await this.prisma.patient.create({
      data: data as Parameters<typeof this.prisma.patient.create>[0]['data'],
    });

    // Notifica usuários com permissão de gerenciar usuários (= admins normalmente)
    const admins = await this.notifications.findUsersWithPermission('users:view');
    this.notifications
      .notifyMany(
        admins.map((a) => a.id),
        {
          type: NotificationType.PATIENT_CREATED,
          title: 'Novo paciente cadastrado',
          message: patient.name,
          link: '/pacientes',
          metadata: { patientId: patient.id },
        },
      )
      .catch(() => undefined);

    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.findOne(id);
    const data = this.normalizePatientWritableFields(dto);
    return this.prisma.patient.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.patient.update>[0]['data'],
    });
  }

  /**
   * CEP (8 dígitos ou null), birthDate como Date em UTC ao meio-dia (YYYYMMDD vem só do cliente),
   * para o motor Prisma aceitar DateTime ISO completo em vez de "YYYY-MM-DD" puro.
   */
  private normalizePatientWritableFields<
    T extends Partial<
      Pick<
        CreatePatientDto,
        | 'cep'
        | 'birthDate'
        | 'sex'
        | 'referralSource'
        | 'referralSourceOther'
        | 'address'
        | 'addressStreet'
        | 'addressNeighborhood'
        | 'addressCity'
        | 'addressState'
        | 'addressNumber'
        | 'addressComplement'
      >
    >,
  >(dto: T): Record<string, unknown> {
    const out = { ...(dto as object) } as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(dto, 'cep')) {
      if (dto.cep === undefined) {
        delete out.cep;
      } else if (dto.cep === null || dto.cep === '') {
        out.cep = null;
      } else {
        out.cep = PatientsService.normalizeCep(dto.cep);
      }
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'birthDate')) {
      const raw = dto.birthDate as unknown;
      if (raw === undefined) {
        delete out.birthDate;
      } else if (raw === null || raw === '') {
        out.birthDate = null;
      } else {
        const d = PatientsService.birthDateInputToUtcNoonDate(raw);
        out.birthDate = d ?? null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'sex')) {
      const raw = dto.sex as unknown;
      if (raw === undefined) {
        delete out.sex;
      } else if (raw === null || raw === '') {
        out.sex = null;
      } else {
        out.sex = raw;
      }
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'referralSource')) {
      const raw = dto.referralSource as unknown;
      if (raw === undefined) {
        delete out.referralSource;
      } else if (raw === null || raw === '') {
        out.referralSource = null;
        out.referralSourceOther = null;
      } else {
        out.referralSource = raw;
        if (raw !== 'OTHER') {
          out.referralSourceOther = null;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'referralSourceOther')) {
      const raw = out.referralSourceOther;
      if (raw === undefined) {
        delete out.referralSourceOther;
      } else if (raw === null || raw === '') {
        out.referralSourceOther = null;
      } else {
        const trimmed = String(raw).trim();
        out.referralSourceOther = trimmed || null;
      }
    }

    let touchedAddress = false;
    for (const key of ADDRESS_STRING_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(dto, key)) continue;
      touchedAddress = true;
      const raw = out[key];
      if (raw === undefined) {
        delete out[key];
      } else if (raw === null || raw === '') {
        out[key] = null;
      } else {
        const trimmed = String(raw).trim();
        out[key] = trimmed || null;
      }
    }

    if (touchedAddress || Object.prototype.hasOwnProperty.call(dto, 'address')) {
      const composed = composePatientAddress({
        addressStreet: out.addressStreet as string | null | undefined,
        addressNeighborhood: out.addressNeighborhood as string | null | undefined,
        addressCity: out.addressCity as string | null | undefined,
        addressState: out.addressState as string | null | undefined,
        addressNumber: out.addressNumber as string | null | undefined,
        addressComplement: out.addressComplement as string | null | undefined,
        address: out.address as string | null | undefined,
      });
      out.address = composed ?? null;
    }

    return out;
  }

  /** null = sem CEP; string com 8 dígitos válido; outros formatos ficam sem persistir dígitos */
  private static normalizeCep(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const digits = String(raw).replace(/\D/g, '');
    return digits.length === 8 ? digits : null;
  }

  /**
   * Converte entrada do formulário/API (somente dia civil) em um instante no meio-dia UTC —
   * alinha com seeds e reduz drift de dia em fusos brasileiros.
   */
  private static birthDateInputToUtcNoonDate(value: unknown): Date | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const s = String(value).trim();
    const dayPart = s.split('T')[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayPart);
    if (!m) {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`);
  }

  /**
   * Retorna estatísticas de confiabilidade do paciente baseado no histórico de agendamentos.
   */
  async getReliabilityStats(patientId: string) {
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

    // Score: percentual de agendamentos não-cancelados/faltados dentre os finalizados (COMPLETED + CANCELLED + NO_SHOW)
    const resolved = completed + cancelled + noShow;
    const reliabilityPercent = resolved > 0
      ? Math.round((completed / resolved) * 100)
      : 100; // sem histórico, assume confiável

    return {
      total,
      completed,
      cancelled,
      noShow,
      reliabilityPercent,
    };
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    if (!this.r2.isConfigured) {
      throw new BadRequestException(
        'Cloudflare R2 não está configurado. Não é possível enviar a foto.',
      );
    }
    if (!PATIENT_PHOTO_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Use uma imagem JPEG, PNG ou WebP.');
    }
    if (file.size > PATIENT_PHOTO_MAX_BYTES) {
      throw new BadRequestException('A foto deve ter no máximo 5 MB.');
    }

    const patient = await this.findOne(id);
    if (patient.photoStorageKey) {
      await this.r2.remove(patient.photoStorageKey);
    }

    const ext =
      file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const { key, url } = await this.r2.upload(
      `foto.${ext}`,
      file.mimetype,
      file.buffer,
      `pacientes/${id}`,
    );

    return this.prisma.patient.update({
      where: { id },
      data: { photoStorageKey: key, photoUrl: url },
    });
  }

  async removePhoto(id: string) {
    const patient = await this.findOne(id);
    if (patient.photoStorageKey) {
      await this.r2.remove(patient.photoStorageKey);
    }
    return this.prisma.patient.update({
      where: { id },
      data: { photoStorageKey: null, photoUrl: null },
    });
  }

  async remove(id: string) {
    const patient = await this.findOne(id);
    if (patient.photoStorageKey) {
      await this.r2.remove(patient.photoStorageKey);
    }
    await this.prisma.patient.delete({ where: { id } });
    return { ok: true };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';
import { CreatePackageDto, PackageItemDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import {
  CreatePatientPackageDto,
  UpdatePatientPackageDto,
} from './dto/create-patient-package.dto';

const packageInclude = {
  items: {
    include: { procedure: true },
    orderBy: { sortOrder: 'asc' as const },
  },
};

const patientPackageInclude = {
  package: { include: { items: { include: { procedure: true }, orderBy: { sortOrder: 'asc' as const } } } },
  patient: true,
  appointments: {
    select: { id: true, startAt: true, status: true, procedure: { select: { id: true, name: true } } },
    orderBy: { startAt: 'asc' as const },
  },
};

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── CRUD de Package (template/catálogo) ───

  async list() {
    return this.prisma.package.findMany({
      orderBy: { name: 'asc' },
      include: {
        ...packageInclude,
        _count: { select: { patientPackages: true } },
      },
    });
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        ...packageInclude,
        _count: { select: { patientPackages: true } },
      },
    });
    if (!pkg) throw new NotFoundException('Pacote não encontrado');
    return pkg;
  }

  async create(dto: CreatePackageDto, user?: AuditUser) {
    const { items, ...data } = dto;

    // Calcula sessionCount a partir dos items
    const sessionCount = items.reduce((sum, i) => sum + i.quantity, 0);

    const created = await this.prisma.package.create({
      data: {
        ...data,
        sessionCount,
        items: {
          create: items.map((item, idx) => ({
            procedureId: item.procedureId,
            quantity: item.quantity,
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: packageInclude,
    });
    this.auditLog.logCreate('Package', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);
    return created;
  }

  async update(id: string, dto: UpdatePackageDto, user?: AuditUser) {
    const oldData = await this.findOne(id);
    const { items, ...data } = dto;

    const updated = await this.prisma.$transactionWithRetry(async (tx) => {
      if (items !== undefined) {
        await tx.packageItem.deleteMany({ where: { packageId: id } });
        if (items.length > 0) {
          await tx.packageItem.createMany({
            data: items.map((item: PackageItemDto, idx: number) => ({
              packageId: id,
              procedureId: item.procedureId,
              quantity: item.quantity,
              sortOrder: item.sortOrder ?? idx,
            })),
          });
        }
        // Recalcula sessionCount
        const sessionCount = items.reduce((sum, i) => sum + i.quantity, 0);
        (data as any).sessionCount = sessionCount;
      }

      return tx.package.update({
        where: { id },
        data,
        include: packageInclude,
      });
    });
    this.auditLog.logUpdate('Package', id, oldData as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    return updated;
  }

  async remove(id: string, user?: AuditUser) {
    const pkg = await this.findOne(id);
    // Verifica se há pacotes ativos vinculados a pacientes
    const activeCount = await this.prisma.patientPackage.count({
      where: { packageId: id, status: 'ACTIVE' },
    });
    if (activeCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir: ${activeCount} paciente(s) possui(em) este pacote ativo.`,
      );
    }
    await this.prisma.package.delete({ where: { id } });
    this.auditLog.logDelete('Package', id, pkg as unknown as Record<string, unknown>, user).catch(() => undefined);
    return { ok: true };
  }

  // ─── PatientPackage (venda/vínculo) ───

  async listPatientPackages(patientId?: string) {
    return this.prisma.patientPackage.findMany({
      where: patientId ? { patientId } : undefined,
      orderBy: { purchaseDate: 'desc' },
      include: patientPackageInclude,
    });
  }

  async findPatientPackage(id: string) {
    const pp = await this.prisma.patientPackage.findUnique({
      where: { id },
      include: patientPackageInclude,
    });
    if (!pp) throw new NotFoundException('Pacote do paciente não encontrado');
    return pp;
  }

  async listActiveForPatient(patientId: string) {
    return this.prisma.patientPackage.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: patientPackageInclude,
    });
  }

  async createPatientPackage(dto: CreatePatientPackageDto, user?: AuditUser) {
    const pkg = await this.findOne(dto.packageId);
    const totalPaid = dto.totalPaid ?? this.resolvePackageSalePrice(pkg);

    if (dto.paymentMethodId && totalPaid <= 0) {
      throw new BadRequestException(
        'Informe um valor maior que zero para registrar pagamento antecipado.',
      );
    }

    // Calcular expiração
    let expiresAt: Date | null = null;
    if (pkg.validityDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);
    }

    const result = await this.prisma.$transactionWithRetry(async (tx) => {
      const pp = await tx.patientPackage.create({
        data: {
          patientId: dto.patientId,
          packageId: dto.packageId,
          totalPaid,
          notes: dto.notes,
          sessionsTotal: pkg.sessionCount,
          expiresAt,
        },
      });

      if (dto.paymentMethodId) {
        const patient = await tx.patient.findUnique({ where: { id: dto.patientId } });
        const pm = await tx.paymentMethod.findUnique({ where: { id: dto.paymentMethodId } });
        if (!pm) {
          throw new BadRequestException('Forma de pagamento não encontrada.');
        }

        const feePercent = Number(pm.feePercent);
        const netAmount =
          Math.round(totalPaid * (1 - feePercent / 100) * 100) / 100;

        await tx.financialEntry.create({
          data: {
            type: 'INCOME',
            description: `Pacote - ${pkg.name} - ${patient?.name ?? 'Paciente'}`,
            amount: totalPaid,
            netAmount,
            feePercent,
            paymentMethodId: dto.paymentMethodId,
            category: 'Pacotes',
            paidAt: new Date(),
            patientId: dto.patientId,
            invoiceIssued: false,
          },
        });

        return tx.patientPackage.update({
          where: { id: pp.id },
          data: { financeGenerated: true, paymentMethod: pm.name },
          include: patientPackageInclude,
        });
      }

      return tx.patientPackage.findUniqueOrThrow({
        where: { id: pp.id },
        include: patientPackageInclude,
      });
    });
    this.auditLog.logCreate('PatientPackage', result.id, result as unknown as Record<string, unknown>, user).catch(() => undefined);
    return result;
  }

  /** Preço de venda do catálogo (totalPrice fixo ou soma dos procedimentos com desconto). */
  private resolvePackageSalePrice(pkg: {
    totalPrice: unknown;
    discountPercent: unknown;
    items: { quantity: number; procedure: { price: unknown } }[];
  }): number {
    if (pkg.totalPrice != null) {
      return Number(pkg.totalPrice);
    }
    const sum = pkg.items.reduce(
      (acc, item) => acc + Number(item.procedure.price) * item.quantity,
      0,
    );
    if (pkg.discountPercent != null) {
      return Math.round(sum * (1 - Number(pkg.discountPercent) / 100) * 100) / 100;
    }
    return Math.round(sum * 100) / 100;
  }

  async updatePatientPackage(id: string, dto: UpdatePatientPackageDto, user?: AuditUser) {
    const oldData = await this.findPatientPackage(id);
    const updated = await this.prisma.patientPackage.update({
      where: { id },
      data: dto as any,
      include: patientPackageInclude,
    });
    this.auditLog.logUpdate('PatientPackage', id, oldData as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    return updated;
  }

  // Chamado pelo módulo de appointments ao completar/cancelar agendamento
  async incrementSession(patientPackageId: string) {
    const pp = await this.findPatientPackage(patientPackageId);
    const newUsed = pp.sessionsUsed + 1;
    const isCompleted = newUsed >= pp.sessionsTotal;

    return this.prisma.patientPackage.update({
      where: { id: patientPackageId },
      data: {
        sessionsUsed: newUsed,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      },
    });
  }

  async decrementSession(patientPackageId: string) {
    const pp = await this.findPatientPackage(patientPackageId);
    if (pp.sessionsUsed <= 0) return pp;

    return this.prisma.patientPackage.update({
      where: { id: patientPackageId },
      data: {
        sessionsUsed: pp.sessionsUsed - 1,
        status: 'ACTIVE', // reativa se estava COMPLETED
      },
    });
  }
}

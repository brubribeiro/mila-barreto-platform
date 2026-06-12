import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';
import {
  computeHourlyCostSummary,
  getHourlyCostIncludeVariable,
} from '../common/utils/hourly-cost.util';
import { CreateProcedureDto, ProcedureMaterialDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';

export interface ProcedureFinancials {
  baseCost: number;
  maxFeePercent: number;
  maxFeeCost: number;
  fixedCostShare: number;
  hourlyCost: number;
  totalCost: number;
  profitMargin: number;
}

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  /** Calcula todos os indicadores financeiros de um procedimento. */
  private computeFinancials(
    price: number,
    durationMinutes: number,
    materials: any[],
    maxFeePercent: number,
    hourlyCost: number,
  ): ProcedureFinancials {
    const baseCost = (materials ?? []).reduce(
      (sum, m) => sum + Number(m.item?.costPrice ?? 0) * Number(m.quantity ?? 0),
      0,
    );
    const maxFeeCost = price * (maxFeePercent / 100);
    // Despesa fixa proporcional ao tempo do procedimento
    const fixedCostShare = hourlyCost * (durationMinutes / 60);
    const totalCost = baseCost + maxFeeCost + fixedCostShare;
    const profitMargin = price > 0
      ? Math.round(((price - totalCost) / price) * 10000) / 100
      : 0;
    return {
      baseCost: Math.round(baseCost * 100) / 100,
      maxFeePercent,
      maxFeeCost: Math.round(maxFeeCost * 100) / 100,
      fixedCostShare: Math.round(fixedCostShare * 100) / 100,
      hourlyCost: Math.round(hourlyCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      profitMargin,
    };
  }

  /**
   * Calcula custo/hora = despesas fixas mensais ÷ carga horária mensal
   * da profissional principal (configurada via MAIN_PROFESSIONAL_EMAIL).
   */
  private async getSharedCosts() {
    const maxFee = await this.prisma.paymentMethod.findFirst({
      where: { active: true },
      orderBy: { feePercent: 'desc' },
    });
    const maxFeePercent = maxFee ? Number(maxFee.feePercent) : 0;

    const includeVariable = await getHourlyCostIncludeVariable(this.prisma);
    const summary = await computeHourlyCostSummary(this.prisma, {
      useRecurringCatalog: false,
      includeVariable,
    });

    return { maxFeePercent, hourlyCost: summary.hourlyCost };
  }

  async list() {
    const [items, shared] = await Promise.all([
      this.prisma.procedure.findMany({
        orderBy: { name: 'asc' },
        include: { materials: { include: { item: true } } },
      }),
      this.getSharedCosts(),
    ]);

    return items.map((p) => ({
      ...p,
      ...this.computeFinancials(
        Number(p.price),
        p.durationMinutes,
        p.materials,
        shared.maxFeePercent,
        shared.hourlyCost,
      ),
    }));
  }

  async findOne(id: string) {
    const p = await this.prisma.procedure.findUnique({
      where: { id },
      include: { materials: { include: { item: true } } },
    });
    if (!p) throw new NotFoundException('Procedimento não encontrado');
    const shared = await this.getSharedCosts();
    return {
      ...p,
      ...this.computeFinancials(Number(p.price), p.durationMinutes, p.materials, shared.maxFeePercent, shared.hourlyCost),
    };
  }

  async create(dto: CreateProcedureDto, user?: AuditUser) {
    const { materials, ...data } = dto;
    const created = await this.prisma.procedure.create({
      data: {
        ...data,
        materials: materials?.length
          ? { create: materials.map((m) => ({ itemId: m.itemId, quantity: m.quantity })) }
          : undefined,
      },
      include: { materials: { include: { item: true } } },
    });
    this.auditLog.logCreate('Procedure', created.id, created as unknown as Record<string, unknown>, user).catch(() => undefined);
    const shared = await this.getSharedCosts();
    return {
      ...created,
      ...this.computeFinancials(Number(created.price), created.durationMinutes, created.materials, shared.maxFeePercent, shared.hourlyCost),
    };
  }

  async update(id: string, dto: UpdateProcedureDto, user?: AuditUser) {
    const oldProcedure = await this.findOne(id);
    const { materials, ...data } = dto;

    const updated = await this.prisma.$transactionWithRetry(async (tx) => {
      if (materials !== undefined) {
        await tx.procedureMaterial.deleteMany({ where: { procedureId: id } });
        if (materials.length > 0) {
          await tx.procedureMaterial.createMany({
            data: materials.map((m: ProcedureMaterialDto) => ({
              procedureId: id,
              itemId: m.itemId,
              quantity: m.quantity,
            })),
          });
        }
      }
      return tx.procedure.update({
        where: { id },
        data,
        include: { materials: { include: { item: true } } },
      });
    });
    this.auditLog.logUpdate('Procedure', id, oldProcedure as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, user).catch(() => undefined);
    const shared = await this.getSharedCosts();
    return {
      ...updated,
      ...this.computeFinancials(Number(updated.price), updated.durationMinutes, updated.materials, shared.maxFeePercent, shared.hourlyCost),
    };
  }

  async remove(id: string, user?: AuditUser) {
    const old = await this.findOne(id);
    await this.prisma.procedure.delete({ where: { id } });
    this.auditLog.logDelete('Procedure', id, old as unknown as Record<string, unknown>, user).catch(() => undefined);
    return { ok: true };
  }
}

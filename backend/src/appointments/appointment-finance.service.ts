import { Injectable } from '@nestjs/common';
import { AppointmentStatus, ExpenseType, FinancialType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { MaterialQuantity, resolveRevenuePaidAt } from './appointment.helpers';

type Tx = Prisma.TransactionClient;

export interface CompletionFinanceInput {
  appointmentId: string;
  patientId: string;
  startAt: Date;
  procedureId: string;
  packageId: string | null;
  extraMaterials: MaterialQuantity[];
  referenceMonth?: string;
  paymentMethodId?: string | null;
}

/** Lançamentos financeiros (receita e custo de materiais) gerados ao concluir agendamentos. */
@Injectable()
export class AppointmentFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService: PromotionsService,
  ) {}

  /**
   * Gera receita (com promoção, taxa da forma de pagamento e regra de pacote) e despesa de
   * materiais. Retorna false quando o procedimento não existe (nada é lançado).
   */
  async generateForCompletion(tx: Tx, input: CompletionFinanceInput): Promise<boolean> {
    const { appointmentId, patientId, procedureId, packageId } = input;

    const procedure = await tx.procedure.findUnique({
      where: { id: procedureId },
      include: { materials: { include: { item: true } } },
    });
    const patient = await tx.patient.findUnique({ where: { id: patientId } });
    if (!procedure) return false;

    const patientName = patient?.name ?? 'Paciente';
    let finalAmount = procedure.price;
    let description = `${procedure.name} - ${patientName}`;
    let promotionId: string | null = null;

    const activePromo = await this.promotionsService.findActiveForProcedure(procedureId, new Date());
    if (activePromo) {
      const discounted = this.promotionsService.applyDiscount(
        Number(procedure.price),
        activePromo.discountType,
        Number(activePromo.discountValue),
      );
      finalAmount = new Prisma.Decimal(discounted);
      const discountLabel =
        activePromo.discountType === 'PERCENTAGE'
          ? `${activePromo.discountValue}%`
          : `R$ ${Number(activePromo.discountValue).toFixed(2)}`;
      description += ` (Promoção: ${activePromo.name} -${discountLabel})`;
      promotionId = activePromo.id;
    }

    // Data de competência da receita (mês de referência p/ agendamentos antigos)
    const revenuePaidAt = resolveRevenuePaidAt(input.referenceMonth, input.startAt);

    // Valor líquido calculado sobre o preço do procedimento (antes da troca pelo valor do pacote)
    let netAmount: number | undefined;
    let feePercent: number | undefined;
    const pmId = input.paymentMethodId ?? null;
    if (pmId) {
      const pm = await tx.paymentMethod.findUnique({ where: { id: pmId } });
      if (pm) {
        feePercent = Number(pm.feePercent);
        netAmount = Math.round(Number(finalAmount) * (1 - feePercent / 100) * 100) / 100;
      }
    }

    // Receita do procedimento (pacotes: apenas no primeiro agendamento, com o valor total do pacote)
    const packageRevenue = packageId ? await this.resolvePackageRevenue(tx, packageId) : null;
    if (!packageRevenue?.alreadyGenerated) {
      if (packageRevenue?.patientPackage) {
        finalAmount = packageRevenue.patientPackage.totalPaid;
        description = `Pacote - ${description}`;
      }

      await tx.financialEntry.create({
        data: {
          type: FinancialType.INCOME,
          description,
          amount: finalAmount,
          netAmount,
          feePercent,
          paymentMethodId: pmId,
          category: packageId ? 'Pacotes' : 'Atendimentos',
          paidAt: revenuePaidAt,
          patientId,
          appointmentId,
          invoiceIssued: false,
        },
      });

      if (packageId) await this.markPackageFinanceGenerated(tx, packageId);
    }

    const totalMaterialCost = await this.computeMaterialCost(
      tx,
      procedure.materials,
      input.extraMaterials,
    );
    if (totalMaterialCost > 0) {
      await tx.financialEntry.create({
        data: {
          type: FinancialType.EXPENSE,
          description: `Materiais - ${procedure.name} - ${patientName}`,
          amount: new Prisma.Decimal(Math.round(totalMaterialCost * 100) / 100),
          category: 'Materiais de procedimento',
          expenseType: ExpenseType.VARIABLE,
          paidAt: revenuePaidAt,
          patientId,
          appointmentId,
          invoiceIssued: false,
        },
      });
    }

    if (promotionId) {
      await tx.appointment.update({ where: { id: appointmentId }, data: { promotionId } });
    }

    return true;
  }

  /** Lança receita de agendamentos concluídos que ainda não geraram financeiro. */
  async backfill() {
    const pending = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.COMPLETED,
        financeGenerated: false,
        procedureId: { not: null },
      },
      include: { patient: true, procedure: true },
    });

    if (pending.length === 0) return { created: 0 };

    await this.prisma.$transactionWithRetry(async (tx) => {
      for (const appt of pending) {
        if (!appt.procedure) continue;

        const packageRevenue = appt.patientPackageId
          ? await this.resolvePackageRevenue(tx, appt.patientPackageId)
          : null;

        if (!packageRevenue?.alreadyGenerated) {
          let amount = appt.procedure.price;
          let description = `${appt.procedure.name} - ${appt.patient?.name ?? 'Paciente'}`;
          let category = 'Atendimentos';

          if (packageRevenue?.patientPackage) {
            amount = packageRevenue.patientPackage.totalPaid;
            description = `Pacote - ${description}`;
            category = 'Pacotes';
          }

          await tx.financialEntry.create({
            data: {
              type: FinancialType.INCOME,
              description,
              amount,
              category,
              paymentMethodId: null,
              paidAt: appt.updatedAt ?? appt.startAt,
              patientId: appt.patientId,
              appointmentId: appt.id,
              invoiceIssued: false,
            },
          });

          if (appt.patientPackageId) {
            await this.markPackageFinanceGenerated(tx, appt.patientPackageId);
          }
        }

        await tx.appointment.update({
          where: { id: appt.id },
          data: { financeGenerated: true },
        });
      }
    });

    return { created: pending.length };
  }

  /** Receita de pacote já lançada (pago antecipadamente ou em outro agendamento do pacote)? */
  private async resolvePackageRevenue(tx: Tx, packageId: string) {
    const patientPackage = await tx.patientPackage.findUnique({ where: { id: packageId } });
    if (patientPackage?.financeGenerated) return { alreadyGenerated: true, patientPackage };

    const existing = await tx.financialEntry.findFirst({
      where: { type: FinancialType.INCOME, appointment: { patientPackageId: packageId } },
    });
    return { alreadyGenerated: !!existing, patientPackage };
  }

  private markPackageFinanceGenerated(tx: Tx, packageId: string) {
    return tx.patientPackage.update({
      where: { id: packageId },
      data: { financeGenerated: true },
    });
  }

  /** Custo dos materiais do procedimento e extras (itens sem preço de custo não entram). */
  private async computeMaterialCost(
    tx: Tx,
    procedureMaterials: { quantity: Prisma.Decimal; item: { costPrice: Prisma.Decimal | null } }[],
    extraMaterials: MaterialQuantity[],
  ): Promise<number> {
    const lines = procedureMaterials.map((mat) => ({
      quantity: mat.quantity,
      costPrice: mat.item.costPrice,
    }));

    if (extraMaterials.length > 0) {
      const extraInvItems = await tx.inventoryItem.findMany({
        where: { id: { in: extraMaterials.map((m) => m.itemId) } },
      });
      const costById = new Map(extraInvItems.map((i) => [i.id, i.costPrice]));
      for (const mat of extraMaterials) {
        lines.push({ quantity: mat.quantity, costPrice: costById.get(mat.itemId) ?? null });
      }
    }

    return lines.reduce(
      (total, line) =>
        line.costPrice != null ? total + Number(line.quantity) * Number(line.costPrice) : total,
      0,
    );
  }
}

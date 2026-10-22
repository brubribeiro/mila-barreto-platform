import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';

import { MaterialQuantity } from './appointment.helpers';

type Tx = Prisma.TransactionClient;

/** Baixa e devolução de estoque dos materiais (do procedimento e extras) de um agendamento. */
@Injectable()
export class AppointmentMaterialsService {
  normalizeExtraMaterials(extras?: { itemId: string; quantity: number }[]): MaterialQuantity[] {
    if (!extras?.length) return [];
    const map = new Map<string, number>();
    for (const extra of extras) {
      map.set(extra.itemId, (map.get(extra.itemId) ?? 0) + extra.quantity);
    }
    return [...map.entries()].map(([itemId, quantity]) => ({
      itemId,
      quantity: new Prisma.Decimal(quantity),
    }));
  }

  async deductItems(tx: Tx, items: MaterialQuantity[], reason: string) {
    if (items.length === 0) return;

    const insufficient: string[] = [];
    for (const item of items) {
      const inv = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
      if (!inv) {
        throw new BadRequestException('Item de estoque não encontrado.');
      }
      if (Number(inv.quantity) < Number(item.quantity)) {
        insufficient.push(
          `${inv.name} (necessário ${item.quantity}, disponível ${inv.quantity})`,
        );
      }
    }
    if (insufficient.length > 0) {
      throw new BadRequestException(`Estoque insuficiente: ${insufficient.join('; ')}`);
    }

    for (const item of items) {
      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: { itemId: item.itemId, type: MovementType.OUT, quantity: item.quantity, reason },
      });
    }
  }

  private async returnItems(tx: Tx, items: MaterialQuantity[], reason: string) {
    for (const item of items) {
      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: { itemId: item.itemId, type: MovementType.IN, quantity: item.quantity, reason },
      });
    }
  }

  async deductProcedureMaterials(tx: Tx, procedureId: string, reason: string) {
    const materials = await tx.procedureMaterial.findMany({ where: { procedureId } });
    await this.deductItems(tx, materials, reason);
  }

  private async returnProcedureMaterials(tx: Tx, procedureId: string, reason: string) {
    const materials = await tx.procedureMaterial.findMany({ where: { procedureId } });
    await this.returnItems(tx, materials, reason);
  }

  /** Devolve materiais do procedimento e extras já baixados de um agendamento. */
  async returnAllForAppointment(
    tx: Tx,
    appt: { id: string; procedureId: string | null },
    procedureReason: string,
    extrasReason: string,
  ) {
    if (appt.procedureId) {
      await this.returnProcedureMaterials(tx, appt.procedureId, procedureReason);
    }
    const extras = await tx.appointmentMaterial.findMany({ where: { appointmentId: appt.id } });
    await this.returnItems(tx, extras, extrasReason);
  }

  async replaceExtraMaterialRecords(tx: Tx, appointmentId: string, items: MaterialQuantity[]) {
    await tx.appointmentMaterial.deleteMany({ where: { appointmentId } });
    if (items.length === 0) return;
    await tx.appointmentMaterial.createMany({
      data: items.map((item) => ({
        appointmentId,
        itemId: item.itemId,
        quantity: item.quantity,
      })),
    });
  }

  /**
   * Ajusta o estoque na edição: devolve ao desativar, troca ao mudar de procedimento,
   * baixa ao reativar, e aplica a diferença dos extras quando eles mudam.
   */
  async syncOnUpdate(
    tx: Tx,
    before: {
      id: string;
      procedureId: string | null;
      materialsDeducted: boolean;
      extraMaterials: MaterialQuantity[];
    },
    next: {
      procedureId: string | null;
      willBeActive: boolean;
      willDeduct: boolean;
      extraItems?: MaterialQuantity[];
    },
  ) {
    const { procedureId: newProcedureId, willBeActive, willDeduct, extraItems } = next;
    const procedureChanged = before.procedureId !== newProcedureId;

    if (before.materialsDeducted && !willBeActive) {
      await this.returnAllForAppointment(
        tx,
        before,
        'Devolução por cancelamento/no-show',
        'Devolução de materiais extras por cancelamento/no-show',
      );
    } else if (before.materialsDeducted && willBeActive && procedureChanged) {
      if (before.procedureId) {
        await this.returnProcedureMaterials(tx, before.procedureId, 'Devolução por troca de procedimento');
      }
      if (newProcedureId) {
        await this.deductProcedureMaterials(tx, newProcedureId, 'Materiais do agendamento (novo procedimento)');
      }
    } else if (!before.materialsDeducted && willDeduct && newProcedureId) {
      await this.deductProcedureMaterials(tx, newProcedureId, 'Materiais do agendamento (reativado)');
    }

    if (extraItems !== undefined) {
      if (before.materialsDeducted && willBeActive) {
        await this.applyExtraMaterialsStockDiff(tx, before.extraMaterials, extraItems);
      }
      await this.replaceExtraMaterialRecords(tx, before.id, extraItems);
      if (!before.materialsDeducted && willBeActive && extraItems.length > 0) {
        await this.deductItems(tx, extraItems, 'Materiais extras do agendamento (reativado)');
      }
    } else if (!before.materialsDeducted && willBeActive && before.extraMaterials.length > 0) {
      await this.deductItems(tx, before.extraMaterials, 'Materiais extras do agendamento (reativado)');
    }
  }

  private async applyExtraMaterialsStockDiff(
    tx: Tx,
    before: MaterialQuantity[],
    after: MaterialQuantity[],
  ) {
    const oldMap = new Map(before.map((item) => [item.itemId, Number(item.quantity)]));
    const newMap = new Map(after.map((item) => [item.itemId, Number(item.quantity)]));
    const toReturn: MaterialQuantity[] = [];
    const toDeduct: MaterialQuantity[] = [];
    const entry = (itemId: string, quantity: number) => ({
      itemId,
      quantity: new Prisma.Decimal(quantity),
    });

    for (const [itemId, oldQty] of oldMap) {
      const newQty = newMap.get(itemId) ?? 0;
      if (newQty < oldQty) {
        toReturn.push(entry(itemId, oldQty - newQty));
      } else if (newQty > oldQty) {
        toDeduct.push(entry(itemId, newQty - oldQty));
      }
    }
    for (const [itemId, newQty] of newMap) {
      if (!oldMap.has(itemId)) {
        toDeduct.push(entry(itemId, newQty));
      }
    }

    if (toReturn.length > 0) {
      await this.returnItems(tx, toReturn, 'Devolução de material extra do agendamento');
    }
    if (toDeduct.length > 0) {
      await this.deductItems(tx, toDeduct, 'Material extra do agendamento');
    }
  }
}

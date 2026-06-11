import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  AppointmentStatus,
  AppointmentKind,
  ExpenseType,
  MovementType,
  NotificationType,
  FinancialType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditLogService, AuditUser } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { PackagesService } from '../packages/packages.service';
import { PromotionsService } from '../promotions/promotions.service';
import {
  computeEarliestRecurrenceDate,
  isBeforeRecurrenceEarliest,
  toDateInputValue,
} from './recurrence.util';

function isActive(status: AppointmentStatus) {
  return (
    status === AppointmentStatus.SCHEDULED ||
    status === AppointmentStatus.CONFIRMED ||
    status === AppointmentStatus.IN_PROGRESS ||
    status === AppointmentStatus.COMPLETED
  );
}

/** Procedimento só é exigido para kind = PROCEDURE. AVAL e RETURN ficam livres. */
function requiresProcedure(kind: AppointmentKind | null | undefined) {
  return !kind || kind === AppointmentKind.PROCEDURE;
}

const APPOINTMENT_KIND_LABEL: Record<AppointmentKind, string> = {
  [AppointmentKind.EVALUATION]: 'Avaliação',
  [AppointmentKind.PROCEDURE]: 'Procedimento',
  [AppointmentKind.RETURN]: 'Retorno',
};

function formatAppointmentDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function appointmentServiceLabel(appt: {
  procedure?: { name: string } | null;
  kind: AppointmentKind;
}): string {
  return appt.procedure?.name ?? APPOINTMENT_KIND_LABEL[appt.kind] ?? appt.kind;
}

type MaterialQuantity = { itemId: string; quantity: Prisma.Decimal };

const appointmentRelationsInclude = {
  patient: true,
  procedure: true,
  professional: { select: { id: true, name: true } },
  extraMaterials: { include: { item: true } },
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly availability: AvailabilityService,
    private readonly packagesService: PackagesService,
    private readonly promotionsService: PromotionsService,
    private readonly auditLog: AuditLogService,
  ) {}

  list(from?: string, to?: string, professionalId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        ...(professionalId ? { professionalId } : {}),
        startAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: appointmentRelationsInclude,
      orderBy: { startAt: 'asc' },
    });
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        procedure: true,
        professional: true,
        extraMaterials: { include: { item: true } },
      },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    if (user?.restrictToOwnAppointments && appt.professionalId !== user.id) {
      throw new ForbiddenException('Você não tem acesso a este agendamento.');
    }
    return appt;
  }

  /**
   * Valida se o profissional está disponível no intervalo:
   * - Não pode cair dentro de uma indisponibilidade
   * - Deve cair dentro do horário semanal (se houver algum configurado)
   * - excludeId: agendamento sendo editado (não considera ele próprio como conflito)
   */
  private async checkAvailability(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ) {
    const professional = await this.prisma.user.findUnique({
      where: { id: professionalId },
      select: { active: true, providesAppointments: true },
    });
    if (!professional?.active || !professional.providesAppointments) {
      throw new BadRequestException('Este usuário não realiza atendimentos.');
    }

    await this.availability.checkProfessionalSlot(professionalId, startAt, endAt, excludeId);
  }

  async getRecurrenceLimit(patientId: string, procedureId: string, excludeAppointmentId?: string) {
    const empty = {
      earliestDate: null as string | null,
      recurrenceDays: null as number | null,
      lastCompletedAt: null as string | null,
    };

    if (!patientId || !procedureId) return empty;

    const procedure = await this.prisma.procedure.findUnique({
      where: { id: procedureId },
      select: { recurrenceDays: true },
    });
    if (!procedure?.recurrenceDays || procedure.recurrenceDays <= 0) return empty;

    const lastCompleted = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        procedureId,
        status: AppointmentStatus.COMPLETED,
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      orderBy: { startAt: 'desc' },
    });

    if (!lastCompleted) {
      return { ...empty, recurrenceDays: procedure.recurrenceDays };
    }

    const earliest = computeEarliestRecurrenceDate(lastCompleted.startAt, procedure.recurrenceDays);
    return {
      earliestDate: toDateInputValue(earliest),
      recurrenceDays: procedure.recurrenceDays,
      lastCompletedAt: lastCompleted.startAt.toISOString(),
    };
  }

  private async assertRecurrenceInterval(
    patientId: string,
    procedureId: string,
    startAt: Date,
    excludeAppointmentId?: string,
  ) {
    const limit = await this.getRecurrenceLimit(patientId, procedureId, excludeAppointmentId);
    if (!limit.earliestDate || !limit.recurrenceDays) return;

    const earliest = computeEarliestRecurrenceDate(
      new Date(limit.lastCompletedAt!),
      limit.recurrenceDays,
    );

    if (isBeforeRecurrenceEarliest(startAt, earliest)) {
      throw new BadRequestException(
        `Intervalo de retorno: agende a partir de ${earliest.toLocaleDateString('pt-BR')} (${limit.recurrenceDays} dias após o último atendimento concluído).`,
      );
    }
  }

  private normalizeExtraMaterials(
    extras?: { itemId: string; quantity: number }[],
  ): MaterialQuantity[] {
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

  private async deductMaterialItems(
    tx: Prisma.TransactionClient,
    items: MaterialQuantity[],
    reason: string,
  ) {
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

  private async returnMaterialItems(
    tx: Prisma.TransactionClient,
    items: MaterialQuantity[],
    reason: string,
  ) {
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

  private async deductMaterials(
    tx: Prisma.TransactionClient,
    procedureId: string,
    reason: string,
  ) {
    const materials = await tx.procedureMaterial.findMany({ where: { procedureId } });
    await this.deductMaterialItems(
      tx,
      materials.map(({ itemId, quantity }) => ({ itemId, quantity })),
      reason,
    );
  }

  private async assertCreateReferences(dto: CreateAppointmentDto, kind: AppointmentKind) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new BadRequestException('Paciente não encontrado.');
    }

    const professional = await this.prisma.user.findUnique({
      where: { id: dto.professionalId },
      select: { id: true },
    });
    if (!professional) {
      throw new BadRequestException('Profissional não encontrado.');
    }

    if (!dto.procedureId) return;

    const procedure = await this.prisma.procedure.findUnique({
      where: { id: dto.procedureId },
      select: { id: true, active: true },
    });
    if (!procedure) {
      throw new BadRequestException('Procedimento não encontrado.');
    }
    if (requiresProcedure(kind) && !procedure.active) {
      throw new BadRequestException('Procedimento inativo.');
    }
  }

  private async returnMaterials(
    tx: Prisma.TransactionClient,
    procedureId: string,
    reason: string,
  ) {
    const materials = await tx.procedureMaterial.findMany({ where: { procedureId } });
    await this.returnMaterialItems(tx, materials, reason);
  }

  private async returnExtraMaterialsForAppointment(
    tx: Prisma.TransactionClient,
    appointmentId: string,
    reason: string,
  ) {
    const extras = await tx.appointmentMaterial.findMany({ where: { appointmentId } });
    await this.returnMaterialItems(tx, extras, reason);
  }

  private async replaceExtraMaterialRecords(
    tx: Prisma.TransactionClient,
    appointmentId: string,
    items: MaterialQuantity[],
  ) {
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

  private async applyExtraMaterialsStockDiff(
    tx: Prisma.TransactionClient,
    before: MaterialQuantity[],
    after: MaterialQuantity[],
  ) {
    const oldMap = new Map(before.map((item) => [item.itemId, Number(item.quantity)]));
    const newMap = new Map(after.map((item) => [item.itemId, Number(item.quantity)]));
    const toReturn: { itemId: string; quantity: number }[] = [];
    const toDeduct: { itemId: string; quantity: number }[] = [];

    for (const [itemId, oldQty] of oldMap) {
      const newQty = newMap.get(itemId) ?? 0;
      if (newQty < oldQty) {
        toReturn.push({ itemId, quantity: oldQty - newQty });
      } else if (newQty > oldQty) {
        toDeduct.push({ itemId, quantity: newQty - oldQty });
      }
    }
    for (const [itemId, newQty] of newMap) {
      if (!oldMap.has(itemId)) {
        toDeduct.push({ itemId, quantity: newQty });
      }
    }

    if (toReturn.length > 0) {
      await this.returnMaterialItems(
        tx,
        toReturn.map((item) => ({ itemId: item.itemId, quantity: new Prisma.Decimal(item.quantity) })),
        'Devolução de material extra do agendamento',
      );
    }
    if (toDeduct.length > 0) {
      await this.deductMaterialItems(
        tx,
        toDeduct.map((item) => ({ itemId: item.itemId, quantity: new Prisma.Decimal(item.quantity) })),
        'Material extra do agendamento',
      );
    }
  }

  async create(dto: CreateAppointmentDto, user?: AuditUser) {
    const kind = dto.kind ?? AppointmentKind.PROCEDURE;
    if (requiresProcedure(kind) && !dto.procedureId) {
      throw new BadRequestException('Procedimento é obrigatório para agendamentos do tipo PROCEDURE.');
    }

    await this.assertCreateReferences(dto, kind);

    // Validação de disponibilidade (working hours + indisponibilidade + conflitos)
    await this.checkAvailability(
      dto.professionalId,
      new Date(dto.startAt),
      new Date(dto.endAt),
    );

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (dto.procedureId) {
      await this.assertRecurrenceInterval(dto.patientId, dto.procedureId, startAt);
    }

    if (dto.patientPackageId) {
      const patientPkg = await this.prisma.patientPackage.findFirst({
        where: { id: dto.patientPackageId, patientId: dto.patientId },
      });
      if (!patientPkg) {
        throw new BadRequestException('Pacote selecionado não pertence a este paciente ou não existe.');
      }
    }

    const appt = await this.prisma.$transaction(async (tx) => {
      await this.availability.assertNoAppointmentConflict(
        dto.professionalId,
        startAt,
        endAt,
        undefined,
        tx,
      );

      const status = dto.status ?? AppointmentStatus.SCHEDULED;
      const extraItems = this.normalizeExtraMaterials(dto.extraMaterials);
      const willDeduct = isActive(status) && (!!dto.procedureId || extraItems.length > 0);

      if (willDeduct && dto.procedureId) {
        await this.deductMaterials(tx, dto.procedureId, 'Materiais do agendamento');
      }
      if (willDeduct && extraItems.length > 0) {
        await this.deductMaterialItems(tx, extraItems, 'Materiais extras do agendamento');
      }

      const created = await tx.appointment.create({
        data: {
          patientId: dto.patientId,
          procedureId: dto.procedureId ?? null,
          professionalId: dto.professionalId,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          status,
          kind,
          notes: dto.notes,
          clinicalNotes: dto.clinicalNotes,
          materialsDeducted: willDeduct,
          patientPackageId: dto.patientPackageId ?? null,
        },
        include: appointmentRelationsInclude,
      });

      if (extraItems.length > 0) {
        await this.replaceExtraMaterialRecords(tx, created.id, extraItems);
      }

      return created;
    });

    this.notifications
      .notify({
        userId: appt.professionalId,
        type: NotificationType.APPOINTMENT_CREATED,
        title: 'Novo agendamento',
        message: `${appt.patient.name} - ${appointmentServiceLabel(appt)} em ${formatAppointmentDateTime(
          new Date(appt.startAt),
        )}`,
        link: '/agenda',
        metadata: { appointmentId: appt.id },
      })
      .catch(() => undefined);

    this.auditLog.logCreate('Appointment', appt.id, appt as unknown as Record<string, unknown>, user).catch(() => undefined);

    return appt;
  }

  async update(id: string, dto: UpdateAppointmentDto, user?: AuthenticatedUser) {
    const wasCancelledRequested = dto.status === AppointmentStatus.CANCELLED;

    // Quando há mudança de horário/profissional, valida disponibilidade
    if (dto.startAt || dto.endAt || dto.professionalId) {
      const current = await this.prisma.appointment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Agendamento não encontrado');
      const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
      const endAt = dto.endAt ? new Date(dto.endAt) : current.endAt;
      const professionalId = dto.professionalId ?? current.professionalId;
      await this.checkAvailability(professionalId, startAt, endAt, id);
    }

    const currentForRecurrence = await this.prisma.appointment.findUnique({ where: { id } });
    if (!currentForRecurrence) throw new NotFoundException('Agendamento não encontrado');

    const recurrencePatientId = dto.patientId ?? currentForRecurrence.patientId;
    const recurrenceProcedureId =
      dto.procedureId === undefined ? currentForRecurrence.procedureId : dto.procedureId;
    const recurrenceStartAt = dto.startAt
      ? new Date(dto.startAt)
      : currentForRecurrence.startAt;

    if (recurrenceProcedureId) {
      await this.assertRecurrenceInterval(
        recurrencePatientId,
        recurrenceProcedureId,
        recurrenceStartAt,
        id,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.appointment.findUnique({
        where: { id },
        include: { extraMaterials: true },
      });
      if (!before) throw new NotFoundException('Agendamento não encontrado');

      if (user?.restrictToOwnAppointments) {
        if (before.professionalId !== user.id) {
          throw new ForbiddenException('Você não tem acesso a este agendamento.');
        }
        const forbiddenFields = ['patientId', 'procedureId', 'professionalId', 'startAt', 'endAt'];
        if (forbiddenFields.some((f) => (dto as any)[f] !== undefined)) {
          throw new ForbiddenException(
            'Seu grupo só permite atualizar o status e as observações do agendamento.',
          );
        }
      }

      if (dto.startAt || dto.endAt || dto.professionalId) {
        const startAt = dto.startAt ? new Date(dto.startAt) : before.startAt;
        const endAt = dto.endAt ? new Date(dto.endAt) : before.endAt;
        const professionalId = dto.professionalId ?? before.professionalId;
        await this.availability.assertNoAppointmentConflict(
          professionalId,
          startAt,
          endAt,
          id,
          tx,
        );
      }

      const newStatus = dto.status ?? before.status;
      const newProcedureId = dto.procedureId ?? before.procedureId;
      const newKind = dto.kind ?? before.kind;
      const willBeActive = isActive(newStatus);
      const procedureChanged = before.procedureId !== newProcedureId;
      const extraItems =
        dto.extraMaterials !== undefined
          ? this.normalizeExtraMaterials(dto.extraMaterials)
          : undefined;
      const willHaveExtras =
        extraItems !== undefined ? extraItems.length > 0 : before.extraMaterials.length > 0;
      const willDeduct = willBeActive && (!!newProcedureId || willHaveExtras);

      if (requiresProcedure(newKind) && !newProcedureId) {
        throw new BadRequestException('Procedimento é obrigatório para agendamentos do tipo PROCEDURE.');
      }

      if (before.materialsDeducted && !willBeActive) {
        if (before.procedureId) {
          await this.returnMaterials(tx, before.procedureId, 'Devolução por cancelamento/no-show');
        }
        await this.returnExtraMaterialsForAppointment(
          tx,
          before.id,
          'Devolução de materiais extras por cancelamento/no-show',
        );
      } else if (before.materialsDeducted && willBeActive && procedureChanged) {
        if (before.procedureId) {
          await this.returnMaterials(tx, before.procedureId, 'Devolução por troca de procedimento');
        }
        if (newProcedureId) {
          await this.deductMaterials(tx, newProcedureId, 'Materiais do agendamento (novo procedimento)');
        }
      } else if (!before.materialsDeducted && willDeduct) {
        if (newProcedureId) {
          await this.deductMaterials(
            tx,
            newProcedureId,
            'Materiais do agendamento (reativado)',
          );
        }
      }

      if (extraItems !== undefined) {
        if (before.materialsDeducted && willBeActive) {
          await this.applyExtraMaterialsStockDiff(tx, before.extraMaterials, extraItems);
        }
        await this.replaceExtraMaterialRecords(tx, id, extraItems);
        if (!before.materialsDeducted && willBeActive && extraItems.length > 0) {
          await this.deductMaterialItems(
            tx,
            extraItems,
            'Materiais extras do agendamento (reativado)',
          );
        }
      } else if (!before.materialsDeducted && willBeActive && before.extraMaterials.length > 0) {
        await this.deductMaterialItems(
          tx,
          before.extraMaterials,
          'Materiais extras do agendamento (reativado)',
        );
      }

      // Geração automática de lançamento financeiro quando completa
      const willBeCompleted = newStatus === AppointmentStatus.COMPLETED;
      let financeGenerated = before.financeGenerated;

      // Se pertence a um pacote, verificar se a receita já foi lançada
      const packageId = dto.patientPackageId ?? before.patientPackageId;
      let skipPackageRevenue = false;
      if (packageId) {
        const patientPkg = await tx.patientPackage.findUnique({
          where: { id: packageId },
        });
        if (patientPkg?.financeGenerated) {
          skipPackageRevenue = true;
        } else {
          const existingPackageRevenue = await tx.financialEntry.findFirst({
            where: {
              type: 'INCOME',
              appointment: { patientPackageId: packageId },
            },
          });
          if (existingPackageRevenue) {
            skipPackageRevenue = true;
          }
        }
      }

      if (
        willBeCompleted &&
        !before.financeGenerated &&
        newProcedureId
      ) {
        const procedure = await tx.procedure.findUnique({
          where: { id: newProcedureId },
          include: { materials: { include: { item: true } } },
        });
        const patient = await tx.patient.findUnique({ where: { id: before.patientId } });
        if (procedure) {
          let finalAmount = procedure.price;
          let description = `${procedure.name} - ${patient?.name ?? 'Paciente'}`;
          let promotionId: string | null = null;

          // Verificar promoção ativa para o procedimento
          const activePromo = await this.promotionsService.findActiveForProcedure(
            newProcedureId,
            new Date(),
          );
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

          // Calcular valor líquido se forma de pagamento informada
          let netAmount: number | undefined;
          let feePercent: number | undefined;
          const pmId = dto.paymentMethodId ?? null;

          if (pmId) {
            const pm = await tx.paymentMethod.findUnique({ where: { id: pmId } });
            if (pm) {
              feePercent = Number(pm.feePercent);
              netAmount = Math.round(Number(finalAmount) * (1 - feePercent / 100) * 100) / 100;
            }
          }

          // Receita do procedimento (pacotes: apenas no primeiro agendamento)
          if (!skipPackageRevenue) {
            // Se é pacote, usar valor total do pacote em vez do procedimento individual
            if (packageId) {
              const patientPkg = await tx.patientPackage.findUnique({
                where: { id: packageId },
              });
              if (patientPkg) {
                finalAmount = patientPkg.totalPaid as any;
                description = `Pacote - ${description}`;
              }
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
                paidAt: new Date(),
                patientId: before.patientId,
                appointmentId: id,
                invoiceIssued: false,
              },
            });

            if (packageId) {
              await tx.patientPackage.update({
                where: { id: packageId },
                data: { financeGenerated: true },
              });
            }
          }

          // Despesa com custo dos materiais utilizados
          const extraMats = extraItems !== undefined
            ? extraItems
            : before.extraMaterials.map((m) => ({ itemId: m.itemId, quantity: m.quantity }));

          let totalMaterialCost = 0;
          const costDetails: string[] = [];

          // Materiais do procedimento
          for (const mat of procedure.materials) {
            if (mat.item.costPrice != null) {
              const cost = Number(mat.quantity) * Number(mat.item.costPrice);
              totalMaterialCost += cost;
              costDetails.push(`${mat.item.name}: ${Number(mat.quantity)} x R$${Number(mat.item.costPrice).toFixed(2)}`);
            }
          }

          // Materiais extras do agendamento
          if (extraMats.length > 0) {
            const extraItemIds = extraMats.map((m) => m.itemId);
            const extraInvItems = await tx.inventoryItem.findMany({
              where: { id: { in: extraItemIds } },
            });
            const extraMap = new Map(extraInvItems.map((i) => [i.id, i]));
            for (const mat of extraMats) {
              const inv = extraMap.get(mat.itemId);
              if (inv?.costPrice != null) {
                const cost = Number(mat.quantity) * Number(inv.costPrice);
                totalMaterialCost += cost;
                costDetails.push(`${inv.name}: ${Number(mat.quantity)} x R$${Number(inv.costPrice).toFixed(2)}`);
              }
            }
          }

          if (totalMaterialCost > 0) {
            await tx.financialEntry.create({
              data: {
                type: FinancialType.EXPENSE,
                description: `Materiais - ${procedure.name} - ${patient?.name ?? 'Paciente'}`,
                amount: new Prisma.Decimal(Math.round(totalMaterialCost * 100) / 100),
                category: 'Materiais de procedimento',
                expenseType: ExpenseType.VARIABLE,
                paidAt: new Date(),
                patientId: before.patientId,
                appointmentId: id,
                invoiceIssued: false,
              },
            });
          }

          // Vincular promoção ao agendamento
          if (promotionId) {
            await tx.appointment.update({
              where: { id },
              data: { promotionId },
            });
          }

          financeGenerated = true;
        }
      }

      // Controle de sessões de pacote
      if (packageId) {
        const wasCompleted = before.status === AppointmentStatus.COMPLETED;
        const nowCompleted = newStatus === AppointmentStatus.COMPLETED;
        if (!wasCompleted && nowCompleted) {
          await this.packagesService.incrementSession(packageId);
        } else if (wasCompleted && !nowCompleted) {
          await this.packagesService.decrementSession(packageId);
        }
      }

      return tx.appointment.update({
        where: { id },
        data: {
          patientId: dto.patientId,
          procedureId: dto.procedureId === undefined ? undefined : dto.procedureId ?? null,
          professionalId: dto.professionalId,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          status: dto.status,
          kind: dto.kind,
          notes: dto.notes,
          clinicalNotes: dto.clinicalNotes,
          materialsDeducted: willDeduct,
          financeGenerated,
          patientPackageId: dto.patientPackageId === undefined ? undefined : dto.patientPackageId ?? null,
        },
        include: appointmentRelationsInclude,
      });
    });

    this.auditLog.logUpdate('Appointment', id, currentForRecurrence as unknown as Record<string, unknown>, result as unknown as Record<string, unknown>, user).catch(() => undefined);

    if (wasCancelledRequested) {
      this.notifications
        .notify({
          userId: result.professionalId,
          type: NotificationType.APPOINTMENT_CANCELLED,
          title: 'Agendamento cancelado',
          message: `${result.patient.name} - ${appointmentServiceLabel(result)}`,
          link: '/agenda',
          metadata: { appointmentId: result.id },
        })
        .catch(() => undefined);
    }

    return result;
  }

  async backfillFinance() {
    const pending = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.COMPLETED,
        financeGenerated: false,
        procedureId: { not: null },
      },
      include: { patient: true, procedure: true },
    });

    if (pending.length === 0) return { created: 0 };

    await this.prisma.$transaction(async (tx) => {
      for (const appt of pending) {
        if (!appt.procedure) continue;

        // Pacotes: pular receita se já foi pago antecipadamente ou em outro agendamento
        let skip = false;
        if (appt.patientPackageId) {
          const patientPkg = await tx.patientPackage.findUnique({
            where: { id: appt.patientPackageId },
          });
          if (patientPkg?.financeGenerated) {
            skip = true;
          } else {
            const existing = await tx.financialEntry.findFirst({
              where: {
                type: 'INCOME',
                appointment: { patientPackageId: appt.patientPackageId },
              },
            });
            if (existing) skip = true;
          }
        }

        if (!skip) {
          let amount = appt.procedure.price;
          let description = `${appt.procedure.name} - ${appt.patient?.name ?? 'Paciente'}`;
          let category = 'Atendimentos';

          // Se é pacote, usar valor total pago
          if (appt.patientPackageId) {
            const patientPkg = await tx.patientPackage.findUnique({
              where: { id: appt.patientPackageId },
            });
            if (patientPkg) {
              amount = patientPkg.totalPaid as any;
              description = `Pacote - ${description}`;
              category = 'Pacotes';
            }
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
            await tx.patientPackage.update({
              where: { id: appt.patientPackageId },
              data: { financeGenerated: true },
            });
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

  /** Inicia o atendimento: marca startedAt e muda status para IN_PROGRESS */
  async start(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');

    if (
      appt.status !== AppointmentStatus.SCHEDULED &&
      appt.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Só é possível iniciar atendimentos com status Agendado ou Confirmado.',
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: appointmentRelationsInclude,
    });
  }

  /** Finaliza o atendimento: marca finishedAt. A conclusão completa (COMPLETED) continua pelo update normal. */
  async finish(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');

    if (appt.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Só é possível finalizar atendimentos com status Em Atendimento.',
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        finishedAt: new Date(),
      },
      include: appointmentRelationsInclude,
    });
  }

  /** Retoma o atendimento: limpa finishedAt para continuar o cronômetro */
  async resume(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');

    if (appt.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Só é possível retomar atendimentos com status Em Atendimento.',
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { finishedAt: null },
      include: appointmentRelationsInclude,
    });
  }

  async remove(id: string, user?: AuditUser) {
    const oldData = await this.prisma.appointment.findUnique({ where: { id } });

    const result = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({ where: { id } });
      if (!appt) throw new NotFoundException('Agendamento não encontrado');

      if (appt.materialsDeducted) {
        if (appt.procedureId) {
          await this.returnMaterials(
            tx,
            appt.procedureId,
            'Devolução por exclusão do agendamento',
          );
        }
        await this.returnExtraMaterialsForAppointment(
          tx,
          appt.id,
          'Devolução de materiais extras por exclusão do agendamento',
        );
      }

      // Devolver sessão do pacote se o agendamento já tinha sido concluído
      if (appt.patientPackageId && appt.status === AppointmentStatus.COMPLETED) {
        await this.packagesService.decrementSession(appt.patientPackageId);
      }

      await tx.appointment.delete({ where: { id } });
      return { ok: true };
    });

    if (oldData) {
      this.auditLog.logDelete('Appointment', id, oldData as unknown as Record<string, unknown>, user).catch(() => undefined);
    }

    return result;
  }
}

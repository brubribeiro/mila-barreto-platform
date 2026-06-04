import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { parseDateOnlyToUtcNoon } from '../common/utils/date-only.util';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    procedures: { include: { procedure: { select: { id: true, name: true, price: true } } } },
    packages: { include: { package: { select: { id: true, name: true, totalPrice: true } } } },
    _count: { select: { appointments: true } },
  } as const;

  list() {
    return this.prisma.promotion.findMany({
      include: this.defaultInclude,
      orderBy: { startAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    if (!promo) throw new NotFoundException('Promoção não encontrada');
    return promo;
  }

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        commemorativeDate: dto.commemorativeDate,
        startAt: parseDateOnlyToUtcNoon(dto.startAt)!,
        endAt: parseDateOnlyToUtcNoon(dto.endAt)!,
        discountType: dto.discountType as DiscountType,
        discountValue: dto.discountValue,
        active: dto.active ?? true,
        procedures: dto.procedureIds?.length
          ? { create: dto.procedureIds.map((procedureId) => ({ procedureId })) }
          : undefined,
        packages: dto.packageIds?.length
          ? { create: dto.packageIds.map((packageId) => ({ packageId })) }
          : undefined,
      },
      include: this.defaultInclude,
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promoção não encontrada');

    return this.prisma.$transaction(async (tx) => {
      // Atualizar vínculos com procedimentos
      if (dto.procedureIds !== undefined) {
        await tx.promotionProcedure.deleteMany({ where: { promotionId: id } });
        if (dto.procedureIds.length > 0) {
          await tx.promotionProcedure.createMany({
            data: dto.procedureIds.map((procedureId) => ({ promotionId: id, procedureId })),
          });
        }
      }

      // Atualizar vínculos com pacotes
      if (dto.packageIds !== undefined) {
        await tx.promotionPackage.deleteMany({ where: { promotionId: id } });
        if (dto.packageIds.length > 0) {
          await tx.promotionPackage.createMany({
            data: dto.packageIds.map((packageId) => ({ promotionId: id, packageId })),
          });
        }
      }

      return tx.promotion.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          commemorativeDate: dto.commemorativeDate,
          startAt: dto.startAt !== undefined ? parseDateOnlyToUtcNoon(dto.startAt) : undefined,
          endAt: dto.endAt !== undefined ? parseDateOnlyToUtcNoon(dto.endAt) : undefined,
          discountType: dto.discountType as DiscountType | undefined,
          discountValue: dto.discountValue,
          active: dto.active,
        },
        include: this.defaultInclude,
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promoção não encontrada');
    await this.prisma.promotion.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Busca promoção ativa para um procedimento em uma determinada data.
   * Retorna a promoção com maior desconto se houver múltiplas.
   */
  async findActiveForProcedure(procedureId: string, date: Date) {
    const promos = await this.prisma.promotion.findMany({
      where: {
        active: true,
        startAt: { lte: date },
        endAt: { gte: date },
        procedures: { some: { procedureId } },
      },
      orderBy: { discountValue: 'desc' },
      take: 1,
    });
    return promos[0] ?? null;
  }

  /**
   * Calcula o valor com desconto aplicado.
   */
  applyDiscount(
    originalPrice: number,
    discountType: DiscountType,
    discountValue: number,
  ): number {
    if (discountType === DiscountType.PERCENTAGE) {
      return Math.round(originalPrice * (1 - discountValue / 100) * 100) / 100;
    }
    return Math.max(0, Math.round((originalPrice - discountValue) * 100) / 100);
  }
}

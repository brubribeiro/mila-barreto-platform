import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.paymentMethod.findMany({
      include: { _count: { select: { financialEntries: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const pm = await this.prisma.paymentMethod.findUnique({
      where: { id },
      include: { _count: { select: { financialEntries: true } } },
    });
    if (!pm) throw new NotFoundException('Forma de pagamento não encontrada');
    return pm;
  }

  create(dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: {
        name: dto.name,
        feePercent: dto.feePercent ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    const existing = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Forma de pagamento não encontrada');
    return this.prisma.paymentMethod.update({
      where: { id },
      data: {
        name: dto.name,
        feePercent: dto.feePercent,
        active: dto.active,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id },
      include: { _count: { select: { financialEntries: true } } },
    });
    if (!existing) throw new NotFoundException('Forma de pagamento não encontrada');
    if (existing._count.financialEntries > 0) {
      // Não exclui, apenas desativa
      return this.prisma.paymentMethod.update({
        where: { id },
        data: { active: false },
      });
    }
    await this.prisma.paymentMethod.delete({ where: { id } });
    return { ok: true };
  }
}

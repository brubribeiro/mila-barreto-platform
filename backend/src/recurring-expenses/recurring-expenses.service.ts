import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeHourlyCostSummary } from '../common/utils/hourly-cost.util';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';

@Injectable()
export class RecurringExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.recurringExpense.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { generatedEntries: true } } },
    });
  }

  getHourlyCostSummary() {
    return computeHourlyCostSummary(this.prisma, { useRecurringCatalog: true });
  }

  async findOne(id: string) {
    const item = await this.prisma.recurringExpense.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Despesa recorrente não encontrada');
    return item;
  }

  create(dto: CreateRecurringExpenseDto) {
    return this.prisma.recurringExpense.create({
      data: {
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        expenseType: dto.expenseType,
        dueDay: dto.dueDay,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateRecurringExpenseDto) {
    await this.findOne(id);
    return this.prisma.recurringExpense.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.recurringExpense.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Gera lançamentos financeiros para todas as despesas recorrentes ativas
   * para o mês/ano informado. Se já existe lançamento para aquele mês, não duplica.
   */
  async generateForMonth(year: number, month: number) {
    const actives = await this.prisma.recurringExpense.findMany({
      where: { active: true },
    });

    const created: string[] = [];

    for (const re of actives) {
      // Calcula a data de vencimento para o mês (se dueDay > dias do mês, usa último dia)
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const day = Math.min(re.dueDay, lastDayOfMonth);
      const dueDate = new Date(year, month - 1, day);

      // Verifica se já existe lançamento para esta despesa recorrente neste mês
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const existing = await this.prisma.financialEntry.findFirst({
        where: {
          recurringExpenseId: re.id,
          dueDate: { gte: monthStart, lte: monthEnd },
        },
      });

      if (existing) continue; // Já gerado para este mês

      await this.prisma.financialEntry.create({
        data: {
          type: 'EXPENSE',
          description: re.name,
          amount: re.amount,
          category: re.category,
          expenseType: re.expenseType,
          dueDate,
          recurringExpenseId: re.id,
        },
      });

      created.push(re.name);
    }

    return {
      generated: created.length,
      items: created,
      month: `${year}-${String(month).padStart(2, '0')}`,
    };
  }
}

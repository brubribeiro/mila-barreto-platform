import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeHourlyCostSummary,
  getHourlyCostIncludeVariable,
  setHourlyCostIncludeVariable,
} from '../common/utils/hourly-cost.util';
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

  getHourlyCostSettings() {
    return getHourlyCostIncludeVariable(this.prisma).then((includeVariable) => ({
      includeVariable,
    }));
  }

  setHourlyCostSettings(includeVariable: boolean) {
    return setHourlyCostIncludeVariable(this.prisma, includeVariable);
  }

  async getHourlyCostSummary(includeVariable?: boolean) {
    const include =
      includeVariable ?? (await getHourlyCostIncludeVariable(this.prisma));
    return computeHourlyCostSummary(this.prisma, {
      useRecurringCatalog: true,
      includeVariable: include,
    });
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

  async generateForMonth(year: number, month: number) {
    const actives = await this.prisma.recurringExpense.findMany({
      where: { active: true },
    });

    const created: string[] = [];

    for (const re of actives) {
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const day = Math.min(re.dueDay, lastDayOfMonth);
      const dueDate = new Date(year, month - 1, day);

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const existing = await this.prisma.financialEntry.findFirst({
        where: {
          recurringExpenseId: re.id,
          dueDate: { gte: monthStart, lte: monthEnd },
        },
      });

      if (existing) continue;

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

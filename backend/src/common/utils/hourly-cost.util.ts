import { PrismaService } from '../../prisma/prisma.service';

export interface HourlyCostSummary {
  hourlyCost: number;
  /** Soma das despesas recorrentes fixas ativas (cadastro). */
  recurringFixedMonthly: number;
  /** Despesas fixas lançadas no financeiro no mês corrente. */
  financeFixedMonthly: number;
  weeklyHours: number;
  monthlyHours: number;
  primaryProfessional: { id: string; name: string } | null;
}

function sumWeeklyHours(
  workingHours: { startTime: string; endTime: string }[],
): number {
  return workingHours.reduce((sum, wh) => {
    const [startH, startM] = wh.startTime.split(':').map(Number);
    const [endH, endM] = wh.endTime.split(':').map(Number);
    return sum + Math.max(0, endH + endM / 60 - (startH + startM / 60));
  }, 0);
}

/** Custo/hora = despesas fixas mensais ÷ carga horária da profissional principal. */
export async function computeHourlyCostSummary(
  prisma: PrismaService,
  options?: { useRecurringCatalog?: boolean },
): Promise<HourlyCostSummary> {
  const useRecurringCatalog = options?.useRecurringCatalog ?? false;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [recurringFixedAgg, financeFixedAgg, mainUser] = await Promise.all([
    prisma.recurringExpense.aggregate({
      where: { active: true, expenseType: 'FIXED' },
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: {
        type: 'EXPENSE',
        expenseType: 'FIXED',
        OR: [
          { paidAt: { gte: startOfMonth, lte: endOfMonth } },
          { dueDate: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.user.findFirst({
      where: { isPrimary: true, active: true },
      include: { workingHours: true },
    }),
  ]);

  const recurringFixedMonthly = Math.round(Number(recurringFixedAgg._sum.amount ?? 0) * 100) / 100;
  const financeFixedMonthly = Math.round(Number(financeFixedAgg._sum.amount ?? 0) * 100) / 100;
  const totalFixed = useRecurringCatalog ? recurringFixedMonthly : financeFixedMonthly;

  const weeklyHours = mainUser?.workingHours?.length
    ? Math.round(sumWeeklyHours(mainUser.workingHours) * 10) / 10
    : 0;
  const monthlyHours = Math.round(weeklyHours * 4.33 * 10) / 10;
  const hourlyCost =
    monthlyHours > 0 ? Math.round((totalFixed / monthlyHours) * 100) / 100 : 0;

  return {
    hourlyCost,
    recurringFixedMonthly,
    financeFixedMonthly,
    weeklyHours,
    monthlyHours,
    primaryProfessional: mainUser
      ? { id: mainUser.id, name: mainUser.name }
      : null,
  };
}

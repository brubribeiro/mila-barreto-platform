import { PrismaService } from '../../prisma/prisma.service';

export const HOURLY_COST_INCLUDE_VARIABLE_KEY = 'hourly_cost.include_variable';

export interface HourlyCostSummary {
  hourlyCost: number;
  /** Soma das despesas recorrentes ativas usadas no calculo (cadastro). */
  recurringExpensesMonthly: number;
  /** @deprecated Use recurringExpensesMonthly */
  recurringFixedMonthly: number;
  /** Despesas lancadas no financeiro no mes corrente (mesma regra de tipo que o calculo). */
  financeExpensesMonthly: number;
  /** @deprecated Use financeExpensesMonthly */
  financeFixedMonthly: number;
  includeVariable: boolean;
  weeklyHours: number;
  monthlyHours: number;
  primaryProfessional: { id: string; name: string } | null;
}

export async function getHourlyCostIncludeVariable(prisma: PrismaService): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: HOURLY_COST_INCLUDE_VARIABLE_KEY },
  });
  return row?.value === 'true';
}

export async function setHourlyCostIncludeVariable(
  prisma: PrismaService,
  includeVariable: boolean,
): Promise<{ includeVariable: boolean }> {
  const value = includeVariable ? 'true' : 'false';
  await prisma.appSetting.upsert({
    where: { key: HOURLY_COST_INCLUDE_VARIABLE_KEY },
    create: { key: HOURLY_COST_INCLUDE_VARIABLE_KEY, value },
    update: { value },
  });
  return { includeVariable };
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

/** Custo/hora = despesas mensais / carga horaria da profissional principal. */
export async function computeHourlyCostSummary(
  prisma: PrismaService,
  options?: { useRecurringCatalog?: boolean; includeVariable?: boolean },
): Promise<HourlyCostSummary> {
  const useRecurringCatalog = options?.useRecurringCatalog ?? false;
  const includeVariable = options?.includeVariable ?? false;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const recurringWhere = includeVariable
    ? { active: true }
    : { active: true, expenseType: 'FIXED' as const };

  const financeWhere = {
    type: 'EXPENSE' as const,
    ...(includeVariable ? {} : { expenseType: 'FIXED' as const }),
    OR: [
      { paidAt: { gte: startOfMonth, lte: endOfMonth } },
      { dueDate: { gte: startOfMonth, lte: endOfMonth } },
    ],
  };

  const [recurringAgg, financeAgg, mainUser] = await Promise.all([
    prisma.recurringExpense.aggregate({
      where: recurringWhere,
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: financeWhere,
      _sum: { amount: true },
    }),
    prisma.user.findFirst({
      where: { isPrimary: true, active: true },
      include: { workingHours: true },
    }),
  ]);

  const recurringExpensesMonthly =
    Math.round(Number(recurringAgg._sum.amount ?? 0) * 100) / 100;
  const financeExpensesMonthly =
    Math.round(Number(financeAgg._sum.amount ?? 0) * 100) / 100;
  const expensesMonthly = useRecurringCatalog
    ? recurringExpensesMonthly
    : financeExpensesMonthly;

  const weeklyHours = mainUser?.workingHours?.length
    ? Math.round(sumWeeklyHours(mainUser.workingHours) * 10) / 10
    : 0;
  const monthlyHours = Math.round(weeklyHours * 4.33 * 10) / 10;
  const hourlyCost =
    monthlyHours > 0 ? Math.round((expensesMonthly / monthlyHours) * 100) / 100 : 0;

  return {
    hourlyCost,
    recurringExpensesMonthly,
    recurringFixedMonthly: recurringExpensesMonthly,
    financeExpensesMonthly,
    financeFixedMonthly: financeExpensesMonthly,
    includeVariable,
    weeklyHours,
    monthlyHours,
    primaryProfessional: mainUser
      ? { id: mainUser.id, name: mainUser.name }
      : null,
  };
}

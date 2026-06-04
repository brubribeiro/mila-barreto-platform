import { api } from './client';
import type { ExpenseType, RecurringExpense } from '../types';

export interface RecurringExpensePayload {
  name: string;
  description?: string;
  amount: number;
  category?: string;
  expenseType: ExpenseType;
  dueDay: number;
  active?: boolean;
}

export interface GenerateResult {
  generated: number;
  items: string[];
  month: string;
}

export interface HourlyCostSummary {
  hourlyCost: number;
  recurringFixedMonthly: number;
  financeFixedMonthly: number;
  weeklyHours: number;
  monthlyHours: number;
  primaryProfessional: { id: string; name: string } | null;
}

export const recurringExpensesApi = {
  list: async (): Promise<RecurringExpense[]> => {
    const { data } = await api.get<RecurringExpense[]>('/recurring-expenses');
    return data;
  },
  getHourlyCostSummary: async (): Promise<HourlyCostSummary> => {
    const { data } = await api.get<HourlyCostSummary>('/recurring-expenses/hourly-cost-summary');
    return data;
  },
  create: async (payload: RecurringExpensePayload): Promise<RecurringExpense> => {
    const { data } = await api.post<RecurringExpense>('/recurring-expenses', payload);
    return data;
  },
  update: async (
    id: string,
    payload: Partial<RecurringExpensePayload>,
  ): Promise<RecurringExpense> => {
    const { data } = await api.patch<RecurringExpense>(`/recurring-expenses/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/recurring-expenses/${id}`);
  },
  generate: async (year?: number, month?: number): Promise<GenerateResult> => {
    const { data } = await api.post<GenerateResult>('/recurring-expenses/generate', null, {
      params: { year, month },
    });
    return data;
  },
};

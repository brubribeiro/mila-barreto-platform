import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { recurringExpensesApi } from '../api/recurring-expenses';
import { appointmentsBackfillFinance } from '../api/appointments';

function monthsInRange(from: string, to: string): { year: number; month: number }[] {
  const start = dayjs(from).startOf('month');
  const end = dayjs(to).startOf('month');
  if (!start.isValid() || !end.isValid()) {
    const now = dayjs();
    return [{ year: now.year(), month: now.month() + 1 }];
  }

  const months: { year: number; month: number }[] = [];
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'month')) {
    months.push({ year: current.year(), month: current.month() + 1 });
    current = current.add(1, 'month');
  }
  return months;
}

/**
 * Ao abrir o Financeiro: gera os lançamentos das despesas recorrentes dos meses do período
 * e cria os lançamentos que faltam dos agendamentos concluídos; recarrega o financeiro se mudar algo.
 */
export function useFinanceBackgroundSync(from: string, to: string) {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['recurring-generate', from, to],
    queryFn: async () => {
      const months = monthsInRange(from, to);
      await Promise.all(
        months.map(({ year, month }) => recurringExpensesApi.generate(year, month)),
      );
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      return true;
    },
    staleTime: 60_000,
  });

  useQuery({
    queryKey: ['backfill-finance'],
    queryFn: async () => {
      const result = await appointmentsBackfillFinance();
      if (result.created > 0) {
        await queryClient.invalidateQueries({ queryKey: ['finance'] });
        await queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
        await queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      }
      return result;
    },
    staleTime: 5 * 60_000,
  });
}

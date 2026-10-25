import { useMemo } from 'react';
import { Card, Stack, useTheme } from '@mui/material';
import dayjs from 'dayjs';

import type { FinancialEntry } from '../../types';
import { brl } from '../../utils/money';
import { AppGrid } from '../AppGrid';
import { TWO_COLUMNS } from './metricsConfig';
import { ChartCard, ChartLegend, EmptyChart, StatStrip } from './MetricsCards';
import { Breakdown, VBars } from './MetricsCharts';
import { buildDailyFlow, summarizeFinance } from './metricsUtils';

export function FinancialTab({ entries, color }: { entries: FinancialEntry[]; color: string }) {
  const theme = useTheme();
  const flow = useMemo(() => buildDailyFlow(entries), [entries]);

  const { income, expense, categoryRows } = useMemo(() => summarizeFinance(entries), [entries]);

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyChart message="Nenhum lançamento financeiro no período selecionado." height={140} />
      </Card>
    );
  }

  const balance = income - expense;
  const incomeColor = color;
  const expenseColor = theme.palette.error.main;

  return (
    <Stack gap={2.25}>
      <StatStrip
        items={[
          { label: 'Receitas', value: brl.format(income), hint: 'lançamentos de entrada' },
          { label: 'Despesas', value: brl.format(expense), hint: 'lançamentos de saída' },
          { label: 'Saldo', value: brl.format(balance), hint: balance >= 0 ? 'resultado positivo' : 'resultado negativo' },
        ]}
      />
      <AppGrid columns={TWO_COLUMNS} gap={2.25}>
        <ChartCard
          title="Fluxo diário no período"
          subtitle="Por data de pagamento (ou vencimento)"
          action={
            <ChartLegend
              items={[
                { label: 'Receita', color: incomeColor },
                { label: 'Despesa', color: expenseColor },
              ]}
            />
          }
        >
          <VBars
            gradient={false}
            data={flow.map((d) => ({
              label: dayjs(d.key).format('DD/MM'),
              fullLabel: dayjs(d.key).format('DD/MM/YYYY'),
              values: { receita: d.receita, despesa: d.despesa },
            }))}
            series={[
              { key: 'receita', name: 'Receita', color: incomeColor, format: (v) => brl.format(v) },
              { key: 'despesa', name: 'Despesa', color: expenseColor, format: (v) => brl.format(v) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Receita por categoria">
          {categoryRows.length > 0 ? <Breakdown rows={categoryRows} /> : <EmptyChart message="Nenhuma receita no período." />}
        </ChartCard>
      </AppGrid>
    </Stack>
  );
}

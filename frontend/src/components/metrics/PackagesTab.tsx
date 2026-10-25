import { Card, Stack } from '@mui/material';

import type { MetricsResult } from '../../api/metrics';
import { brl } from '../../utils/money';
import { AppGrid } from '../AppGrid';
import { ChartCard, EmptyChart, StatStrip } from './MetricsCards';
import { HBars } from './MetricsCharts';
import { brlCompact } from './metricsUtils';

export function PackagesTab({ data, color }: { data: MetricsResult; color: string }) {
  const { packages } = data;

  return (
    <Stack gap={2.25}>
      <StatStrip
        items={[
          { label: 'Pacotes vendidos', value: packages.totalSold, hint: 'no período selecionado' },
          { label: 'Receita de pacotes', value: brl.format(packages.totalRevenue), hint: 'no período' },
          { label: 'Pacotes ativos', value: packages.activeCount, hint: 'no total (todos os períodos)' },
          {
            label: 'Sessões consumidas',
            value: `${packages.sessionsUsed}/${packages.sessionsTotal}`,
            hint: `${packages.completionRate}% concluído`,
          },
        ]}
      />

      {packages.topPackages.length > 0 ? (
        <AppGrid columns={{ xs: 1, lg: 2 }} gap={2.25}>
          <ChartCard title="Pacotes mais vendidos" subtitle="Vendas no período">
            <HBars
              color={color}
              rows={[...packages.topPackages]
                .sort((a, b) => b.sold - a.sold)
                .map((p) => ({ name: p.name, value: p.sold, valueLabel: String(p.sold) }))}
            />
          </ChartCard>
          <ChartCard title="Receita por pacote" subtitle="Valor pago no período">
            <HBars
              color={color}
              rows={[...packages.topPackages]
                .sort((a, b) => b.revenue - a.revenue)
                .map((p) => ({ name: p.name, value: p.revenue, valueLabel: brlCompact.format(p.revenue) }))}
            />
          </ChartCard>
        </AppGrid>
      ) : (
        <Card>
          <EmptyChart message="Nenhum pacote vendido no período selecionado." height={140} />
        </Card>
      )}
    </Stack>
  );
}

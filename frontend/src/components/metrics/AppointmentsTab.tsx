import { Stack, useTheme } from '@mui/material';

import type { MetricsResult } from '../../api/metrics';
import { AppGrid } from '../AppGrid';
import { DAY_LABELS, TWO_COLUMNS } from './metricsConfig';
import { ChartCard, EmptyChart, StatStrip } from './MetricsCards';
import { Breakdown, HBars, VBars, type BarSeries, type BreakdownRow } from './MetricsCharts';
import { countLabel } from './metricsUtils';

export function AppointmentsTab({ data, color }: { data: MetricsResult; color: string }) {
  const theme = useTheme();
  const { appointments } = data;

  const statusRows: BreakdownRow[] = [
    { name: 'Concluídos', value: appointments.completed, color: theme.palette.success.main },
    { name: 'Confirmados', value: appointments.confirmed, color: theme.palette.primary.main },
    { name: 'Agendados', value: appointments.scheduled, color: '#5BA8DE' },
    { name: 'Cancelados', value: appointments.cancelled, color: theme.palette.error.main },
    { name: 'Faltas', value: appointments.noShow, color: theme.palette.warning.main },
  ]
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, valueLabel: String(s.value) }));

  const series: BarSeries[] = [{ key: 'total', name: 'Agendamentos', color }];

  return (
    <Stack gap={2.25}>
      <StatStrip
        items={[
          { label: 'Total de agendamentos', value: appointments.total, hint: 'no período selecionado' },
          { label: 'Concluídos', value: appointments.completed, hint: `${appointments.completionRate}% do total` },
          { label: 'Cancelamentos', value: appointments.cancelled, hint: `${appointments.cancellationRate}% do total` },
          { label: 'Faltas', value: appointments.noShow, hint: `${appointments.noShowRate}% do total` },
        ]}
      />

      <AppGrid columns={TWO_COLUMNS} gap={2.25}>
        <ChartCard title="Agendamentos por dia da semana" subtitle="Volume no período">
          <VBars
            data={appointments.byDayOfWeek.map((d) => ({ label: DAY_LABELS[d.day], values: { total: d.total } }))}
            series={series}
          />
        </ChartCard>
        <ChartCard title="Distribuição por status">
          {statusRows.length > 0 ? <Breakdown rows={statusRows} /> : <EmptyChart />}
        </ChartCard>
      </AppGrid>

      <AppGrid columns={{ xs: 1, lg: 2 }} gap={2.25}>
        <ChartCard title="Por profissional" subtitle="Agendamentos no período">
          {appointments.byProfessional.length > 0 ? (
            <HBars
              color={color}
              rows={appointments.byProfessional.map((p) => ({
                name: p.name,
                value: p.total,
                valueLabel: String(p.total),
                hint: `${p.completed} concluídos`,
              }))}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
        <ChartCard title="Por procedimento" subtitle="Quantidade de agendamentos (top 10)">
          {appointments.byProcedure.length > 0 ? (
            <HBars
              color={color}
              rows={[...appointments.byProcedure]
                .sort((a, b) => b.total - a.total)
                .slice(0, 10)
                .map((p) => ({ name: p.name, value: p.total, valueLabel: String(p.total) }))}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </AppGrid>

      {appointments.procedureCombos.length > 0 && (
        <ChartCard
          title="Combos de procedimentos mais comuns"
          subtitle="Pares de procedimentos realizados pelo mesmo paciente no período"
        >
          <HBars
            color={color}
            labelWidth={280}
            rows={appointments.procedureCombos.map((c) => ({
              name: c.procedures,
              value: c.count,
              valueLabel: countLabel(c.count, 'paciente', 'pacientes'),
            }))}
          />
        </ChartCard>
      )}

      {appointments.byHour.length > 0 && (
        <ChartCard title="Agendamentos por horário" subtitle="Hora de início">
          <VBars
            data={appointments.byHour.map((h) => ({
              label: `${h.hour}h`,
              fullLabel: `${h.hour}:00`,
              values: { total: h.total },
            }))}
            series={series}
          />
        </ChartCard>
      )}
    </Stack>
  );
}

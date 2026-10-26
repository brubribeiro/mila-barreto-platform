import { Stack } from '@mui/material';

import type { MetricsResult } from '../../api/metrics';
import { AppGrid } from '../AppGrid';
import { TWO_COLUMNS } from './metricsConfig';
import { ChartCard, EmptyChart, StatStrip } from './MetricsCards';
import { Donut, HBars } from './MetricsCharts';
import { returnRatePct } from './metricsUtils';

export function PatientsTab({ data, color }: { data: MetricsResult; color: string }) {
  const { patients } = data;
  const returnPct = returnRatePct(patients);

  return (
    <Stack gap={2.25}>
      <StatStrip
        items={[
          { label: 'Total cadastrados', value: patients.totalActive, hint: 'ativos no sistema' },
          { label: 'Novos no período', value: patients.newInPeriod, hint: 'primeiro cadastro' },
          { label: 'Retornaram', value: patients.returningInPeriod, hint: 'com novo agendamento' },
          {
            label: 'Média de idade',
            value: patients.averageAge != null ? `${patients.averageAge} anos` : '—',
            hint: 'dos pacientes ativos',
          },
          { label: 'Proc. por paciente', value: patients.averageProceduresPerPatient, hint: 'média no período' },
        ]}
      />

      <AppGrid columns={TWO_COLUMNS} gap={2.25}>
        <ChartCard title="Pacientes com mais agendamentos" subtitle="No período selecionado">
          {patients.topPatients.length > 0 ? (
            <HBars
              color={color}
              rows={patients.topPatients.map((p) => ({
                name: p.name,
                value: p.appointments,
                valueLabel: String(p.appointments),
              }))}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
        <ChartCard title="Retenção" subtitle="Pacientes atendidos que retornaram">
          {patients.uniqueInPeriod > 0 ? (
            <Donut
              pct={returnPct}
              caption="retornaram"
              color={color}
              stats={[
                { label: 'retornaram', value: patients.returningInPeriod, color },
                { label: 'atendidos', value: patients.uniqueInPeriod },
              ]}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </AppGrid>

      <ChartCard title="Maior localidade" subtitle="Pacientes por CEP">
        {patients.topLocations.length > 0 ? (
          <HBars
            color={color}
            rows={patients.topLocations.map((l) => ({ name: l.location, value: l.count, valueLabel: String(l.count) }))}
          />
        ) : (
          <EmptyChart message="Nenhum paciente com CEP cadastrado." />
        )}
      </ChartCard>
    </Stack>
  );
}

import { useState } from 'react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import dayjs from 'dayjs';

import { AppointmentsTab } from '../components/metrics/AppointmentsTab';
import { FinancialTab } from '../components/metrics/FinancialTab';
import { TAB_COLORS, TABS, type MetricsTab } from '../components/metrics/metricsConfig';
import { PackagesTab } from '../components/metrics/PackagesTab';
import { PatientsTab } from '../components/metrics/PatientsTab';
import { PeriodFilter } from '../components/metrics/PeriodFilter';
import { ProceduresTab } from '../components/metrics/ProceduresTab';
import { SummaryKpis } from '../components/metrics/SummaryKpis';
import { TabPill } from '../components/metrics/TabPill';
import { useMetricsData } from '../components/metrics/useMetricsData';
import { PageHeader } from '../components/PageHeader';
import { usePermissions } from '../contexts/usePermissions';

function TabLoading() {
  return (
    <Box display="flex" justifyContent="center" py={8}>
      <CircularProgress />
    </Box>
  );
}

export function Metrics() {
  const { has } = usePermissions();
  const canSeeFinance = has('finance:view');
  const [tab, setTab] = useState<MetricsTab>('appointments');
  const [dateFrom, setDateFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => dayjs().format('YYYY-MM-DD'));

  const { datesValid, periodDays, data, previousData, error, metricsLoading, financeEntries, financeLoading } =
    useMetricsData(dateFrom, dateTo, canSeeFinance);
  const color = TAB_COLORS[tab];

  return (
    <Box>
      <PageHeader
        title="Métricas"
        subtitle="Indicadores de agendamentos, pacientes, procedimentos, pacotes e financeiro"
      />

      <Stack gap={2.25}>
        <PeriodFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          periodDays={periodDays}
          datesValid={datesValid}
        />

        {!datesValid && (
          <Alert severity="warning">Informe um período válido (data inicial não pode ser posterior à final).</Alert>
        )}

        {error && <Alert severity="error">Erro ao carregar métricas. Verifique os filtros e tente novamente.</Alert>}

        <SummaryKpis data={data} previous={previousData} loading={metricsLoading && !data} />

        {/* Abas */}
        <Stack direction="row" flexWrap="wrap" gap={1.1} role="tablist">
          {TABS.filter((t) => t.value !== 'finance' || canSeeFinance).map((t) => (
            <TabPill
              key={t.value}
              label={t.label}
              color={TAB_COLORS[t.value]}
              active={tab === t.value}
              onClick={() => setTab(t.value)}
            />
          ))}
        </Stack>

        <Box key={`${dateFrom}-${dateTo}-${tab}`}>
          {tab !== 'finance' && metricsLoading && !data && <TabLoading />}
          {tab === 'finance' && financeLoading && financeEntries.length === 0 && <TabLoading />}

          {data && tab === 'appointments' && <AppointmentsTab data={data} color={color} />}
          {data && tab === 'patients' && <PatientsTab data={data} color={color} />}
          {data && tab === 'procedures' && <ProceduresTab data={data} color={color} />}
          {data && tab === 'packages' && <PackagesTab data={data} color={color} />}
          {tab === 'finance' && canSeeFinance && !financeLoading && (
            <FinancialTab entries={financeEntries} color={color} />
          )}
        </Box>
      </Stack>
    </Box>
  );
}

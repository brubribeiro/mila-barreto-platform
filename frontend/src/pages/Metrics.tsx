import { useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoopIcon from '@mui/icons-material/Loop';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CakeIcon from '@mui/icons-material/Cake';
import SpaIcon from '@mui/icons-material/Spa';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { metricsApi } from '../api/metrics';
import type { MetricsResult } from '../api/metrics';
import { financeApi } from '../api/finance';
import { AppGrid } from '../components/AppGrid';
import { PageHeader } from '../components/PageHeader';
import { usePermissions } from '../contexts/usePermissions';
import type { FinancialEntry } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CHART_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#DB2777', '#0891B2', '#4F46E5', '#65A30D', '#EA580C',
];

const METRICS_KPI_MIN_HEIGHT = 128;
const METRICS_CHART_HEIGHT = 280;

const metricsCardContentSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  p: { xs: 2, sm: 2.5 },
  '&:last-child': { pb: { xs: 2, sm: 2.5 } },
} as const;

// ─── KPI Card ───

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, subtitle, icon, color }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent
        sx={{
          ...metricsCardContentSx,
          minHeight: METRICS_KPI_MIN_HEIGHT,
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5, flexShrink: 0 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            sx={{ lineHeight: 1.35, pr: 0.5, flex: 1, minWidth: 0 }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.12),
              color,
              '& .MuiSvgIcon-root': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15, flexShrink: 0 }}>
          {value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 'auto',
            pt: 0.75,
            minHeight: 20,
            display: 'block',
            lineHeight: 1.35,
            visibility: subtitle ? 'visible' : 'hidden',
          }}
        >
          {subtitle ?? '\u00A0'}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Section Card ───

function ChartPlaceholder({ message = 'Sem dados no período.' }: { message?: string }) {
  return (
    <Box
      sx={{
        height: METRICS_CHART_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'action.hover',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function SectionCard({
  title,
  children,
  chartHeight = METRICS_CHART_HEIGHT,
}: {
  title: string;
  children: React.ReactNode;
  chartHeight?: number;
}) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ ...metricsCardContentSx }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, flexShrink: 0 }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height: chartHeight, flexShrink: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

// ─── Appointment Tab ───

function AppointmentsTab({ data }: { data: MetricsResult }) {
  const theme = useTheme();
  const { appointments } = data;

  const dayData = appointments.byDayOfWeek.map((d) => ({
    name: DAY_LABELS[d.day],
    total: d.total,
  }));

  const statusData = [
    { name: 'Concluídos', value: appointments.completed, color: theme.palette.success.main },
    { name: 'Cancelados', value: appointments.cancelled, color: theme.palette.error.main },
    { name: 'Faltas', value: appointments.noShow, color: theme.palette.warning.main },
    { name: 'Agendados', value: appointments.scheduled, color: theme.palette.info.main },
    { name: 'Confirmados', value: appointments.confirmed, color: '#7C3AED' },
  ].filter((s) => s.value > 0);

  return (
    <Stack gap={2}>
      <AppGrid columns={{ xs: 2, md: 4 }} gap={2}>
        <KpiCard
          title="Total de agendamentos"
          value={appointments.total}
          subtitle="no período selecionado"
          icon={<EventIcon />}
          color={theme.palette.primary.main}
        />
        <KpiCard
          title="Concluídos"
          value={appointments.completed}
          subtitle={`${appointments.completionRate}% do total`}
          icon={<CheckCircleIcon />}
          color={theme.palette.success.main}
        />
        <KpiCard
          title="Cancelamentos"
          value={appointments.cancelled}
          subtitle={`${appointments.cancellationRate}% do total`}
          icon={<CancelIcon />}
          color={theme.palette.error.main}
        />
        <KpiCard
          title="Faltas"
          value={appointments.noShow}
          subtitle={`${appointments.noShowRate}% do total`}
          icon={<PersonOffIcon />}
          color={theme.palette.warning.main}
        />
      </AppGrid>

      <AppGrid columns={{ xs: 1, md: 'minmax(0, 7fr) minmax(0, 5fr)' }} gap={2}>
          <SectionCard title="Agendamentos por dia da semana">
            <ResponsiveContainer width="100%" height={METRICS_CHART_HEIGHT}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Agendamentos" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
          <SectionCard title="Distribuição por status">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={METRICS_CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder />
            )}
          </SectionCard>
      </AppGrid>

      <AppGrid columns={{ xs: 1, md: 2 }} gap={2}>
          <SectionCard
            title="Por profissional"
            chartHeight={Math.max(METRICS_CHART_HEIGHT, appointments.byProfessional.length * 44)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointments.byProfessional} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" name="Concluídos" fill={theme.palette.success.main} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
          <SectionCard
            title="Por procedimento (quantidade)"
            chartHeight={Math.max(METRICS_CHART_HEIGHT, appointments.byProcedure.length * 44)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointments.byProcedure.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Agendamentos" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
      </AppGrid>

      {appointments.procedureCombos.length > 0 && (
        <SectionCard title="Combos de procedimentos mais comuns">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Pares de procedimentos realizados pelo mesmo paciente no período
          </Typography>
          <ResponsiveContainer
            width="100%"
            height={Math.max(METRICS_CHART_HEIGHT, appointments.procedureCombos.length * 44)}
          >
            <BarChart data={appointments.procedureCombos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="procedures" width={200} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Pacientes" fill="#DB2777" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {appointments.byHour.length > 0 && (
        <SectionCard title="Agendamentos por horário">
          <ResponsiveContainer width="100%" height={METRICS_CHART_HEIGHT}>
            <BarChart data={appointments.byHour}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}h`} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(h: number) => `${h}:00`} />
              <Bar dataKey="total" name="Agendamentos" fill="#0891B2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </Stack>
  );
}

// ─── Patients Tab ───

function PatientsTab({ data }: { data: MetricsResult }) {
  const theme = useTheme();
  const { patients } = data;

  return (
    <Stack gap={2}>
      <AppGrid columns={{ xs: 2, sm: 3, md: 5 }} gap={2}>
        <KpiCard
          title="Total cadastrados"
          value={patients.totalActive}
          subtitle="ativos no sistema"
          icon={<PeopleIcon />}
          color={theme.palette.primary.main}
        />
        <KpiCard
          title="Novos no período"
          value={patients.newInPeriod}
          subtitle="primeiro cadastro"
          icon={<PersonAddIcon />}
          color={theme.palette.success.main}
        />
        <KpiCard
          title="Retornaram"
          value={patients.returningInPeriod}
          subtitle="com novo agendamento"
          icon={<LoopIcon />}
          color="#7C3AED"
        />
        <KpiCard
          title="Média de idade"
          value={patients.averageAge != null ? `${patients.averageAge} anos` : '—'}
          subtitle="dos pacientes ativos"
          icon={<CakeIcon />}
          color="#D97706"
        />
        <KpiCard
          title="Proc. por paciente"
          value={patients.averageProceduresPerPatient}
          subtitle="média no período"
          icon={<SpaIcon />}
          color="#0891B2"
        />
      </AppGrid>

      <AppGrid columns={{ xs: 1, md: 2 }} gap={2}>
          <SectionCard
            title="Pacientes com mais agendamentos"
            chartHeight={Math.max(METRICS_CHART_HEIGHT, patients.topPatients.length * 44)}
          >
            {patients.topPatients.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patients.topPatients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="appointments" name="Agendamentos" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder />
            )}
          </SectionCard>
          <SectionCard
            title="Maior localidade (por CEP)"
            chartHeight={Math.max(METRICS_CHART_HEIGHT, patients.topLocations.length * 44)}
          >
            {patients.topLocations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patients.topLocations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="location" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Pacientes" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder message="Nenhum paciente com CEP cadastrado." />
            )}
          </SectionCard>
      </AppGrid>
    </Stack>
  );
}

// ─── Procedures Tab ───

function ProceduresTab({ data }: { data: MetricsResult }) {
  const theme = useTheme();
  const { procedures } = data;

  const monthData = procedures.byMonth.map((m) => ({
    ...m,
    month: dayjs(m.month + '-01').format('MMM/YY'),
  }));

  return (
    <Stack gap={2}>
      <AppGrid columns={{ xs: 2, sm: 3, md: 5 }} gap={2}>
        <KpiCard
          title="No catálogo"
          value={procedures.totalCatalog}
          subtitle={`${procedures.activeCatalog} ativos`}
          icon={<SpaIcon />}
          color={theme.palette.primary.main}
        />
        <KpiCard
          title="Realizados"
          value={procedures.totalPerformed}
          subtitle="no período"
          icon={<CheckCircleIcon />}
          color={theme.palette.success.main}
        />
        <KpiCard
          title="Diferentes"
          value={procedures.uniquePerformed}
          subtitle="tipos no período"
          icon={<EventIcon />}
          color="#7C3AED"
        />
        <KpiCard
          title="Duração média"
          value={`${procedures.averageDuration} min`}
          subtitle="por atendimento"
          icon={<ReceiptLongIcon />}
          color="#0891B2"
        />
        <KpiCard
          title="Preço médio"
          value={brl.format(procedures.averagePrice)}
          subtitle="tabela de preços"
          icon={<TrendingUpIcon />}
          color="#D97706"
        />
      </AppGrid>

      <AppGrid columns={{ xs: 1, md: 'minmax(0, 7fr) minmax(0, 5fr)' }} gap={2}>
          <SectionCard
            title="Ranking de procedimentos"
            chartHeight={Math.max(METRICS_CHART_HEIGHT, procedures.ranking.length * 36)}
          >
            {procedures.ranking.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={procedures.ranking} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'Receita' ? brl.format(value) : value
                    }
                  />
                  <Legend />
                  <Bar dataKey="count" name="Realizações" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="revenue" name="Receita" fill={theme.palette.success.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartPlaceholder />
            )}
          </SectionCard>
          <SectionCard title="Procedimentos por profissional" chartHeight={METRICS_CHART_HEIGHT}>
            {procedures.byProfessional.length > 0 ? (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                {procedures.byProfessional.map((item, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      py: 1,
                      px: 0.5,
                      borderBottom: '1px solid',
                      borderColor: alpha(theme.palette.divider, 0.5),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {item.procedure}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.professional}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0, ml: 1 }}>
                      {item.count}x
                    </Typography>
                  </Stack>
                ))}
              </Box>
            ) : (
              <ChartPlaceholder />
            )}
          </SectionCard>
      </AppGrid>

      {monthData.length > 0 && (
        <SectionCard title="Evolução mensal de procedimentos">
          <ResponsiveContainer width="100%" height={METRICS_CHART_HEIGHT}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Realizados" stroke={theme.palette.primary.main} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {(procedures.durationByProcedure?.length > 0 || procedures.durationByProfessional?.length > 0) && (
        <SectionCard title="Tempo real de atendimento">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Baseado em atendimentos com cronômetro (iniciar/finalizar)
            {procedures.averageRealDuration != null && (
              <> · Média geral: <strong>{procedures.averageRealDuration} min</strong></>
            )}
          </Typography>
          <AppGrid columns={{ xs: 1, md: 2 }} gap={2}>
            {procedures.durationByProcedure?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Por procedimento</Typography>
                <ResponsiveContainer width="100%" height={Math.max(180, procedures.durationByProcedure.length * 36)}>
                  <BarChart data={procedures.durationByProcedure} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} unit=" min" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v} min`} />
                    <Bar dataKey="avgMinutes" name="Média (min)" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
            {procedures.durationByProfessional?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Por profissional</Typography>
                <ResponsiveContainer width="100%" height={Math.max(180, procedures.durationByProfessional.length * 36)}>
                  <BarChart data={procedures.durationByProfessional} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} unit=" min" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v} min`} />
                    <Bar dataKey="avgMinutes" name="Média (min)" fill={theme.palette.secondary.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </AppGrid>
        </SectionCard>
      )}

      {procedures.materialCost.length > 0 && (
        <SectionCard title="Margem por procedimento (custo de materiais vs preço)">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Apenas procedimentos ativos com materiais cadastrados
          </Typography>
          <ResponsiveContainer width="100%" height={Math.max(220, procedures.materialCost.length * 36)}>
            <BarChart data={procedures.materialCost} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v: number) => brl.format(v)} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'Margem') return `${value}%`;
                  return brl.format(value);
                }}
              />
              <Legend />
              <Bar dataKey="baseCost" name="Custo" fill={theme.palette.error.light} radius={[0, 4, 4, 0]} />
              <Bar dataKey="price" name="Preço" fill={theme.palette.success.main} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </Stack>
  );
}

function buildDailyFlowChartData(entries: FinancialEntry[]) {
  const byDay: Record<string, { day: string; receita: number; despesa: number }> = {};
  entries.forEach((e) => {
    const refDate = e.paidAt ?? e.dueDate;
    const key = refDate ? dayjs(refDate).format('DD/MM') : '—';
    if (!byDay[key]) byDay[key] = { day: key, receita: 0, despesa: 0 };
    if (e.type === 'INCOME') byDay[key].receita += Number(e.amount);
    else byDay[key].despesa += Number(e.amount);
  });
  return Object.values(byDay).sort((a, b) => {
    const [da, ma] = a.day.split('/').map(Number);
    const [db, mb] = b.day.split('/').map(Number);
    return ma === mb ? da - db : ma - mb;
  });
}

// ─── Financial Tab ───

function FinancialTab({ entries }: { entries: FinancialEntry[] }) {
  const theme = useTheme();
  const chartData = useMemo(() => buildDailyFlowChartData(entries), [entries]);

  return (
    <Stack gap={2}>
      {chartData.length > 0 ? (
        <SectionCard title="Fluxo diário no período">
          <ResponsiveContainer width="100%" height={METRICS_CHART_HEIGHT}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E2" />
              <XAxis dataKey="day" stroke="#6E6E6E" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#6E6E6E"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => brl.format(v).replace('R$', '').trim()}
              />
              <Tooltip
                formatter={(v: number) => brl.format(v)}
                contentStyle={{ borderRadius: 8, border: '1px solid #E8E6E2' }}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill={theme.palette.error.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      ) : (
        <Alert severity="info">Nenhum lançamento financeiro no período selecionado.</Alert>
      )}
    </Stack>
  );
}

// ─── Packages Tab ───

function PackagesTab({ data }: { data: MetricsResult }) {
  const theme = useTheme();
  const { packages } = data;

  return (
    <Stack gap={2}>
      <AppGrid columns={{ xs: 2, md: 4 }} gap={2}>
        <KpiCard
          title="Pacotes vendidos"
          value={packages.totalSold}
          subtitle="no período selecionado"
          icon={<ViewInArIcon />}
          color={theme.palette.primary.main}
        />
        <KpiCard
          title="Receita de pacotes"
          value={brl.format(packages.totalRevenue)}
          subtitle="no período"
          icon={<TrendingUpIcon />}
          color={theme.palette.success.main}
        />
        <KpiCard
          title="Pacotes ativos"
          value={packages.activeCount}
          subtitle="no total (todos os períodos)"
          icon={<CheckCircleIcon />}
          color="#7C3AED"
        />
        <KpiCard
          title="Sessões consumidas"
          value={`${packages.sessionsUsed}/${packages.sessionsTotal}`}
          subtitle={`${packages.completionRate}% concluído`}
          icon={<LoopIcon />}
          color="#0891B2"
        />
      </AppGrid>

      {packages.topPackages.length > 0 && (
        <AppGrid columns={{ xs: 1, md: 2 }} gap={2}>
            <SectionCard
              title="Pacotes mais vendidos (período)"
              chartHeight={Math.max(METRICS_CHART_HEIGHT, packages.topPackages.length * 50)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packages.topPackages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sold" name="Vendas" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard
              title="Receita por pacote (período)"
              chartHeight={Math.max(METRICS_CHART_HEIGHT, packages.topPackages.length * 50)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packages.topPackages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v: number) => brl.format(v)} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => brl.format(v)} />
                  <Bar dataKey="revenue" name="Receita" fill={theme.palette.success.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
        </AppGrid>
      )}

      {packages.topPackages.length === 0 && (
        <Alert severity="info">Nenhum pacote vendido no período selecionado.</Alert>
      )}
    </Stack>
  );
}

// ─── Main Page ───

type MetricsTab = 'appointments' | 'patients' | 'procedures' | 'packages' | 'finance';

export function Metrics() {
  const { has } = usePermissions();
  const canSeeFinance = has('finance:view');
  const [tab, setTab] = useState<MetricsTab>('appointments');
  const [dateFrom, setDateFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(() => dayjs().format('YYYY-MM-DD'));

  const datesValid = useMemo(() => {
    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);
    return from.isValid() && to.isValid() && !from.isAfter(to, 'day');
  }, [dateFrom, dateTo]);

  const fromIso = useMemo(() => {
    const from = dayjs(dateFrom);
    return from.isValid() ? from.startOf('day').toISOString() : undefined;
  }, [dateFrom]);

  const toIso = useMemo(() => {
    const to = dayjs(dateTo);
    return to.isValid() ? to.endOf('day').toISOString() : undefined;
  }, [dateTo]);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['metrics', dateFrom, dateTo],
    queryFn: () => metricsApi.get(dateFrom, dateTo),
    enabled: datesValid,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const {
    data: financeEntries = [],
    isPending: financePending,
    isFetching: financeFetching,
  } = useQuery({
    queryKey: ['finance', fromIso, toIso, 'metrics'],
    queryFn: () => financeApi.list(fromIso!, toIso!),
    enabled: canSeeFinance && datesValid && !!fromIso && !!toIso,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const metricsLoading = isPending || (isFetching && !data);
  const financeLoading = financePending || (financeFetching && financeEntries.length === 0);

  return (
    <Box>
      <PageHeader
        title="Métricas"
        subtitle="Indicadores de agendamentos, pacientes, procedimentos, pacotes e financeiro"
      />

      <Card sx={{ mb: 3 }}>
        <CardContent
          sx={{
            p: { xs: 2, sm: 2.5 },
            '&:last-child': { pb: { xs: 2, sm: 2.5 } },
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Período de análise
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                size="small"
                label="De"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 160 } }}
              />
              <TextField
                type="date"
                size="small"
                label="Até"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', sm: 160 } }}
              />
            </Stack>
          </Stack>
          {!datesValid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Informe um período válido (data inicial não pode ser posterior à final).
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Tabs
            value={tab}
            onChange={(_, v: MetricsTab) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500, py: 1, px: { xs: 1.5, sm: 2 } },
              '& .MuiTabs-flexContainer': { gap: 0.5 },
            }}
          >
            <Tab value="appointments" icon={<EventIcon />} iconPosition="start" label="Agendamentos" />
            <Tab value="patients" icon={<PeopleIcon />} iconPosition="start" label="Pacientes" />
            <Tab value="procedures" icon={<SpaIcon />} iconPosition="start" label="Procedimentos" />
            <Tab value="packages" icon={<ViewInArIcon />} iconPosition="start" label="Pacotes" />
            {canSeeFinance && (
              <Tab value="finance" icon={<AccountBalanceWalletIcon />} iconPosition="start" label="Financeiro" />
            )}
          </Tabs>

          <Box key={`${dateFrom}-${dateTo}-${tab}`}>
          {tab !== 'finance' && metricsLoading && !data && (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          )}

          {tab !== 'finance' && error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Erro ao carregar métricas. Verifique os filtros e tente novamente.
            </Alert>
          )}

          {tab === 'finance' && financeLoading && financeEntries.length === 0 && (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          )}

          {data && tab === 'appointments' && <AppointmentsTab data={data} />}
          {data && tab === 'patients' && <PatientsTab data={data} />}
          {data && tab === 'procedures' && <ProceduresTab data={data} />}
          {data && tab === 'packages' && <PackagesTab data={data} />}
          {tab === 'finance' && canSeeFinance && !financeLoading && (
            <FinancialTab entries={financeEntries} />
          )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

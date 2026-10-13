import { useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  ButtonBase,
  Card,
  CardContent,
  CircularProgress,
  lighten,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { metricsApi } from '../api/metrics';
import type { MetricsResult } from '../api/metrics';
import { financeApi } from '../api/finance';
import { AppGrid } from '../components/AppGrid';
import { PageHeader } from '../components/PageHeader';
import { usePermissions } from '../contexts/usePermissions';
import { fontSizes } from '../theme/fontSizes';
import type { FinancialEntry } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const decimal1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CHART_HEIGHT = 180;
const TWO_COLUMNS = { xs: 1, lg: 'minmax(0, 1.55fr) minmax(0, 1fr)' };

const DELTA_TONES = {
  up: { color: '#11A893', bg: 'rgba(17,168,147,.13)' },
  down: { color: '#D65A5A', bg: 'rgba(214,90,90,.13)' },
  neutral: { color: '#6E7B78', bg: 'rgba(110,123,120,.12)' },
} as const;

type DeltaTone = keyof typeof DELTA_TONES;

type MetricsTab = 'appointments' | 'patients' | 'procedures' | 'packages' | 'finance';

const TAB_COLORS: Record<MetricsTab, string> = {
  finance: '#15998B',
  procedures: '#9B7BD4',
  packages: '#E0915B',
  patients: '#5BA8DE',
  appointments: '#D46B8A',
};

function pctChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function formatSigned(value: number, suffix: string) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal1.format(Math.abs(value))}${suffix}`;
}

/** Tom do delta: `higherIsBetter=false` inverte (ex.: no-show caindo é bom). */
function deltaTone(value: number, higherIsBetter = true): DeltaTone {
  if (Math.abs(value) < 0.05) return 'neutral';
  return value > 0 === higherIsBetter ? 'up' : 'down';
}

/* ------------------------------------------------------------------ */
/* Blocos visuais                                                      */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { label: string; tone: DeltaTone } | null;
  hint?: string;
  loading?: boolean;
}

function KpiCard({ label, value, delta, hint, loading }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={110} sx={{ fontSize: fontSizes['6xl'] }} />
        ) : (
          <Typography
            sx={{ fontSize: fontSizes['6xl'], fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.1, mb: 1.25 }}
          >
            {value}
          </Typography>
        )}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 22 }}>
          {!loading && delta && (
            <Box
              component="span"
              sx={{
                fontSize: fontSizes.xs,
                fontWeight: 700,
                color: DELTA_TONES[delta.tone].color,
                bgcolor: DELTA_TONES[delta.tone].bg,
                px: 1,
                py: 0.25,
                borderRadius: '7px',
                lineHeight: 1.4,
              }}
            >
              {delta.label}
            </Box>
          )}
          {!loading && hint && (
            <Typography component="span" sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500 }}>
              {hint}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
}

/** Indicadores secundários de cada aba, numa única faixa em card. */
function StatStrip({ items }: { items: StatItem[] }) {
  const theme = useTheme();
  const line = `1px solid ${theme.palette.divider}`;
  return (
    <Card>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${items.length}, minmax(0, 1fr))` },
        }}
      >
        {items.map((item, i) => (
          <Box
            key={item.label}
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              borderLeft: { xs: i % 2 === 1 ? line : 'none', md: i > 0 ? line : 'none' },
              borderTop: { xs: i > 1 ? line : 'none', md: 'none' },
            }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: 'text.secondary' }} noWrap>
              {item.label}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, letterSpacing: '-0.5px', mt: 0.5 }} noWrap>
              {item.value}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }} noWrap>
              {item.hint ?? ' '}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

interface LegendItem {
  label: string;
  color: string;
}

function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.75} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Stack key={item.label} direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: item.color }} />
          <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 600, color: 'text.secondary' }}>
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.75 } } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>{title}</Typography>
            {subtitle && (
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
            )}
          </Box>
          {action}
        </Stack>
        <Box sx={{ mt: 2.25 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message = 'Sem dados no período.', height = CHART_HEIGHT }: { message?: string; height?: number }) {
  return (
    <Box
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        borderRadius: '12px',
        border: '1px dashed',
        borderColor: 'divider',
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>{message}</Typography>
    </Box>
  );
}

interface BarSeries {
  key: string;
  name: string;
  color: string;
  format?: (v: number) => string;
}

interface VBarDatum {
  label: string;
  /** Rótulo completo para o tooltip (padrão: `label`). */
  fullLabel?: string;
  values: Record<string, number>;
}

/** Barras verticais (uma ou mais séries lado a lado), no estilo Aurora. */
function VBars({
  data,
  series,
  showValues = true,
  gradient = true,
  height = CHART_HEIGHT,
}: {
  data: VBarDatum[];
  series: BarSeries[];
  showValues?: boolean;
  gradient?: boolean;
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 16) : 1;
  const grouped = series.length > 1;

  return (
    <Stack direction="row" alignItems="flex-end" sx={{ height, gap: data.length > 16 ? 0.5 : 1.25 }}>
      {data.map((d, i) => {
        const tooltip = (
          <Box>
            <Box sx={{ fontWeight: 700, mb: 0.25 }}>{d.fullLabel ?? d.label}</Box>
            {series.map((s) => (
              <Box key={s.key}>
                {s.name}: {(s.format ?? String)(d.values[s.key] ?? 0)}
              </Box>
            ))}
          </Box>
        );
        return (
          <Tooltip key={`${d.label}-${i}`} title={tooltip} arrow placement="top" disableInteractive>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.75,
                cursor: 'default',
                '&:hover .vbar': { filter: 'brightness(0.92)' },
              }}
            >
              {showValues && !grouped && (
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.secondary', lineHeight: 1 }} noWrap>
                  {(series[0].format ?? String)(d.values[series[0].key] ?? 0)}
                </Typography>
              )}
              <Stack direction="row" alignItems="flex-end" justifyContent="center" sx={{ width: '100%', flex: 1, gap: '2px' }}>
                {series.map((s) => {
                  const v = d.values[s.key] ?? 0;
                  return (
                    <Box
                      key={s.key}
                      className="vbar"
                      sx={{
                        width: grouped ? `${90 / series.length}%` : '100%',
                        maxWidth: grouped ? 28 : 64,
                        height: `${(v / max) * 100}%`,
                        minHeight: 4,
                        borderRadius: '6px 6px 0 0',
                        background: gradient
                          ? `linear-gradient(180deg, ${s.color}, ${lighten(s.color, 0.3)})`
                          : s.color,
                        opacity: v === 0 ? 0.35 : 1,
                      }}
                    />
                  );
                })}
              </Stack>
              <Typography
                sx={{
                  fontSize: fontSizes['3xs'],
                  fontWeight: 600,
                  color: 'text.disabled',
                  lineHeight: 1,
                  visibility: i % labelEvery === 0 ? 'visible' : 'hidden',
                }}
                noWrap
              >
                {d.label}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

interface HBarRow {
  name: string;
  value: number;
  valueLabel: string;
  hint?: string;
}

/** Barras horizontais com rótulo à esquerda e valor à direita. */
function HBars({ rows, color, labelWidth = 220 }: { rows: HBarRow[]; color: string; labelWidth?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Stack spacing={1.75}>
      {rows.map((r, i) => (
        <Stack key={`${r.name}-${i}`} direction="row" alignItems="center" spacing={1.75}>
          <Box sx={{ width: { xs: 120, sm: labelWidth }, flexShrink: 0, minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }} noWrap title={r.name}>
              {r.name}
            </Typography>
            {r.hint && (
              <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }} noWrap>
                {r.hint}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, height: 22, borderRadius: '7px', bgcolor: 'grey.100', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(r.value / max) * 100}%`,
                minWidth: 4,
                borderRadius: '7px',
                bgcolor: color,
              }}
            />
          </Box>
          <Typography sx={{ width: 84, flexShrink: 0, textAlign: 'right', fontSize: fontSizes.sm, fontWeight: 800 }} noWrap>
            {r.valueLabel}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

interface BreakdownRow {
  name: string;
  value: number;
  valueLabel: string;
  color: string;
}

/** Divisão proporcional (progresso por linha), como "Receita por categoria". */
function Breakdown({ rows }: { rows: BreakdownRow[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <Stack spacing={2}>
      {rows.map((r) => (
        <Box key={r.name}>
          <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.85 }}>
            <Stack direction="row" alignItems="center" spacing={0.85} sx={{ minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: r.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }} noWrap>
                {r.name}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
              {r.valueLabel}
              <Box component="span" sx={{ color: 'text.disabled', fontWeight: 600, ml: 0.75 }}>
                {Math.round((r.value / total) * 100)}%
              </Box>
            </Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: '8px', bgcolor: 'grey.100', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${(r.value / total) * 100}%`, borderRadius: '8px', bgcolor: r.color }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function Donut({
  pct,
  caption,
  color,
  stats,
}: {
  pct: number;
  caption: string;
  color: string;
  stats: { label: string; value: number | string; color?: string }[];
}) {
  const theme = useTheme();
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <Stack alignItems="center" spacing={2}>
      <Box sx={{ position: 'relative', width: 150, height: 150 }}>
        <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`${Math.round(clamped)}% ${caption}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke={theme.palette.grey[100]} strokeWidth="16" />
          {clamped > 0 && (
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${(c * clamped) / 100} ${c}`}
              transform="rotate(-90 70 70)"
            />
          )}
        </svg>
        <Stack sx={{ position: 'absolute', inset: 0 }} alignItems="center" justifyContent="center">
          <Typography sx={{ fontSize: fontSizes['6xl'], fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>
            {Math.round(clamped)}%
          </Typography>
          <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 600, color: 'text.disabled' }}>{caption}</Typography>
        </Stack>
      </Box>
      <Stack direction="row" spacing={3}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: fontSizes['2xl'], fontWeight: 800, color: s.color ?? 'text.secondary' }}>
              {s.value}
            </Typography>
            <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 600, color: 'text.disabled' }}>{s.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Abas                                                                */
/* ------------------------------------------------------------------ */

function AppointmentsTab({ data, color }: { data: MetricsResult; color: string }) {
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
              valueLabel: `${c.count} ${c.count === 1 ? 'paciente' : 'pacientes'}`,
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

function PatientsTab({ data, color }: { data: MetricsResult; color: string }) {
  const { patients } = data;
  const returnPct = patients.uniqueInPeriod > 0 ? (patients.returningInPeriod / patients.uniqueInPeriod) * 100 : 0;

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

function ProceduresTab({ data, color }: { data: MetricsResult; color: string }) {
  const theme = useTheme();
  const { procedures } = data;

  const revenueRows = [...procedures.ranking]
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .map((r) => ({
      name: r.name,
      value: r.revenue,
      valueLabel: brlCompact.format(r.revenue),
      hint: `${r.count} ${r.count === 1 ? 'realização' : 'realizações'}`,
    }));

  const marginMax = Math.max(1, ...procedures.materialCost.map((m) => m.price));
  const costColor = theme.palette.error.light;

  return (
    <Stack gap={2.25}>
      <StatStrip
        items={[
          { label: 'No catálogo', value: procedures.totalCatalog, hint: `${procedures.activeCatalog} ativos` },
          { label: 'Realizados', value: procedures.totalPerformed, hint: 'no período' },
          { label: 'Diferentes', value: procedures.uniquePerformed, hint: 'tipos no período' },
          { label: 'Duração média', value: `${procedures.averageDuration} min`, hint: 'por atendimento' },
          { label: 'Preço médio', value: brl.format(procedures.averagePrice), hint: 'tabela de preços' },
        ]}
      />

      <AppGrid columns={TWO_COLUMNS} gap={2.25}>
        <ChartCard title="Receita por procedimento" subtitle="Concluídos no período × preço de tabela">
          {revenueRows.length > 0 ? <HBars color={color} rows={revenueRows} /> : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Procedimentos por profissional">
          {procedures.byProfessional.length > 0 ? (
            <Box sx={{ maxHeight: 340, overflow: 'auto', mx: -0.5 }}>
              {procedures.byProfessional.map((item, i) => (
                <Stack
                  key={i}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    py: 1.1,
                    px: 0.5,
                    borderBottom: i < procedures.byProfessional.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }} noWrap>
                      {item.procedure}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }} noWrap>
                      {item.professional}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      px: 1,
                      py: 0.25,
                      borderRadius: '7px',
                      color: theme.palette.text.primary,
                      bgcolor: alpha(color, 0.14),
                    }}
                  >
                    {item.count}x
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </AppGrid>

      {procedures.byMonth.length > 0 && (
        <ChartCard title="Evolução mensal de procedimentos" subtitle="Realizados por mês">
          <VBars
            data={procedures.byMonth.map((m) => {
              const d = dayjs(m.month + '-01');
              return { label: d.format('MMM/YY'), fullLabel: d.format('MMMM [de] YYYY'), values: { count: m.count } };
            })}
            series={[{ key: 'count', name: 'Realizados', color }]}
          />
        </ChartCard>
      )}

      {(procedures.durationByProcedure?.length > 0 || procedures.durationByProfessional?.length > 0) && (
        <ChartCard
          title="Tempo real de atendimento"
          subtitle={
            'Baseado em atendimentos com cronômetro (iniciar/finalizar)' +
            (procedures.averageRealDuration != null ? ` · Média geral: ${procedures.averageRealDuration} min` : '')
          }
        >
          <AppGrid columns={{ xs: 1, md: 2 }} gap={3}>
            {procedures.durationByProcedure?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>
                  Por procedimento
                </Typography>
                <HBars
                  color={color}
                  rows={procedures.durationByProcedure.map((p) => ({
                    name: p.name,
                    value: p.avgMinutes,
                    valueLabel: `${p.avgMinutes} min`,
                    hint: `${p.count} ${p.count === 1 ? 'atendimento' : 'atendimentos'}`,
                  }))}
                />
              </Box>
            )}
            {procedures.durationByProfessional?.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>
                  Por profissional
                </Typography>
                <HBars
                  color={color}
                  rows={procedures.durationByProfessional.map((p) => ({
                    name: p.name,
                    value: p.avgMinutes,
                    valueLabel: `${p.avgMinutes} min`,
                    hint: `${p.count} ${p.count === 1 ? 'atendimento' : 'atendimentos'}`,
                  }))}
                />
              </Box>
            )}
          </AppGrid>
        </ChartCard>
      )}

      {procedures.materialCost.length > 0 && (
        <ChartCard
          title="Margem por procedimento"
          subtitle="Barra = preço de tabela · apenas procedimentos ativos com materiais cadastrados"
          action={
            <ChartLegend
              items={[
                { label: 'Custo de materiais', color: costColor },
                { label: 'Margem', color },
              ]}
            />
          }
        >
          <Stack spacing={1.75}>
            {procedures.materialCost.map((m) => (
              <Tooltip
                key={m.name}
                arrow
                placement="top"
                disableInteractive
                title={`Preço ${brl.format(m.price)} · Custo ${brl.format(m.baseCost)} · Margem ${m.margin}%`}
              >
                <Stack direction="row" alignItems="center" spacing={1.75}>
                  <Box sx={{ width: { xs: 120, sm: 220 }, flexShrink: 0, minWidth: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }} noWrap>
                      {m.name}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }} noWrap>
                      {brl.format(m.baseCost)} de {brl.format(m.price)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, height: 22, borderRadius: '7px', bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        height: '100%',
                        width: `${(m.price / marginMax) * 100}%`,
                        minWidth: 4,
                        borderRadius: '7px',
                        bgcolor: color,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          right: 'auto',
                          width: m.price > 0 ? `${Math.min(100, (m.baseCost / m.price) * 100)}%` : 0,
                          bgcolor: costColor,
                          borderRight: m.baseCost > 0 ? '2px solid #fff' : 'none',
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography sx={{ width: 84, flexShrink: 0, textAlign: 'right', fontSize: fontSizes.sm, fontWeight: 800 }}>
                    {m.margin}%
                  </Typography>
                </Stack>
              </Tooltip>
            ))}
          </Stack>
        </ChartCard>
      )}
    </Stack>
  );
}

function PackagesTab({ data, color }: { data: MetricsResult; color: string }) {
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

function buildDailyFlow(entries: FinancialEntry[]) {
  const byDay: Record<string, { key: string; receita: number; despesa: number }> = {};
  entries.forEach((e) => {
    const refDate = e.paidAt ?? e.dueDate;
    const key = refDate ? dayjs(refDate).format('YYYY-MM-DD') : '';
    if (!key) return;
    if (!byDay[key]) byDay[key] = { key, receita: 0, despesa: 0 };
    if (e.type === 'INCOME') byDay[key].receita += Number(e.amount);
    else byDay[key].despesa += Number(e.amount);
  });
  return Object.values(byDay).sort((a, b) => a.key.localeCompare(b.key));
}

const FINANCE_CATEGORY_COLORS = ['#15998B', '#9B7BD4', '#E0915B', '#5BA8DE', '#D46B8A'];
const FINANCE_TOP_CATEGORIES = 4;

function FinancialTab({ entries, color }: { entries: FinancialEntry[]; color: string }) {
  const theme = useTheme();
  const flow = useMemo(() => buildDailyFlow(entries), [entries]);

  const { income, expense, categoryRows } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const byCategory = new Map<string, number>();
    entries.forEach((e) => {
      const amount = Number(e.amount);
      if (e.type === 'INCOME') {
        inc += amount;
        const cat = e.category?.trim() || 'Sem categoria';
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + amount);
      } else {
        exp += amount;
      }
    });
    const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, FINANCE_TOP_CATEGORIES);
    const others = sorted.slice(FINANCE_TOP_CATEGORIES).reduce((s, [, v]) => s + v, 0);
    if (others > 0) top.push(['Outras', others]);
    return {
      income: inc,
      expense: exp,
      categoryRows: top.map(([name, value], i) => ({
        name,
        value,
        valueLabel: brlCompact.format(value),
        color: FINANCE_CATEGORY_COLORS[i],
      })),
    };
  }, [entries]);

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

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function SummaryKpis({
  data,
  previous,
  loading,
}: {
  data: MetricsResult | undefined;
  previous: MetricsResult | undefined;
  loading: boolean;
}) {
  const summarize = (m: MetricsResult) => {
    const revenue = m.appointments.byProcedure.reduce((s, p) => s + p.revenue, 0);
    const ticket = m.appointments.completed > 0 ? revenue / m.appointments.completed : 0;
    const returnRate =
      m.patients.uniqueInPeriod > 0 ? (m.patients.returningInPeriod / m.patients.uniqueInPeriod) * 100 : 0;
    return { revenue, ticket, returnRate, noShowRate: m.appointments.noShowRate };
  };

  const cur = data ? summarize(data) : null;
  const prev = previous ? summarize(previous) : null;
  const hint = 'vs. período anterior';

  const pctDelta = (c: number, p: number | undefined) => {
    if (p == null) return null;
    const change = pctChange(c, p);
    return change == null ? null : { label: formatSigned(change, '%'), tone: deltaTone(change) };
  };
  const ppDelta = (c: number, p: number | undefined, higherIsBetter = true) => {
    if (p == null) return null;
    const diff = c - p;
    return { label: formatSigned(diff, ' p.p.'), tone: deltaTone(diff, higherIsBetter) };
  };

  return (
    <AppGrid columns={{ xs: 2, md: 4 }} gap={2.25}>
      <KpiCard
        label="Receita de procedimentos"
        value={cur ? brl.format(cur.revenue) : '—'}
        delta={cur && pctDelta(cur.revenue, prev?.revenue)}
        hint={prev ? hint : 'concluídos × preço de tabela'}
        loading={loading}
      />
      <KpiCard
        label="Ticket médio"
        value={cur ? brl.format(cur.ticket) : '—'}
        delta={cur && pctDelta(cur.ticket, prev?.ticket)}
        hint={prev ? hint : 'por atendimento concluído'}
        loading={loading}
      />
      <KpiCard
        label="Taxa de retorno"
        value={cur ? `${decimal1.format(cur.returnRate)}%` : '—'}
        delta={cur && ppDelta(cur.returnRate, prev?.returnRate)}
        hint={prev ? hint : 'pacientes que retornaram'}
        loading={loading}
      />
      <KpiCard
        label="No-show"
        value={cur ? `${decimal1.format(cur.noShowRate)}%` : '—'}
        delta={cur && ppDelta(cur.noShowRate, prev?.noShowRate, false)}
        hint={prev ? hint : 'faltas sobre o total'}
        loading={loading}
      />
    </AppGrid>
  );
}

function TabPill({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.9,
        height: 40,
        px: 2.25,
        borderRadius: '12px',
        fontFamily: 'inherit',
        fontSize: fontSizes.sm,
        fontWeight: 700,
        border: active ? 'none' : 1,
        borderColor: 'divider',
        bgcolor: active ? color : 'background.paper',
        color: active ? '#fff' : 'text.secondary',
        boxShadow: active ? `0 6px 16px -7px ${color}` : 'none',
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': { bgcolor: active ? color : 'grey.50' },
      }}
    >
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '3px', bgcolor: active ? 'rgba(255,255,255,.85)' : color }}
      />
      {label}
    </ButtonBase>
  );
}

const TABS: { value: MetricsTab; label: string }[] = [
  { value: 'appointments', label: 'Agendamentos' },
  { value: 'patients', label: 'Pacientes' },
  { value: 'procedures', label: 'Procedimentos' },
  { value: 'packages', label: 'Pacotes' },
  { value: 'finance', label: 'Financeiro' },
];

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

  // Período anterior com a mesma duração, para os deltas dos KPIs.
  const previousRange = useMemo(() => {
    if (!datesValid) return null;
    const from = dayjs(dateFrom);
    const days = dayjs(dateTo).diff(from, 'day') + 1;
    return {
      from: from.subtract(days, 'day').format('YYYY-MM-DD'),
      to: from.subtract(1, 'day').format('YYYY-MM-DD'),
    };
  }, [dateFrom, dateTo, datesValid]);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['metrics', dateFrom, dateTo],
    queryFn: () => metricsApi.get(dateFrom, dateTo),
    enabled: datesValid,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const { data: previousData } = useQuery({
    queryKey: ['metrics', previousRange?.from, previousRange?.to],
    queryFn: () => metricsApi.get(previousRange!.from, previousRange!.to),
    enabled: !!previousRange,
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
  const color = TAB_COLORS[tab];
  const periodDays = datesValid ? dayjs(dateTo).diff(dayjs(dateFrom), 'day') + 1 : 0;

  return (
    <Box>
      <PageHeader
        title="Métricas"
        subtitle="Indicadores de agendamentos, pacientes, procedimentos, pacotes e financeiro"
      />

      <Stack gap={2.25} sx={{ maxWidth: 1320, mx: 'auto' }}>
        {/* Período */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', fontWeight: 600 }}>
            Período de análise
            {datesValid && (
              <>
                {'  ·  '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
                  {periodDays}
                </Box>{' '}
                {periodDays === 1 ? 'dia' : 'dias'}
              </>
            )}
          </Typography>
          <Stack direction="row" spacing={1.25}>
            <TextField
              type="date"
              size="small"
              label="De"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'background.paper' } }}
            />
            <TextField
              type="date"
              size="small"
              label="Até"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'background.paper' } }}
            />
          </Stack>
        </Stack>

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
          {tab !== 'finance' && metricsLoading && !data && (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          )}

          {tab === 'finance' && financeLoading && financeEntries.length === 0 && (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          )}

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

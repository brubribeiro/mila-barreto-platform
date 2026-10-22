import { Box, lighten, Stack, Tooltip, Typography, useTheme } from '@mui/material';

import type { MetricsResult } from '../../api/metrics';
import { fontSizes } from '../../theme/fontSizes';
import { brl } from '../../utils/money';
import { CHART_HEIGHT } from './metricsConfig';

export interface BarSeries {
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
export function VBars({
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
export function HBars({ rows, color, labelWidth = 220 }: { rows: HBarRow[]; color: string; labelWidth?: number }) {
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

export interface BreakdownRow {
  name: string;
  value: number;
  valueLabel: string;
  color: string;
}

/** Divisão proporcional (progresso por linha), como "Receita por categoria". */
export function Breakdown({ rows }: { rows: BreakdownRow[] }) {
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

export function Donut({
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

/** Preço de tabela por procedimento, com a fatia do custo de materiais à esquerda. */
export function MarginBars({
  rows,
  color,
  costColor,
}: {
  rows: MetricsResult['procedures']['materialCost'];
  color: string;
  costColor: string;
}) {
  const marginMax = Math.max(1, ...rows.map((m) => m.price));
  return (
    <Stack spacing={1.75}>
      {rows.map((m) => (
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
  );
}

import { alpha, Box, Stack, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';

import type { MetricsResult } from '../../api/metrics';
import { fontSizes } from '../../theme/fontSizes';
import { brl } from '../../utils/money';
import { AppGrid } from '../AppGrid';
import { TWO_COLUMNS } from './metricsConfig';
import { ChartCard, ChartLegend, EmptyChart, StatStrip } from './MetricsCards';
import { HBars, MarginBars, VBars } from './MetricsCharts';
import { brlCompact, countLabel } from './metricsUtils';

export function ProceduresTab({ data, color }: { data: MetricsResult; color: string }) {
  const theme = useTheme();
  const { procedures } = data;

  const revenueRows = [...procedures.ranking]
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .map((r) => ({
      name: r.name,
      value: r.revenue,
      valueLabel: brlCompact.format(r.revenue),
      hint: countLabel(r.count, 'realização', 'realizações'),
    }));

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
              <DurationColumn title="Por procedimento" items={procedures.durationByProcedure} color={color} />
            )}
            {procedures.durationByProfessional?.length > 0 && (
              <DurationColumn title="Por profissional" items={procedures.durationByProfessional} color={color} />
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
          <MarginBars rows={procedures.materialCost} color={color} costColor={costColor} />
        </ChartCard>
      )}
    </Stack>
  );
}

function DurationColumn({
  title,
  items,
  color,
}: {
  title: string;
  items: { name: string; avgMinutes: number; count: number }[];
  color: string;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>{title}</Typography>
      <HBars
        color={color}
        rows={items.map((p) => ({
          name: p.name,
          value: p.avgMinutes,
          valueLabel: `${p.avgMinutes} min`,
          hint: countLabel(p.count, 'atendimento', 'atendimentos'),
        }))}
      />
    </Box>
  );
}

import type { MetricsResult } from '../../api/metrics';
import { brl } from '../../utils/money';
import { AppGrid } from '../AppGrid';
import { KpiCard } from './MetricsCards';
import { decimal1, deltaTone, formatSigned, pctChange, summarizeKpis } from './metricsUtils';

export function SummaryKpis({
  data,
  previous,
  loading,
}: {
  data: MetricsResult | undefined;
  previous: MetricsResult | undefined;
  loading: boolean;
}) {
  const cur = data ? summarizeKpis(data) : null;
  const prev = previous ? summarizeKpis(previous) : null;
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

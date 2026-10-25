import type { ReactNode } from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { fontSizes } from '../../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function CostLine({ label, value }: { label: ReactNode; value: number }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700 }}>{brl.format(value)}</Typography>
    </Stack>
  );
}

interface ProcedureCostSummaryProps {
  materialCost: number;
  equipmentCost: number;
  fixedCostShare: number;
  durationMinutes: number;
  totalCost: number;
  marginValue: number;
  marginPct: number;
}

/** Caixa de custo do procedimento: material, equipamento, despesa fixa, total e margem. */
export function ProcedureCostSummary({
  materialCost,
  equipmentCost,
  fixedCostShare,
  durationMinutes,
  totalCost,
  marginValue,
  marginPct,
}: ProcedureCostSummaryProps) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: '13px',
        border: 1,
        borderColor: (t) => alpha(t.palette.primary.main, 0.22),
        bgcolor: (t) => alpha(t.palette.primary.main, 0.07),
      }}
    >
      <CostLine label="Custo de material" value={materialCost} />
      {equipmentCost > 0 && <CostLine label="Custo de equipamento" value={equipmentCost} />}
      <CostLine label={<>Despesa fixa ({durationMinutes} min)</>} value={fixedCostShare} />
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ pt: 0.75, borderTop: 1, borderColor: (t) => alpha(t.palette.primary.main, 0.22) }}
      >
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>Custo total</Typography>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800 }}>{brl.format(totalCost)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
        <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>Margem</Typography>
        <Typography
          sx={{ fontSize: fontSizes.xs, fontWeight: 800, color: marginValue >= 0 ? 'primary.dark' : 'error.main' }}
        >
          {brl.format(marginValue)} · {marginPct.toFixed(0)}%
        </Typography>
      </Stack>
    </Box>
  );
}

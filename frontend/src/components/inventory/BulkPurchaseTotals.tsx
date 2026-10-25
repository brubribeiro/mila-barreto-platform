import { Box, Stack, Typography } from '@mui/material';
import { fontSizes } from '../../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface BulkPurchaseTotalsProps {
  productsTotal: number;
  freight: number;
  grandTotal: number;
}

/** Resumo da compra em lote: subtotal, frete e total. */
export function BulkPurchaseTotals({ productsTotal, freight, grandTotal }: BulkPurchaseTotalsProps) {
  return (
  <Stack
    spacing={1.4}
    sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: '14px', px: 2.25, py: 2 }}
  >
    <Stack direction="row" justifyContent="space-between">
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
        Subtotal produtos
      </Typography>
      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>{brl.format(productsTotal)}</Typography>
    </Stack>
    <Stack direction="row" justifyContent="space-between">
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
        Frete (rateado)
      </Typography>
      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>{brl.format(freight)}</Typography>
    </Stack>
    <Box sx={{ height: '1px', bgcolor: 'divider' }} />
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>Total da compra</Typography>
      <Typography
        sx={{ fontSize: fontSizes['2xl'], fontWeight: 800, color: 'primary.main', letterSpacing: '-0.4px' }}
      >
        {brl.format(grandTotal)}
      </Typography>
    </Stack>
    <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary' }}>
      Uma despesa será lançada no financeiro ao confirmar.
    </Typography>
  </Stack>
  );
}

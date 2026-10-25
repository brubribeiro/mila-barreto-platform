import { InputBase, Stack, Typography } from '@mui/material';
import { fontSizes } from '../../theme/fontSizes';

/** Campo de data "De / Até" do período do Financeiro. */
export function PeriodField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Stack
      component="label"
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        height: 38,
        pl: 1.5,
        pr: 1,
        borderRadius: '11px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.disabled' }}>{label}</Typography>
      <InputBase
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={{ 'aria-label': label }}
        sx={{ fontSize: fontSizes.sm, fontWeight: 600, width: 128 }}
      />
    </Stack>
  );
}

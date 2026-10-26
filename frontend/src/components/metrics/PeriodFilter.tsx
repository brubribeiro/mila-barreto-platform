import { Box, Stack, TextField, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';

const DATE_FIELD_SX = {
  width: { xs: '100%', sm: 170 },
  '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'background.paper' },
} as const;

export function PeriodFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  periodDays,
  datesValid,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  periodDays: number;
  datesValid: boolean;
}) {
  return (
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
          onChange={(e) => onDateFromChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={DATE_FIELD_SX}
        />
        <TextField
          type="date"
          size="small"
          label="Até"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={DATE_FIELD_SX}
        />
      </Stack>
    </Stack>
  );
}

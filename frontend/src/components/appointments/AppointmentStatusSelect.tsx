import { Controller, type Control } from 'react-hook-form';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import { STATUS_DOT, statusOptions, type FormValues } from './appointmentFormModel';

function StatusDot({ status }: { status: string }) {
  return (
    <Box
      component="span"
      sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: STATUS_DOT[status] ?? 'grey.400' }}
    />
  );
}

/** Select de status do agendamento: com rótulo lateral no desktop, campo cheio no celular. */
export function AppointmentStatusSelect({
  control,
  compact,
}: {
  control: Control<FormValues>;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <TextField {...field} select label="Status" size="small" fullWidth>
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        )}
      />
    );
  }

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
      <Typography
        sx={{
          fontSize: fontSizes['2xs'],
          fontWeight: 700,
          color: 'text.secondary',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Status
      </Typography>
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            size="small"
            sx={{ minWidth: 180, flexShrink: 0 }}
            SelectProps={{
              renderValue: (value) => {
                const opt = statusOptions.find((o) => o.value === value);
                return (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <StatusDot status={value as string} />
                    {opt?.label ?? (value as string)}
                  </Box>
                );
              },
            }}
          >
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <StatusDot status={opt.value} />
                  {opt.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}

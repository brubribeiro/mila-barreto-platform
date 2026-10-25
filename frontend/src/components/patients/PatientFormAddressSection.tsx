import { Box, CircularProgress, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { Controller, type Control } from 'react-hook-form';

import { maskCEP, onlyDigits } from '../../utils/masks';
import { FormSection } from '../FormSection';
import type { CepStatus } from './useCepAddressLookup';
import type { PatientFormValues } from './patientFormValues';

/** Campo desabilitado (auto-preenchido pelo CEP): visual claramente inativo, sem hover. */
const ADDRESS_INPUT_SX = { '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const ADDRESS_DISABLED_SX = {
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'grey.100',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: (t: Theme) => t.palette.text.disabled,
    cursor: 'not-allowed',
  },
} as const;

/** Seção "Endereço": CEP com busca automática e campos preenchidos pelo ViaCEP. */
export function PatientFormAddressSection({
  control,
  cepStatus,
  disabled,
}: {
  control: Control<PatientFormValues>;
  cepStatus: CepStatus;
  disabled: boolean;
}) {
  return (
    <FormSection title="Endereço">
      <Stack spacing={1.25}>
        <Box>
          <Controller
            name="cep"
            control={control}
            rules={{
              validate: (v) =>
                !v || onlyDigits(v).length === 0 || onlyDigits(v).length === 8 || 'CEP deve ter 8 dígitos',
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="CEP"
                onChange={(e) => field.onChange(maskCEP(e.target.value))}
                error={!!fieldState.error || cepStatus.error}
                disabled={disabled}
                inputProps={{ inputMode: 'numeric', maxLength: 9 }}
                sx={ADDRESS_INPUT_SX}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {cepStatus.loading ? (
                        <CircularProgress color="inherit" size={16} />
                      ) : (
                        <Tooltip
                          title="Busca automática ao completar 8 dígitos — preenche rua, bairro, cidade e UF."
                          arrow
                        >
                          <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled', cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          {(cepStatus.loading || cepStatus.text) && (
            <Typography
              variant="caption"
              color={cepStatus.error ? 'error.main' : 'text.secondary'}
              sx={{ display: 'block', mt: 0.5, lineHeight: 1.35 }}
            >
              {cepStatus.loading ? 'Consultando CEP…' : cepStatus.text}
            </Typography>
          )}
        </Box>
        <Controller
          name="addressStreet"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              size="small"
              disabled
              placeholder="Logradouro (preenchido pelo CEP)"
              sx={ADDRESS_DISABLED_SX}
            />
          )}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.4fr' }, gap: 1.25 }}>
          <Controller
            name="addressNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="Número"
                inputProps={{ inputMode: 'numeric' }}
                sx={ADDRESS_INPUT_SX}
              />
            )}
          />
          <Controller
            name="addressComplement"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="Complemento (opcional)"
                sx={ADDRESS_INPUT_SX}
              />
            )}
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.3fr 1.3fr 0.6fr' }, gap: 1.25 }}>
          <Controller
            name="addressNeighborhood"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                disabled
                placeholder="Bairro"
                sx={ADDRESS_DISABLED_SX}
              />
            )}
          />
          <Controller
            name="addressCity"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                disabled
                placeholder="Cidade"
                sx={ADDRESS_DISABLED_SX}
              />
            )}
          />
          <Controller
            name="addressState"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                disabled
                placeholder="UF"
                inputProps={{ maxLength: 2, style: { textAlign: 'center', textTransform: 'uppercase' } }}
                sx={ADDRESS_DISABLED_SX}
              />
            )}
          />
        </Box>
      </Stack>
    </FormSection>
  );
}

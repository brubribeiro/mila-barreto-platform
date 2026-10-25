import { Box, MenuItem, TextField } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';

import { isValidCPF, maskCPF, maskPhone } from '../../utils/masks';
import { PATIENT_REFERRAL_SOURCE_OPTIONS } from '../../utils/patientReferralSource';
import { PATIENT_SEX_OPTIONS } from '../../utils/patientSex';
import { LabeledField } from './PatientFormLabeledField';
import type { PatientFormValues } from './patientFormValues';

/** Campos de "Dados do paciente" (abaixo da foto). */
export function PatientFormBasicFields({
  control,
  referralSource,
}: {
  control: Control<PatientFormValues>;
  referralSource: PatientFormValues['referralSource'];
}) {
  return (
    <>
      {/* Nome + CPF (empilhados) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.75 }}>
        <Controller
          name="name"
          control={control}
          rules={{ required: 'Nome é obrigatório' }}
          render={({ field, fieldState }) => (
            <LabeledField label="Nome completo" required>
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="Ex.: Marina Costa"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            </LabeledField>
          )}
        />
        <Controller
          name="document"
          control={control}
          rules={{ validate: (v) => !v || isValidCPF(v) || 'CPF inválido' }}
          render={({ field, fieldState }) => (
            <LabeledField label="CPF">
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="000.000.000-00"
                onChange={(e) => field.onChange(maskCPF(e.target.value))}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                inputProps={{ inputMode: 'numeric', maxLength: 14 }}
              />
            </LabeledField>
          )}
        />
      </Box>

      {/* Telefone + Nascimento */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <LabeledField label="Telefone">
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="(11) 90000-0000"
                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                inputProps={{ inputMode: 'numeric', maxLength: 16 }}
              />
            </LabeledField>
          )}
        />
        <Controller
          name="birthDate"
          control={control}
          render={({ field }) => (
            <LabeledField label="Nascimento">
              <TextField {...field} type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </LabeledField>
          )}
        />
      </Box>

      {/* E-mail */}
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <LabeledField label="E-mail">
            <TextField {...field} type="email" fullWidth size="small" placeholder="email@exemplo.com" />
          </LabeledField>
        )}
      />

      {/* Sexo + Como conheceu */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
        <Controller
          name="sex"
          control={control}
          render={({ field }) => (
            <LabeledField label="Sexo">
              <TextField
                {...field}
                select
                fullWidth
                size="small"
                value={field.value ?? ''}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <em>Não informado</em>
                </MenuItem>
                {PATIENT_SEX_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
          )}
        />
        <Controller
          name="referralSource"
          control={control}
          render={({ field }) => (
            <LabeledField label="Como conheceu">
              <TextField
                {...field}
                select
                fullWidth
                size="small"
                value={field.value ?? ''}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <em>Não informado</em>
                </MenuItem>
                {PATIENT_REFERRAL_SOURCE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
          )}
        />
      </Box>

      {referralSource === 'OTHER' && (
        <Controller
          name="referralSourceOther"
          control={control}
          rules={{
            validate: (v) =>
              referralSource !== 'OTHER' || !!v?.trim() || 'Informe qual é a origem',
          }}
          render={({ field, fieldState }) => (
            <LabeledField label="Especifique a origem" required>
              <TextField
                {...field}
                fullWidth
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                placeholder="Ex.: panfleto, evento..."
              />
            </LabeledField>
          )}
        />
      )}
    </>
  );
}

import { Controller, type Control } from 'react-hook-form';
import { Box, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import type { AppointmentKind, Procedure } from '../../types';
import { brl, kindOptions, selectValueIfListed, type FormValues } from './appointmentFormModel';
import { AppointmentFormSection, LabeledField } from './AppointmentFormSection';
import type { SectionControl } from './PatientSection';
import type { AppointmentProfessionals } from './useAppointmentProfessionals';

export function ServiceSection({
  section,
  control,
  selectedKind,
  procedureOptions,
  selectedProcedure,
  professionals,
}: {
  section: SectionControl;
  control: Control<FormValues>;
  selectedKind: AppointmentKind;
  procedureOptions: Procedure[];
  selectedProcedure?: Procedure;
  professionals: AppointmentProfessionals;
}) {
  const {
    restrictToOwnAppointments,
    user,
    slotValid,
    checkingAvailability,
    verifyingAvailability,
    professionalOptions,
    assignedProfessional,
    selectedProfessional,
    selectedPerformsAppointments,
    loggedUserCannotBeScheduled,
    noProfessionalAvailable,
    professionalSlotConflict,
    markManualSelection,
  } = professionals;

  const kindLabel = kindOptions.find((o) => o.value === selectedKind)?.label;
  const professionalName = restrictToOwnAppointments
    ? (assignedProfessional?.name ?? user?.name)
    : selectedProfessional?.name;
  const summary = [
    selectedKind === 'PROCEDURE' ? (selectedProcedure?.name ?? 'Procedimento não selecionado') : kindLabel,
    professionalName ?? 'Sem profissional',
  ].join(' · ');

  return (
    <AppointmentFormSection {...section} title="Procedimento e profissional" summary={summary}>
      <Stack spacing={2}>
        <Controller
          name="kind"
          control={control}
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={field.value}
              onChange={(_, val) => val && field.onChange(val)}
              size="small"
              sx={{
                bgcolor: 'grey.100',
                p: '4px',
                borderRadius: '11px',
                gap: '4px',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  py: 0.75,
                  border: 'none',
                  borderRadius: '8px !important',
                  fontWeight: 700,
                  fontSize: fontSizes.sm,
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    boxShadow: '0 1px 3px rgba(16,40,37,.14)',
                    '&:hover': { bgcolor: 'background.paper' },
                  },
                },
              }}
            >
              {kindOptions.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        />

        <Controller
          name="procedureId"
          control={control}
          rules={{
            required: selectedKind === 'PROCEDURE' ? 'Selecione um procedimento' : false,
          }}
          render={({ field, fieldState }) => (
            <LabeledField label="Procedimento" required={selectedKind === 'PROCEDURE'}>
              <TextField
                {...field}
                value={selectValueIfListed(field.value, procedureOptions)}
                onChange={field.onChange}
                select
                fullWidth
                disabled={selectedKind !== 'PROCEDURE'}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled>
                  Selecione um procedimento
                </MenuItem>
                {procedureOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
          )}
        />
        {selectedKind === 'PROCEDURE' && (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {[
              selectedProcedure ? `${selectedProcedure.durationMinutes} min` : '— min',
              `Retorno: ${selectedProcedure?.recurrenceDays ?? '—'} dias`,
              selectedProcedure?.price != null ? brl.format(Number(selectedProcedure.price)) : 'R$ —',
            ].map((label) => (
              <Box
                key={label}
                component="span"
                sx={{
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  color: 'text.secondary',
                  px: 1.25,
                  py: 0.6,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                {label}
              </Box>
            ))}
          </Stack>
        )}

        {restrictToOwnAppointments ? (
          <LabeledField label="Profissional">
            <TextField
              value={
                checkingAvailability && slotValid
                  ? 'Verificando disponibilidade...'
                  : (assignedProfessional?.name ?? user?.name ?? '—')
              }
              fullWidth
              InputProps={{ readOnly: true }}
              helperText={
                loggedUserCannotBeScheduled
                  ? 'Seu usuário não realiza atendimentos'
                  : professionalSlotConflict
                    ? 'Este profissional já possui agendamento neste horário'
                    : noProfessionalAvailable
                      ? 'Nenhum profissional disponível neste horário'
                      : 'Agendamento vinculado ao seu usuário'
              }
              error={loggedUserCannotBeScheduled || noProfessionalAvailable || professionalSlotConflict}
            />
          </LabeledField>
        ) : (
          <Controller
            name="professionalId"
            control={control}
            rules={{ required: 'Selecione um profissional' }}
            render={({ field, fieldState }) => (
              <LabeledField label="Profissional" required>
                <TextField
                  {...field}
                  value={selectValueIfListed(field.value, professionalOptions)}
                  onChange={(event) => {
                    markManualSelection();
                    field.onChange(event);
                  }}
                  select
                  fullWidth
                  disabled={!slotValid || (checkingAvailability && professionalOptions.length === 0)}
                  error={!!fieldState.error || noProfessionalAvailable || professionalSlotConflict}
                  helperText={
                    fieldState.error?.message ??
                    (professionalSlotConflict && !selectedPerformsAppointments
                      ? 'Selecione um profissional que realiza atendimentos'
                      : professionalSlotConflict
                        ? 'Este profissional já possui agendamento neste horário'
                        : noProfessionalAvailable
                          ? 'Nenhum profissional disponível neste horário'
                          : verifyingAvailability && slotValid
                            ? 'Atualizando disponibilidade...'
                            : checkingAvailability && slotValid && professionalOptions.length === 0
                              ? 'Verificando disponibilidade...'
                              : 'Lista conforme a data e o horário escolhidos')
                  }
                >
                  {checkingAvailability && slotValid && professionalOptions.length === 0 ? (
                    <MenuItem disabled value="">
                      Verificando disponibilidade...
                    </MenuItem>
                  ) : professionalOptions.length === 0 ? (
                    <MenuItem disabled value="">
                      Nenhum profissional disponível
                    </MenuItem>
                  ) : (
                    professionalOptions.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </LabeledField>
            )}
          />
        )}
      </Stack>
    </AppointmentFormSection>
  );
}

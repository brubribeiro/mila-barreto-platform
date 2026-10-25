import { Controller, type Control } from 'react-hook-form';
import { Grid, TextField } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import {
  formatRecurrenceEarliestLabel,
  isDateBeforeRecurrenceEarliest,
} from '../../utils/appointmentRecurrence';
import type { FormValues } from './appointmentFormModel';
import { AppointmentFormSection, LabeledField } from './AppointmentFormSection';
import type { SectionControl } from './PatientSection';

export function ScheduleSection({
  section,
  control,
  selectedDate,
  selectedStartTime,
  slotEnd,
  slotValid,
  recurrenceEarliestDate,
  recurrenceDays,
}: {
  section: SectionControl;
  control: Control<FormValues>;
  selectedDate: string;
  selectedStartTime: string;
  slotEnd: dayjs.Dayjs;
  slotValid: boolean;
  recurrenceEarliestDate: string | null;
  recurrenceDays?: number | null;
}) {
  const summary = slotValid
    ? `${dayjs(selectedDate).locale('pt-br').format('ddd, DD/MM/YYYY')} · ${selectedStartTime}–${slotEnd.format('HH:mm')}`
    : 'Data ou horário inválidos';

  return (
    <AppointmentFormSection {...section} title="Data e horário" summary={summary}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="date"
            control={control}
            rules={{
              required: true,
              validate: (value) => {
                if (!recurrenceEarliestDate) return true;
                if (isDateBeforeRecurrenceEarliest(value, recurrenceEarliestDate)) {
                  return `Agende a partir de ${formatRecurrenceEarliestLabel(recurrenceEarliestDate)}`;
                }
                return true;
              },
            }}
            render={({ field, fieldState }) => (
              <LabeledField label="Data" required>
                <TextField
                  {...field}
                  type="date"
                  fullWidth
                  inputProps={{ min: recurrenceEarliestDate ?? undefined }}
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    (recurrenceEarliestDate && recurrenceDays
                      ? `Retorno em ${recurrenceDays} dias — a partir de ${formatRecurrenceEarliestLabel(recurrenceEarliestDate)}`
                      : undefined)
                  }
                />
              </LabeledField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="startTime"
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <LabeledField label="Horário" required>
                <TextField
                  {...field}
                  type="time"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={slotValid ? `Término previsto às ${slotEnd.format('HH:mm')}` : undefined}
                />
              </LabeledField>
            )}
          />
        </Grid>
      </Grid>
    </AppointmentFormSection>
  );
}

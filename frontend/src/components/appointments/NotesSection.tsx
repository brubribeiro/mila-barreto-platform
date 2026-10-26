import { Controller, type Control } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';

import type { FormValues } from './appointmentFormModel';
import { AppointmentFormSection, LabeledField } from './AppointmentFormSection';
import type { SectionControl } from './PatientSection';

export function NotesSection({
  section,
  control,
  notes,
  clinicalNotes,
}: {
  section: SectionControl;
  control: Control<FormValues>;
  notes: string;
  clinicalNotes: string;
}) {
  const filled = [notes.trim() && 'administrativas', clinicalNotes.trim() && 'clínicas'].filter(Boolean);
  const summary = filled.length > 0 ? `Anotações ${filled.join(' e ')}` : 'Sem observações';

  return (
    <AppointmentFormSection {...section} title="Observações" summary={summary}>
      <Stack spacing={1.5}>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <LabeledField label="Observações administrativas">
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                placeholder="Lembretes internos, preferências do paciente..."
              />
            </LabeledField>
          )}
        />
        <Controller
          name="clinicalNotes"
          control={control}
          render={({ field }) => (
            <LabeledField label="Anotações clínicas">
              <TextField
                {...field}
                placeholder="Avaliação da pele, produtos usados, reações..."
                fullWidth
                multiline
                minRows={4}
              />
            </LabeledField>
          )}
        />
      </Stack>
    </AppointmentFormSection>
  );
}

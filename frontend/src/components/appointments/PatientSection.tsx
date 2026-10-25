import { useMemo, useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, Box, Button, Popover, Stack, TextField, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarRateRoundedIcon from '@mui/icons-material/StarRateRounded';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { patientsApi, type PatientReliability } from '../../api/patients';
import { fontSizes } from '../../theme/fontSizes';
import type { Patient } from '../../types';
import type { FormValues } from './appointmentFormModel';
import { AppointmentFormSection, LabeledField, type SectionState } from './AppointmentFormSection';

export interface SectionControl {
  step: number;
  expanded: boolean;
  onToggle: () => void;
  state: SectionState;
}

export function PatientSection({
  section,
  control,
  open,
  patients,
  selectedPatient,
}: {
  section: SectionControl;
  control: Control<FormValues>;
  open: boolean;
  patients: Patient[];
  selectedPatient?: Patient;
}) {
  const [summaryAnchor, setSummaryAnchor] = useState<HTMLElement | null>(null);
  const patientId = selectedPatient?.id ?? '';

  const { data: reliability } = useQuery<PatientReliability>({
    queryKey: ['patient-reliability', patientId],
    queryFn: () => patientsApi.getReliability(patientId),
    enabled: open && !!patientId,
  });

  const { data: patientDetail } = useQuery({
    queryKey: ['patient-detail-summary', patientId],
    queryFn: () => patientsApi.findOne(patientId),
    enabled: Boolean(summaryAnchor) && !!patientId,
  });

  const patientSummary = useMemo(() => {
    const appts = patientDetail?.appointments ?? [];
    const completed = appts.filter((a) => a.status === 'COMPLETED');
    const last = [...completed].sort(
      (a, b) => dayjs(b.startAt).valueOf() - dayjs(a.startAt).valueOf(),
    )[0];
    return { visits: completed.length, last };
  }, [patientDetail]);

  return (
    <AppointmentFormSection
      {...section}
      title="Paciente"
      summary={selectedPatient?.name ?? 'Nenhum paciente selecionado'}
    >
      <Controller
        name="patientId"
        control={control}
        rules={{ required: 'Selecione um paciente' }}
        render={({ field, fieldState }) => (
          <LabeledField
            label="Paciente"
            required
            action={
              <Button
                size="small"
                disabled={!selectedPatient}
                onClick={(e) => setSummaryAnchor(e.currentTarget)}
                startIcon={<InfoOutlinedIcon sx={{ fontSize: 15 }} />}
                sx={{ fontSize: fontSizes.xs, fontWeight: 700, py: 0.15, px: 0.75, minWidth: 0 }}
              >
                Resumo
              </Button>
            }
          >
            <Autocomplete
              options={patients}
              getOptionLabel={(p) => p.name}
              value={patients.find((p) => p.id === field.value) ?? null}
              onChange={(_, val) => field.onChange(val?.id ?? '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  placeholder="Buscar paciente pelo nome..."
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </LabeledField>
        )}
      />

      <Popover
        open={Boolean(summaryAnchor)}
        anchorEl={summaryAnchor}
        onClose={() => setSummaryAnchor(null)}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              p: 2,
              mt: 0.5,
              borderRadius: '14px',
              boxShadow: '0 12px 48px -16px rgba(16,40,37,.28)',
            },
          },
        }}
      >
        {selectedPatient && (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '11px',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: fontSizes.sm,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {selectedPatient.name
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0] ?? '')
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>
                  {selectedPatient.name}
                </Typography>
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  {patientSummary.visits} visita{patientSummary.visits !== 1 ? 's' : ''}
                  {patientSummary.last
                    ? ` · última ${dayjs(patientSummary.last.startAt).format('DD MMM YYYY')}`
                    : ''}
                </Typography>
              </Box>
              {reliability && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.25,
                    px: 1,
                    py: 0.4,
                    borderRadius: '8px',
                    bgcolor: 'rgba(201,138,18,.14)',
                    color: '#C98A12',
                    fontSize: fontSizes.xs,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  <StarRateRoundedIcon sx={{ fontSize: 15 }} /> {reliability.reliabilityPercent}
                </Box>
              )}
            </Stack>
            {reliability && reliability.total >= 4 && (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'success.main' }}>
                  Paciente recorrente · {reliability.total} atendimentos
                </Typography>
              </Stack>
            )}
            {patientSummary.last && (
              <Box sx={{ pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography
                  sx={{
                    fontSize: fontSizes['3xs'],
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    mb: 0.5,
                  }}
                >
                  Último atendimento
                </Typography>
                <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600 }}>
                  {patientSummary.last.procedure?.name ?? 'Atendimento'}
                  {patientSummary.last.professional?.name
                    ? ` · ${patientSummary.last.professional.name}`
                    : ''}
                </Typography>
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', mt: 0.25 }}>
                  {dayjs(patientSummary.last.startAt).format('DD MMM YYYY')}
                </Typography>
              </Box>
            )}
            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={0.75}
              sx={{ pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 15, color: '#C98A12', mt: '1px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500, lineHeight: 1.4 }}>
                {selectedPatient.notes?.trim()
                  ? selectedPatient.notes
                  : 'Sem observações clínicas relevantes'}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Popover>
    </AppointmentFormSection>
  );
}

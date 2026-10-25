import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patientsApi } from '../../api/patients';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { FormSection } from '../FormSection';
import type { Patient } from '../../types';
import { onlyDigits } from '../../utils/masks';
import { fontSizes } from '../../theme/fontSizes';
import { PatientFormAddressSection } from './PatientFormAddressSection';
import { PatientFormBasicFields } from './PatientFormBasicFields';
import { LabeledField } from './PatientFormLabeledField';
import { PatientPhotoPicker } from './PatientPhotoPicker';
import {
  buildPatientPayload,
  emptyPatientFormValues,
  patientToFormValues,
  type PatientFormValues,
} from './patientFormValues';
import { useCepAddressLookup } from './useCepAddressLookup';
import { usePatientPhotoDraft } from './usePatientPhotoDraft';

interface PatientFormDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

type PatientFormTab = 'basic' | 'notes';

const TABS: { id: PatientFormTab; label: string; icon: ReactElement }[] = [
  { id: 'basic', label: 'Informações básicas', icon: <BadgeOutlinedIcon fontSize="small" /> },
  { id: 'notes', label: 'Observações', icon: <StickyNote2OutlinedIcon fontSize="small" /> },
];

const DIALOG_MAX_WIDTH = 900;

export function PatientFormDialog({ open, onClose, patient }: PatientFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<PatientFormValues>({
    defaultValues: emptyPatientFormValues,
  });
  const cepWatched = watch('cep');
  const referralSourceWatched = watch('referralSource');
  const nameWatched = watch('name');

  const [tab, setTab] = useState<PatientFormTab>('basic');
  const suppressNextFullCepLookup = useRef(false);
  const photo = usePatientPhotoDraft(open, patient);

  useEffect(() => {
    if (open) {
      setTab('basic');
      const savedCep = patient?.cep ? onlyDigits(patient.cep) : '';
      suppressNextFullCepLookup.current = !!(patient && savedCep.length === 8);
      reset(patient ? patientToFormValues(patient) : emptyPatientFormValues);
    }
  }, [open, patient, reset]);

  const cepStatus = useCepAddressLookup({ cep: cepWatched, open, setValue, suppressNextFullCepLookup });

  const mutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      const payload = buildPatientPayload(values, patient);
      const saved = patient
        ? await patientsApi.update(patient.id, payload)
        : await patientsApi.create(payload);

      const hadPhoto = !!(patient?.photoUrl || patient?.photoStorageKey);
      if (photo.photoRemoved && hadPhoto) {
        await patientsApi.removePhoto(saved.id);
      } else if (photo.photoFile) {
        await patientsApi.uploadPhoto(saved.id, photo.photoFile);
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      toast.success(patient ? 'Paciente atualizado.' : 'Paciente criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o paciente.'));
    },
  });

  const submit = handleSubmit(
    (values) => mutation.mutate(values),
    (errors) => {
      if (errors.name || errors.document || errors.phone || errors.email || errors.cep || errors.referralSourceOther) {
        setTab('basic');
      }
    },
  );

  const isEditing = !!patient;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...dialogPaperSx(isMobile),
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : {
                width: DIALOG_MAX_WIDTH,
                maxWidth: DIALOG_MAX_WIDTH,
                height: 'min(94dvh, 800px)',
                maxHeight: '94dvh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          ...(isMobile ? { height: '100%' } : {}),
        }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={isEditing ? 'Editar paciente' : 'Novo paciente'}
          subtitle={isEditing ? patient.name : 'Adicione um paciente à base'}
          subtitleWrap
          icon={
            isEditing ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <PersonAddOutlinedIcon fontSize="small" />
            )
          }
        />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs
            value={TABS.findIndex((t) => t.id === tab)}
            onChange={(_, idx) => setTab(TABS[idx].id)}
            variant="fullWidth"
            sx={{
              minHeight: 46,
              '& .MuiTab-root': { minHeight: 46, py: 1, textTransform: 'none', fontWeight: 600, fontSize: fontSizes.md },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.id} icon={t.icon} iconPosition="start" label={t.label} sx={{ gap: 0.75 }} />
            ))}
          </Tabs>
        </Box>

        <DialogContent
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          {tab === 'basic' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <FormSection title="Dados do paciente">
              <Stack spacing={1.75}>
                <PatientPhotoPicker
                  src={photo.avatarDisplaySrc}
                  name={nameWatched}
                  error={photo.photoError}
                  disabled={mutation.isPending}
                  onSelect={photo.handlePhotoSelect}
                  onRemove={photo.handlePhotoRemove}
                />
                <PatientFormBasicFields control={control} referralSource={referralSourceWatched} autoFocusName={!patient} />
              </Stack>
            </FormSection>

            <PatientFormAddressSection control={control} cepStatus={cepStatus} disabled={mutation.isPending} />
          </Box>
          )}

          {tab === 'notes' && (
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <LabeledField label="Observações">
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={10}
                    placeholder="Histórico, alergias, preferências, orientações de atendimento..."
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Visível na ficha do paciente e na aba de anotações.
                  </Typography>
                </LabeledField>
              )}
            />
          )}

          {mutation.isError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar paciente'}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button
            onClick={onClose}
            type="button"
            variant="outlined"
            disabled={mutation.isPending}
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' },
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || formState.isSubmitting}
            sx={{ boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar paciente'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

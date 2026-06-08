import { useEffect, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { patientsApi } from '../../api/patients';
import { DialogHeader, dialogActionsBorderSx } from '../DialogCloseButton';
import {
  ANAMNESIS_MULTILINE_KEYS,
  ANAMNESIS_SECTIONS,
  createEmptyAnamnesis,
  mergeAnamnesis,
} from './anamnesisFields';

interface AnamnesisFormDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string | null;
}

type FormValues = Record<string, string | boolean>;

const DIALOG_WIDTH = 920;
const DIALOG_HEIGHT_DESKTOP = 820;

const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
  },
} as const;

const ANAMNESIS_SWITCH_ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  px: 1.5,
  minHeight: 40,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: '#fff',
} as const;

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.75, letterSpacing: '0.06em' }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function AnamnesisFormDialog({ open, onClose, patientId }: AnamnesisFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.findOne(patientId!),
    enabled: open && !!patientId,
  });

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: createEmptyAnamnesis(),
  });

  useEffect(() => {
    if (open && patient) {
      reset(mergeAnamnesis(patient.anamnesis));
    } else if (open && !patientId) {
      reset(createEmptyAnamnesis());
    }
  }, [open, patient, patientId, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => patientsApi.updateAnamnesis(patientId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      onClose();
    },
  });

  const submit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : DIALOG_WIDTH,
          maxWidth: '100%',
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { height: DIALOG_HEIGHT_DESKTOP, maxHeight: '94vh' }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title="Anamnese"
          subtitle={patient?.name ?? 'Carregando paciente…'}
          icon={<AssignmentOutlinedIcon fontSize="small" />}
        />

        <DialogContent
          dividers={false}
          sx={{
            p: { xs: 2, sm: 3 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          {isLoading && !patient ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: '#fff',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Stack spacing={3}>
                {ANAMNESIS_SECTIONS.map((section) => (
                  <FieldGroup key={section.title} title={section.title}>
                    <Grid container spacing={2} alignItems="flex-start">
                      {section.fields.map((fieldDef) => {
                        if (fieldDef.type === 'boolean') {
                          return (
                            <Grid item xs={12} sm={6} key={fieldDef.key}>
                              <Controller
                                name={fieldDef.key}
                                control={control}
                                render={({ field }) => (
                                  <Box sx={ANAMNESIS_SWITCH_ROW_SX}>
                                    <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
                                      {fieldDef.label}
                                    </Typography>
                                    <Switch
                                      checked={!!field.value}
                                      onChange={(e) => field.onChange(e.target.checked)}
                                      size="small"
                                    />
                                  </Box>
                                )}
                              />
                            </Grid>
                          );
                        }

                        const gridSm = fieldDef.fullWidth ? 12 : 6;

                        if (fieldDef.type === 'select') {
                          return (
                            <Grid item xs={12} sm={gridSm} key={fieldDef.key}>
                              <Controller
                                name={fieldDef.key}
                                control={control}
                                render={({ field }) => (
                                  <FormControl fullWidth size="small" sx={FIELD_SX}>
                                    <InputLabel shrink>{fieldDef.label}</InputLabel>
                                    <Select
                                      {...field}
                                      label={fieldDef.label}
                                      displayEmpty
                                      value={(field.value as string) ?? ''}
                                    >
                                      <MenuItem value="">
                                        <em>Não informado</em>
                                      </MenuItem>
                                      {fieldDef.options!.map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                          {opt}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />
                            </Grid>
                          );
                        }

                        const multiline =
                          fieldDef.fullWidth || ANAMNESIS_MULTILINE_KEYS.has(fieldDef.key);

                        return (
                          <Grid item xs={12} sm={gridSm} key={fieldDef.key}>
                            <Controller
                              name={fieldDef.key}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  label={fieldDef.label}
                                  fullWidth
                                  size="small"
                                  multiline={multiline}
                                  minRows={multiline ? 2 : undefined}
                                  placeholder={fieldDef.placeholder}
                                  sx={FIELD_SX}
                                  value={(field.value as string) ?? ''}
                                />
                              )}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </FieldGroup>
                ))}
              </Stack>
            </Paper>
          )}

          {mutation.isError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar anamnese'}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={dialogActionsBorderSx}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || isLoading || !patient}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar anamnese'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

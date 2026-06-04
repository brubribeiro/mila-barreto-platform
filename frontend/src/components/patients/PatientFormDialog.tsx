import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import CloseIcon from '@mui/icons-material/Close';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import WcOutlinedIcon from '@mui/icons-material/WcOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patientsApi, PatientPayload } from '../../api/patients';
import type { Patient, PatientSex, PatientReferralSource } from '../../types';
import { isValidCPF, maskCPF, maskCEP, maskPhone, onlyDigits } from '../../utils/masks';
import { birthDatePayloadFromInput, dateInputValueFromApi } from '../../utils/dateOnly';
import { PATIENT_SEX_OPTIONS } from '../../utils/patientSex';
import { PATIENT_REFERRAL_SOURCE_OPTIONS } from '../../utils/patientReferralSource';
import {
  applyViaCepToAddressFields,
  clearViaCepAddressFields,
} from '../../utils/patientAddress';
import { fetchViaCepDigits } from '../../utils/viaCep';

interface PatientFormDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

type FormValues = PatientPayload;
type PatientFormTab = 'basic' | 'notes';

const TABS: { id: PatientFormTab; label: string; icon: ReactNode }[] = [
  { id: 'basic', label: 'Informações básicas', icon: <BadgeOutlinedIcon fontSize="small" /> },
  { id: 'notes', label: 'Observações', icon: <StickyNote2OutlinedIcon fontSize="small" /> },
];

const empty: FormValues = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  sex: '',
  document: '',
  cep: '',
  addressStreet: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressNumber: '',
  addressComplement: '',
  notes: '',
  referralSource: '',
  referralSourceOther: '',
};

const DIALOG_HEIGHT_DESKTOP = 840;

const AUTOFILL_WHITE = {
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 1000px #fff inset',
    WebkitTextFillColor: '#2A2A2A',
    caretColor: '#2A2A2A',
  },
  '& input:-webkit-autofill:hover': {
    WebkitBoxShadow: '0 0 0 1000px #fff inset',
  },
  '& input:-webkit-autofill:focus': {
    WebkitBoxShadow: '0 0 0 1000px #fff inset',
  },
} as const;

/** Fundo branco nos campos editáveis. */
const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
  },
  ...AUTOFILL_WHITE,
} as const;

/** Campos preenchidos pelo CEP (somente leitura). */
const AUTO_FIELD_SX = {
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'grey.50',
    WebkitTextFillColor: (theme) => theme.palette.text.primary,
  },
  '& input:-webkit-autofill:disabled': {
    WebkitBoxShadow: '0 0 0 1000px #F4F4F2 inset',
    WebkitTextFillColor: '#2A2A2A',
  },
} as const;

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <Box
      role="tabpanel"
      aria-hidden={!active}
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1.5, sm: 2.5 },
        overflow: 'auto',
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {children}
    </Box>
  );
}

function FieldsCard({ children }: { children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1.5, sm: 2 },
        bgcolor: '#fff',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      {children}
    </Paper>
  );
}

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

export function PatientFormDialog({ open, onClose, patient }: PatientFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({
    defaultValues: empty,
  });
  const cepWatched = watch('cep');
  const referralSourceWatched = watch('referralSource');

  const [tab, setTab] = useState<PatientFormTab>('basic');
  const suppressNextFullCepLookup = useRef(false);

  useEffect(() => {
    if (open) {
      setTab('basic');
      const savedCep = patient?.cep ? onlyDigits(patient.cep) : '';
      suppressNextFullCepLookup.current = !!(patient && savedCep.length === 8);
      reset(
        patient
          ? {
              name: patient.name,
              email: patient.email ?? '',
              phone: patient.phone ? maskPhone(patient.phone) : '',
              birthDate: dateInputValueFromApi(patient.birthDate),
              sex: patient.sex ?? '',
              document: patient.document ? maskCPF(patient.document) : '',
              cep: savedCep ? maskCEP(savedCep) : '',
              addressStreet: patient.addressStreet ?? '',
              addressNeighborhood: patient.addressNeighborhood ?? '',
              addressCity: patient.addressCity ?? '',
              addressState: patient.addressState ?? '',
              addressNumber: patient.addressNumber ?? '',
              addressComplement: patient.addressComplement ?? '',
              notes: patient.notes ?? '',
              referralSource: patient.referralSource ?? '',
              referralSourceOther: patient.referralSourceOther ?? '',
            }
          : empty,
      );
    }
  }, [open, patient, reset]);

  const [cepStatus, setCepStatus] = useState<{ loading?: boolean; error?: boolean; text?: string }>(
    {},
  );

  useEffect(() => {
    const d = onlyDigits(cepWatched ?? '');
    if (d.length !== 8 || !open) {
      setCepStatus({});
      suppressNextFullCepLookup.current = false;
      clearViaCepAddressFields({
        setStreet: (v) => setValue('addressStreet', v, { shouldValidate: false }),
        setNeighborhood: (v) => setValue('addressNeighborhood', v, { shouldValidate: false }),
        setCity: (v) => setValue('addressCity', v, { shouldValidate: false }),
        setState: (v) => setValue('addressState', v, { shouldValidate: false }),
      });
      return;
    }

    if (suppressNextFullCepLookup.current) {
      suppressNextFullCepLookup.current = false;
      setCepStatus({});
      return;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setCepStatus({ loading: true, error: false, text: undefined });
      fetchViaCepDigits(d, ac.signal)
        .then((ok) => {
          if (ac.signal.aborted) return;
          if (!ok) {
            clearViaCepAddressFields({
              setStreet: (v) => setValue('addressStreet', v, { shouldValidate: false }),
              setNeighborhood: (v) => setValue('addressNeighborhood', v, { shouldValidate: false }),
              setCity: (v) => setValue('addressCity', v, { shouldValidate: false }),
              setState: (v) => setValue('addressState', v, { shouldValidate: false }),
            });
            setCepStatus({ loading: false, error: true, text: 'CEP não encontrado.' });
            return;
          }
          applyViaCepToAddressFields(ok, {
            setStreet: (v) => setValue('addressStreet', v, { shouldValidate: false }),
            setNeighborhood: (v) => setValue('addressNeighborhood', v, { shouldValidate: false }),
            setCity: (v) => setValue('addressCity', v, { shouldValidate: false }),
            setState: (v) => setValue('addressState', v, { shouldValidate: false }),
          });
          const msg = ok.logradouro
            ? 'Endereço preenchido pelo CEP — informe número e complemento.'
            : 'CEP encontrado — informe rua, número e complemento.';
          setCepStatus({ loading: false, error: false, text: msg });
        })
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name === 'AbortError') return;
          if (ac.signal.aborted) return;
          setCepStatus({
            loading: false,
            error: true,
            text: 'Não foi possível consultar o CEP.',
          });
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [cepWatched, open, setValue]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const cepDigits = onlyDigits(values.cep ?? '');
      const payload: PatientPayload = {
        name: values.name,
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: onlyDigits(values.phone) } : {}),
        ...(values.birthDate ? { birthDate: birthDatePayloadFromInput(values.birthDate) } : {}),
        ...(patient || values.sex ? { sex: (values.sex as PatientSex | '') || '' } : {}),
        ...(values.document ? { document: onlyDigits(values.document) } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
        ...(patient || values.referralSource
          ? { referralSource: (values.referralSource as PatientReferralSource | '') || '' }
          : {}),
        ...(patient || values.referralSourceOther !== undefined
          ? {
              referralSourceOther:
                values.referralSource === 'OTHER'
                  ? values.referralSourceOther?.trim() ?? ''
                  : '',
            }
          : {}),
        ...(patient
          ? {
              cep: cepDigits.length === 8 ? cepDigits : '',
              addressStreet: values.addressStreet?.trim() ?? '',
              addressNeighborhood: values.addressNeighborhood?.trim() ?? '',
              addressCity: values.addressCity?.trim() ?? '',
              addressState: values.addressState?.trim() ?? '',
              addressNumber: values.addressNumber?.trim() ?? '',
              addressComplement: values.addressComplement?.trim() ?? '',
            }
          : {
              ...(cepDigits.length === 8 ? { cep: cepDigits } : {}),
              ...(values.addressStreet?.trim()
                ? { addressStreet: values.addressStreet.trim() }
                : {}),
              ...(values.addressNeighborhood?.trim()
                ? { addressNeighborhood: values.addressNeighborhood.trim() }
                : {}),
              ...(values.addressCity?.trim() ? { addressCity: values.addressCity.trim() } : {}),
              ...(values.addressState?.trim()
                ? { addressState: values.addressState.trim() }
                : {}),
              ...(values.addressNumber?.trim()
                ? { addressNumber: values.addressNumber.trim() }
                : {}),
              ...(values.addressComplement?.trim()
                ? { addressComplement: values.addressComplement.trim() }
                : {}),
            }),
      };
      return patient ? patientsApi.update(patient.id, payload) : patientsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      onClose();
    },
  });

  const submit = handleSubmit(
    (values) => mutation.mutate(values),
    (errors) => {
      if (errors.name || errors.document || errors.cep) setTab('basic');
    },
  );

  const isEditing = !!patient;
  const tabIndex = tab === 'basic' ? 0 : 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
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
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 3 },
            pt: { xs: 1.5, sm: 2 },
            pb: { xs: 1, sm: 1.5 },
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            {isMobile && (
              <IconButton edge="start" onClick={onClose} aria-label="Fechar" size="small">
                <CloseIcon />
              </IconButton>
            )}
            {!isMobile && (
              <HeaderIcon>
                {isEditing ? (
                  <PersonOutlineIcon fontSize="small" />
                ) : (
                  <PersonAddOutlinedIcon fontSize="small" />
                )}
              </HeaderIcon>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} noWrap>
                {isEditing ? 'Editar paciente' : 'Novo paciente'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {isEditing ? patient.name : 'Dados do cadastro e observações'}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, idx) => setTab(TABS[idx].id)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': { minHeight: 48, py: 1, textTransform: 'none', fontWeight: 500 },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.id} icon={t.icon} iconPosition="start" label={t.label} sx={{ gap: 0.75 }} />
            ))}
          </Tabs>
        </Box>

        <DialogContent
          dividers={false}
          sx={{
            p: 0,
            flex: 1,
            minHeight: 0,
            bgcolor: 'grey.50',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <TabPanel active={tab === 'basic'}>
            <FieldsCard>
              <Stack spacing={1.5} divider={<Divider flexItem />} sx={{ flex: 1, minHeight: 0 }}>
                <FieldGroup title="Identificação">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12}>
                      <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Nome é obrigatório' }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="Nome completo"
                            fullWidth
                            required
                            size="small"
                            sx={FIELD_SX}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonOutlineIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="birthDate"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="date"
                            label="Nascimento"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CakeOutlinedIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="sex"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth size="small" sx={FIELD_SX}>
                            <InputLabel id="patient-sex-label" shrink>
                              Sexo
                            </InputLabel>
                            <Select
                              {...field}
                              labelId="patient-sex-label"
                              label="Sexo"
                              displayEmpty
                              value={field.value ?? ''}
                              input={
                                <OutlinedInput
                                  label="Sexo"
                                  notched
                                  startAdornment={
                                    <InputAdornment position="start">
                                      <WcOutlinedIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                  }
                                />
                              }
                            >
                              <MenuItem value="">
                                <em>Não informado</em>
                              </MenuItem>
                              {PATIENT_SEX_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="document"
                        control={control}
                        rules={{
                          validate: (v) => !v || isValidCPF(v) || 'CPF inválido',
                        }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="CPF"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            placeholder="000.000.000-00"
                            onChange={(e) => field.onChange(maskCPF(e.target.value))}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            inputProps={{ inputMode: 'numeric', maxLength: 14 }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <BadgeOutlinedIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </FieldGroup>

                <FieldGroup title="Contato">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Telefone"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            placeholder="(11) 99999-0000"
                            onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            inputProps={{ inputMode: 'numeric', maxLength: 16 }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PhoneOutlinedIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="E-mail"
                            type="email"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <EmailOutlinedIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </FieldGroup>

                <FieldGroup title="Como conheceu a clínica">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} sm={referralSourceWatched === 'OTHER' ? 6 : 12}>
                      <Controller
                        name="referralSource"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth size="small" sx={FIELD_SX}>
                            <InputLabel id="patient-referral-label" shrink>
                              Origem
                            </InputLabel>
                            <Select
                              {...field}
                              labelId="patient-referral-label"
                              label="Origem"
                              displayEmpty
                              value={field.value ?? ''}
                            >
                              <MenuItem value="">
                                <em>Não informado</em>
                              </MenuItem>
                              {PATIENT_REFERRAL_SOURCE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                    {referralSourceWatched === 'OTHER' && (
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="referralSourceOther"
                          control={control}
                          rules={{
                            validate: (v) =>
                              referralSourceWatched !== 'OTHER' ||
                              !!v?.trim() ||
                              'Informe qual é a origem',
                          }}
                          render={({ field, fieldState }) => (
                            <TextField
                              {...field}
                              label="Especifique"
                              fullWidth
                              size="small"
                              sx={FIELD_SX}
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                              placeholder="Ex.: panfleto, evento..."
                            />
                          )}
                        />
                      </Grid>
                    )}
                  </Grid>
                </FieldGroup>

                <FieldGroup title="Endereço">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name="cep"
                        control={control}
                        rules={{
                          validate: (v) =>
                            !v ||
                            onlyDigits(v).length === 0 ||
                            onlyDigits(v).length === 8 ||
                            'CEP deve ter 8 dígitos',
                        }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="CEP"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            placeholder="00000-000"
                            onChange={(e) => field.onChange(maskCEP(e.target.value))}
                            error={!!fieldState.error || cepStatus.error}
                            helperText={fieldState.error?.message}
                            FormHelperTextProps={{ sx: { whiteSpace: 'nowrap', m: 0 } }}
                            disabled={mutation.isPending}
                            inputProps={{ inputMode: 'numeric', maxLength: 9 }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LocationOnOutlinedIcon fontSize="small" color="action" />
                                </InputAdornment>
                              ),
                              endAdornment: cepStatus.loading ? (
                                <InputAdornment position="end">
                                  <CircularProgress color="inherit" size={18} />
                                </InputAdornment>
                              ) : undefined,
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <Controller
                        name="addressStreet"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Rua"
                            fullWidth
                            size="small"
                            disabled
                            sx={AUTO_FIELD_SX}
                            placeholder="Preenchido pelo CEP"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Controller
                        name="addressNeighborhood"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Bairro"
                            fullWidth
                            size="small"
                            disabled
                            sx={AUTO_FIELD_SX}
                            placeholder="Preenchido pelo CEP"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Controller
                        name="addressCity"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Cidade"
                            fullWidth
                            size="small"
                            disabled
                            sx={AUTO_FIELD_SX}
                            placeholder="Preenchido pelo CEP"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Controller
                        name="addressState"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="UF"
                            fullWidth
                            size="small"
                            disabled
                            sx={AUTO_FIELD_SX}
                            placeholder="—"
                            inputProps={{ maxLength: 2 }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Controller
                        name="addressNumber"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Número"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            placeholder="Ex.: 123"
                            inputProps={{ inputMode: 'numeric' }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={9}>
                      <Controller
                        name="addressComplement"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Complemento"
                            fullWidth
                            size="small"
                            sx={FIELD_SX}
                            placeholder="Apto, bloco, casa…"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        variant="caption"
                        component="p"
                        color={cepStatus.error ? 'error.main' : 'text.secondary'}
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.4,
                          m: 0,
                        }}
                      >
                        {cepStatus.loading
                          ? 'Consultando CEP…'
                          : cepStatus.text ?? 'Busca automática ao completar 8 dígitos'}
                      </Typography>
                    </Grid>
                  </Grid>
                </FieldGroup>
              </Stack>
            </FieldsCard>
          </TabPanel>

          <TabPanel active={tab === 'notes'}>
            <FieldsCard>
              <Stack sx={{ flex: 1, minHeight: 0, height: '100%' }}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Observações"
                      fullWidth
                      multiline
                      placeholder="Preferências, alergias, histórico relevante, orientações de atendimento…"
                      sx={{
                        flex: 1,
                        ...FIELD_SX,
                        '& .MuiOutlinedInput-root': {
                          height: '100%',
                          alignItems: 'flex-start',
                        },
                        '& textarea': {
                          height: '100% !important',
                          minHeight: '100% !important',
                          boxSizing: 'border-box',
                        },
                      }}
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, flexShrink: 0 }}>
                  Visível na ficha do paciente e na aba de anotações.
                </Typography>
              </Stack>
            </FieldsCard>
          </TabPanel>
          </Box>

          {mutation.isError && (
            <Alert severity="error" variant="outlined" sx={{ mx: { xs: 2, sm: 3 }, mb: 2 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar paciente'}
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            gap: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
          }}
        >
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={mutation.isPending || formState.isSubmitting}
            sx={{ minWidth: 120 }}
          >
            {mutation.isPending ? 'Salvando…' : isEditing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

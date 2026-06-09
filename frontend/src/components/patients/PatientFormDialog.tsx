import { useEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
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
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
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
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patientsApi, PatientPayload } from '../../api/patients';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
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
import {
  PATIENT_PHOTO_ACCEPT,
  patientInitials,
  validatePatientPhotoFile,
} from '../../utils/patientPhoto';

interface PatientFormDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

type FormValues = PatientPayload;
type PatientFormTab = 'basic' | 'notes';

const TABS: { id: PatientFormTab; label: string; icon: ReactElement }[] = [
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

const DIALOG_MAX_WIDTH = 900;
const DIALOG_HEIGHT_DESKTOP = 880;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
} as const;

const FORM_CARD_FILL_SX = {
  ...FORM_CARD_SX,
  flex: 1,
  minHeight: 0,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const;

function SectionIcon({ children }: { children: ReactNode }) {
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

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <SectionIcon>{icon}</SectionIcon>
      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
        {title}
      </Typography>
    </Stack>
  );
}

function buildPatientOptionalFields(
  values: FormValues,
  isEditing: boolean,
): Partial<PatientPayload> {
  const sex = values.sex as PatientSex | '';
  const referralSource = values.referralSource as PatientReferralSource | '';
  const out: Partial<PatientPayload> = {};

  if (isEditing || sex) {
    out.sex = sex || null;
  }

  const trimmedNotes = values.notes?.trim() ?? '';
  if (isEditing) {
    out.notes = trimmedNotes;
  } else if (trimmedNotes) {
    out.notes = trimmedNotes;
  }

  if (referralSource === 'OTHER') {
    out.referralSource = 'OTHER';
    out.referralSourceOther = values.referralSourceOther?.trim() ?? '';
  } else if (isEditing || referralSource) {
    out.referralSource = referralSource || null;
    if (isEditing) {
      out.referralSourceOther = '';
    }
  }

  return out;
}

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
    bgcolor: 'background.default',
    WebkitTextFillColor: 'text.primary',
  },
  '& input:-webkit-autofill:disabled': {
    WebkitBoxShadow: '0 0 0 1000px #F4F4F2 inset',
    WebkitTextFillColor: '#2A2A2A',
  },
} as const;

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
        overflow: 'auto',
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
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
  const nameWatched = watch('name');

  const [tab, setTab] = useState<PatientFormTab>('basic');
  const suppressNextFullCepLookup = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const revokeBlobPreview = (url: string | null) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (open) {
      setTab('basic');
      setPhotoFile(null);
      setPhotoRemoved(false);
      setPhotoError(null);
      setPhotoPreview(patient?.photoUrl ?? null);
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

  useEffect(
    () => () => {
      revokeBlobPreview(photoPreview);
    },
    [photoPreview],
  );

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validatePatientPhotoFile(file);
    if (err) {
      setPhotoError(err);
      return;
    }
    setPhotoError(null);
    setPhotoRemoved(false);
    revokeBlobPreview(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoRemove = () => {
    revokeBlobPreview(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    setPhotoError(null);
  };

  const avatarDisplaySrc =
    photoRemoved ? undefined : photoPreview ?? undefined;

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
    mutationFn: async (values: FormValues) => {
      const cepDigits = onlyDigits(values.cep ?? '');
      const payload: PatientPayload = {
        name: values.name,
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: onlyDigits(values.phone) } : {}),
        ...(values.birthDate ? { birthDate: birthDatePayloadFromInput(values.birthDate) } : {}),
        ...(values.document ? { document: onlyDigits(values.document) } : {}),
        ...buildPatientOptionalFields(values, !!patient),
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
      const saved = patient
        ? await patientsApi.update(patient.id, payload)
        : await patientsApi.create(payload);

      const hadPhoto = !!(patient?.photoUrl || patient?.photoStorageKey);
      if (photoRemoved && hadPhoto) {
        await patientsApi.removePhoto(saved.id);
      } else if (photoFile) {
        await patientsApi.uploadPhoto(saved.id, photoFile);
      }

      return saved;
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
      if (errors.name || errors.document || errors.cep || errors.referralSourceOther) {
        setTab('basic');
      }
    },
  );

  const isEditing = !!patient;
  const tabIndex = TABS.findIndex((t) => t.id === tab);

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
                maxWidth: DIALOG_MAX_WIDTH,
                height: DIALOG_HEIGHT_DESKTOP,
                maxHeight: '94vh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <Box
        component="form"
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
          subtitle={isEditing ? patient.name : 'Dados do cadastro e observações'}
          icon={
            isEditing ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <PersonAddOutlinedIcon fontSize="small" />
            )
          }
        />

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
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            bgcolor: (t) => t.palette.background.default,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <TabPanel active={tab === 'basic'}>
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação" />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'auto 1fr', sm: '80px 1fr' },
                      columnGap: 2,
                      rowGap: 1.25,
                      alignItems: 'start',
                    }}
                  >
                    <Stack
                      alignItems="center"
                      spacing={0.5}
                      sx={{ gridColumn: 1, gridRow: { xs: 1, sm: '1 / 4' } }}
                    >
                      <input
                        ref={photoInputRef}
                        type="file"
                        hidden
                        accept={PATIENT_PHOTO_ACCEPT}
                        onChange={handlePhotoSelect}
                      />
                      <Box sx={{ position: 'relative', lineHeight: 0 }}>
                        <Tooltip
                          title={
                            <Typography variant="caption" display="block" sx={{ maxWidth: 200 }}>
                              {avatarDisplaySrc ? 'Alterar foto' : 'Adicionar foto'}
                              <br />
                              JPEG, PNG ou WebP — máx. 5 MB
                            </Typography>
                          }
                          arrow
                          placement="top"
                        >
                          <Box
                            component="button"
                            type="button"
                            disabled={mutation.isPending}
                            aria-label={
                              avatarDisplaySrc
                                ? 'Alterar foto do paciente'
                                : 'Adicionar foto do paciente'
                            }
                            onClick={() => photoInputRef.current?.click()}
                            sx={{
                              position: 'relative',
                              p: 0,
                              border: 0,
                              bgcolor: 'transparent',
                              borderRadius: '50%',
                              cursor: mutation.isPending ? 'default' : 'pointer',
                              lineHeight: 0,
                              '&:hover .patient-photo-overlay': { opacity: 1 },
                              '&:focus-visible': {
                                outline: 2,
                                outlineColor: 'primary.main',
                                outlineOffset: 2,
                              },
                            }}
                          >
                            <Avatar
                              src={avatarDisplaySrc}
                              alt={nameWatched || 'Paciente'}
                              sx={{
                                width: { xs: 64, sm: 72 },
                                height: { xs: 64, sm: 72 },
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                color: 'primary.dark',
                                border: 1,
                                borderColor: 'divider',
                              }}
                            >
                              {patientInitials(nameWatched || '?')}
                            </Avatar>
                            <Box
                              className="patient-photo-overlay"
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: (t) => alpha(t.palette.common.black, 0.45),
                                color: 'common.white',
                                opacity: avatarDisplaySrc ? 0 : 0.85,
                                transition: 'opacity 0.2s ease',
                              }}
                            >
                              <PhotoCameraOutlinedIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
                            </Box>
                          </Box>
                        </Tooltip>
                        {avatarDisplaySrc && (
                          <IconButton
                            size="small"
                            aria-label="Remover foto do paciente"
                            disabled={mutation.isPending}
                            onClick={handlePhotoRemove}
                            sx={{
                              position: 'absolute',
                              top: -4,
                              right: -4,
                              width: 22,
                              height: 22,
                              bgcolor: 'background.paper',
                              border: 1,
                              borderColor: 'divider',
                              boxShadow: 1,
                              '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Box>
                      {photoError && (
                        <Typography variant="caption" color="error" textAlign="center">
                          {photoError}
                        </Typography>
                      )}
                    </Stack>

                    <Box sx={{ gridColumn: 2, gridRow: 1, minWidth: 0 }}>
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
                    </Box>

                    <Box
                      sx={{
                        gridColumn: { xs: '1 / -1', sm: 2 },
                        gridRow: 2,
                        minWidth: 0,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                        gap: 1.25,
                        alignItems: 'start',
                      }}
                    >
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
                    </Box>

                    <Box
                      sx={{
                        gridColumn: { xs: '1 / -1', sm: 2 },
                        gridRow: 3,
                        minWidth: 0,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 1.25,
                        alignItems: 'start',
                      }}
                    >
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
                    </Box>
                  </Box>
              </Paper>

              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<BadgeOutlinedIcon fontSize="small" />} title="Como conheceu a clínica" />
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
              </Paper>

              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LocationOnOutlinedIcon fontSize="small" />} title="Endereço" />
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
              </Paper>
            </Stack>
          </TabPanel>

          <TabPanel active={tab === 'notes'}>
            <Paper variant="outlined" sx={FORM_CARD_FILL_SX}>
              <SectionTitle icon={<StickyNote2OutlinedIcon fontSize="small" />} title="Observações" />
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
            </Paper>
          </TabPanel>
          </Box>

          {mutation.isError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2, flexShrink: 0 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar paciente'}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || formState.isSubmitting}
          >
            {mutation.isPending ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar paciente'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patientsApi, PatientPayload } from '../../api/patients';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { FormSection } from '../FormSection';
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
import { fontSizes } from '../../theme/fontSizes';

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

/** Campo desabilitado (auto-preenchido pelo CEP): visual claramente inativo, sem hover. */
const ADDRESS_INPUT_SX = { '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } } as const;
const ADDRESS_DISABLED_SX = {
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'grey.100',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: (t: import('@mui/material').Theme) => t.palette.text.disabled,
    cursor: 'not-allowed',
  },
} as const;

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

function LabeledField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
      <Typography
        component="span"
        sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.primary' }}
      >
        {label}
        {required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
      </Typography>
      {children}
    </Box>
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

const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
  },
  ...AUTOFILL_WHITE,
} as const;

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
  const toast = useAppToast();
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
      // Durante o carregamento inicial (edição) o CEP ainda não chegou ao form —
      // não limpa o endereço salvo nem reseta o "suppress", senão a busca refaz depois.
      if (!suppressNextFullCepLookup.current) {
        clearViaCepAddressFields({
          setStreet: (v) => setValue('addressStreet', v, { shouldValidate: false }),
          setNeighborhood: (v) => setValue('addressNeighborhood', v, { shouldValidate: false }),
          setCity: (v) => setValue('addressCity', v, { shouldValidate: false }),
          setState: (v) => setValue('addressState', v, { shouldValidate: false }),
        });
      }
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
      if (errors.name || errors.document || errors.cep || errors.referralSourceOther) {
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
            {/* Foto centralizada acima dos campos */}
            <Stack alignItems="center" spacing={0.75}>
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
                    aria-label={avatarDisplaySrc ? 'Alterar foto do paciente' : 'Adicionar foto do paciente'}
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
                      '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
                    }}
                  >
                    <Avatar
                      src={avatarDisplaySrc}
                      alt={nameWatched || 'Paciente'}
                      sx={{
                        width: 72,
                        height: 72,
                        fontSize: fontSizes['3xl'],
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
                      <PhotoCameraOutlinedIcon sx={{ fontSize: 26 }} />
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

            {referralSourceWatched === 'OTHER' && (
              <Controller
                name="referralSourceOther"
                control={control}
                rules={{
                  validate: (v) =>
                    referralSourceWatched !== 'OTHER' || !!v?.trim() || 'Informe qual é a origem',
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

              </Stack>
            </FormSection>

            {/* Endereço */}
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
                        disabled={mutation.isPending}
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
            {mutation.isPending ? 'Salvando…' : isEditing ? 'Salvar paciente' : 'Salvar paciente'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

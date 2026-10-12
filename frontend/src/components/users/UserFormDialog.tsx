import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi, UserPayload } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { LabeledField } from '../LabeledField';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { UserSummary } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: UserSummary | null;
  /** Ao criar (sem user), pré-seleciona o vínculo como profissional. */
  presetProfessional?: boolean;
}

type FormValues = {
  name: string;
  email: string;
  roleId: string;
  active: boolean;
  providesAppointments: boolean;
  isPrimary: boolean;
  specialty: string;
  councilRegister: string;
  calendarColor: string;
  bio: string;
  specialties: string[];
};

const SPECIALTY_OPTIONS = [
  'Toxina',
  'Preenchimento',
  'Laser',
  'Limpeza',
  'Peeling',
  'Skinbooster',
  'Drenagem',
  'Microagulhamento',
];

const COLOR_SWATCHES = ['#15998B', '#E0915B', '#5BA8DE', '#D46B8A', '#9B7BD4', '#4FB3A8', '#C99230', '#5A9A7D'];

const DIALOG_MAX_WIDTH = 620;

function makeEmpty(presetProfessional: boolean): FormValues {
  return {
    name: '',
    email: '',
    roleId: '',
    active: true,
    providesAppointments: presetProfessional,
    isPrimary: false,
    specialty: '',
    councilRegister: '',
    calendarColor: '',
    bio: '',
    specialties: [],
  };
}

export function UserFormDialog({ open, onClose, user, presetProfessional = false }: UserFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: makeEmpty(presetProfessional),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setPhotoPreview(user?.photoUrl ?? null);
    reset(
      user
        ? {
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            active: user.active,
            providesAppointments: user.providesAppointments ?? false,
            isPrimary: user.isPrimary ?? false,
            specialty: user.specialty ?? '',
            councilRegister: user.councilRegister ?? '',
            calendarColor: user.calendarColor ?? '',
            bio: user.bio ?? '',
            specialties: user.specialties ?? [],
          }
        : makeEmpty(presetProfessional),
    );
  }, [open, user, presetProfessional, reset]);

  const isProfessional = watch('providesAppointments');
  const nameValue = watch('name');
  const calendarColor = watch('calendarColor');

  const photoUpload = useMutation({
    mutationFn: (file: File) => usersApi.uploadPhoto(user!.id, file),
    onSuccess: (updated) => {
      setPhotoPreview(updated.photoUrl ?? null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foto atualizada.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível enviar a foto.')),
  });

  const photoRemove = useMutation({
    mutationFn: () => usersApi.removePhoto(user!.id),
    onSuccess: () => {
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foto removida.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível remover a foto.')),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const professional = values.providesAppointments;
      const payload: UserPayload = {
        name: values.name.trim(),
        email: values.email.trim(),
        roleId: values.roleId,
        active: values.active,
        providesAppointments: professional,
        isPrimary: professional ? values.isPrimary : false,
        specialty: professional ? values.specialty.trim() || null : null,
        specialties: professional ? values.specialties : [],
        councilRegister: professional ? values.councilRegister.trim() || null : null,
        calendarColor: professional ? values.calendarColor || null : null,
        bio: professional ? values.bio.trim() || null : null,
      };
      if (user) return usersApi.update(user.id, payload);
      return usersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'appointment-providers'] });
      queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
      toast.success(user ? 'Usuário atualizado.' : 'Usuário criado.');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível salvar o usuário.')),
  });

  const photoBusy = photoUpload.isPending || photoRemove.isPending;

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
          width: '100%',
          ...(isMobile ? { height: '100%', maxHeight: '100dvh' } : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh' }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={user ? 'Editar usuário' : 'Novo usuário'}
          subtitle="Conceda acesso à plataforma"
          icon={user ? <EditOutlinedIcon fontSize="small" /> : <PersonAddOutlinedIcon fontSize="small" />}
        />

        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: 'background.paper',
            // MUI zera o padding-top quando o content segue o DialogTitle; força o espaçamento
            '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
          }}
        >
          <Stack spacing={2}>
            <Controller
              name="providesAppointments"
              control={control}
              render={({ field }) => (
                <LabeledField label="Vínculo">
                  <TextField
                    select
                    value={field.value ? 'PRO' : 'ADM'}
                    onChange={(e) => {
                      const pro = e.target.value === 'PRO';
                      field.onChange(pro);
                      if (!pro) setValue('isPrimary', false);
                    }}
                    fullWidth
                  >
                    <MenuItem value="PRO">Profissional (realiza atendimentos)</MenuItem>
                    <MenuItem value="ADM">Administrativo (recepção, financeiro etc.)</MenuItem>
                  </TextField>
                </LabeledField>
              )}
            />

            {isProfessional && (
              <>
                <Grid container spacing={1.75}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="specialty"
                      control={control}
                      render={({ field }) => (
                        <LabeledField label="Função">
                          <TextField {...field} fullWidth placeholder="Ex.: Dermatologista" />
                        </LabeledField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="councilRegister"
                      control={control}
                      render={({ field }) => (
                        <LabeledField label="Registro profissional">
                          <TextField {...field} fullWidth placeholder="Ex.: CRM-SP 00.000" />
                        </LabeledField>
                      )}
                    />
                  </Grid>
                </Grid>

                <LabeledField label="Especialidades">
                  <Controller
                    name="specialties"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        select
                        fullWidth
                        value={field.value}
                        onChange={(e) => {
                          const v = e.target.value as unknown as string | string[];
                          field.onChange(typeof v === 'string' ? v.split(',') : v);
                        }}
                        SelectProps={{
                          multiple: true,
                          displayEmpty: true,
                          renderValue: (selected) => {
                            const values = selected as string[];
                            if (values.length === 0) {
                              return (
                                <Box component="span" sx={{ color: 'text.disabled' }}>
                                  Selecione as especialidades
                                </Box>
                              );
                            }
                            return (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {values.map((v) => (
                                  <Chip
                                    key={v}
                                    size="small"
                                    label={v}
                                    sx={{
                                      height: 22,
                                      fontSize: fontSizes.xs,
                                      fontWeight: 600,
                                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                      color: 'primary.dark',
                                    }}
                                  />
                                ))}
                              </Stack>
                            );
                          },
                        }}
                      >
                        {SPECIALTY_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            <Checkbox size="small" checked={field.value.includes(opt)} sx={{ py: 0, ml: -0.5, mr: 1 }} />
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </LabeledField>

                <LabeledField label="Cor na agenda">
                  <Controller
                    name="calendarColor"
                    control={control}
                    render={({ field }) => (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {COLOR_SWATCHES.map((c) => {
                          const selected = field.value?.toLowerCase() === c.toLowerCase();
                          return (
                            <Box
                              key={c}
                              component="button"
                              type="button"
                              aria-label={c}
                              onClick={() => field.onChange(selected ? '' : c)}
                              sx={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                bgcolor: c,
                                border: (t) =>
                                  selected ? `2px solid ${t.palette.text.primary}` : '2px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                              }}
                            >
                              {selected && <CheckIcon sx={{ fontSize: 16 }} />}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  />
                </LabeledField>

                <LabeledField label="Foto">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={photoPreview ?? undefined}
                      variant="rounded"
                      sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: calendarColor || 'primary.main', fontWeight: 700 }}
                    >
                      {(nameValue || '?').trim().charAt(0).toUpperCase()}
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) photoUpload.mutate(file);
                        e.target.value = '';
                      }}
                    />
                    <Tooltip title={user ? '' : 'Salve o usuário para adicionar a foto'}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PhotoCameraOutlinedIcon />}
                          disabled={!user || photoBusy}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {photoPreview ? 'Trocar foto' : 'Enviar foto'}
                        </Button>
                      </span>
                    </Tooltip>
                    {photoPreview && user && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        disabled={photoBusy}
                        onClick={() => photoRemove.mutate()}
                      >
                        Remover
                      </Button>
                    )}
                  </Stack>
                </LabeledField>
              </>
            )}

            <Grid container spacing={1.75}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Nome é obrigatório' }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="Nome completo" required>
                      <TextField
                        {...field}
                        fullWidth
                        placeholder="Ex.: Larissa Nunes"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    </LabeledField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: 'E-mail é obrigatório' }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="E-mail" required>
                      <TextField
                        {...field}
                        type="email"
                        fullWidth
                        placeholder="email@clinica.com"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    </LabeledField>
                  )}
                />
              </Grid>
            </Grid>

            <Controller
              name="roleId"
              control={control}
              rules={{ required: 'Selecione um grupo' }}
              render={({ field, fieldState }) => (
                <LabeledField label="Grupo de permissão" required>
                  <TextField
                    {...field}
                    select
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'Define quais telas e ações este usuário pode acessar.'}
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </LabeledField>
              )}
            />

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label={field.value ? 'Ativo' : 'Inativo'}
                  />
                )}
              />
              {isProfessional && (
                <Controller
                  name="isPrimary"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                      label="Profissional principal"
                    />
                  )}
                />
              )}
            </Stack>

            {mutation.isError && (
              <Alert severity="error" variant="outlined">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  'Erro ao salvar usuário'}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar usuário'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

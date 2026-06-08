import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi, UserPayload } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { UserSummary } from '../../types';

interface ProfessionalFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: UserSummary | null;
}

type FormValues = {
  name: string;
  email: string;
  roleId: string;
  active: boolean;
  providesAppointments: boolean;
  isPrimary: boolean;
};

const empty: FormValues = {
  name: '',
  email: '',
  roleId: '',
  active: true,
  providesAppointments: true,
  isPrimary: false,
};

const DIALOG_MAX_WIDTH = 620;
const DIALOG_HEIGHT_DESKTOP = 680;

export function ProfessionalFormDialog({ open, onClose, user }: ProfessionalFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: empty,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      user
        ? {
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            active: user.active,
            providesAppointments: user.providesAppointments ?? true,
            isPrimary: user.isPrimary ?? false,
          }
        : empty,
    );
  }, [open, user, reset]);

  const providesAppointments = watch('providesAppointments');
  const selectedRoleId = watch('roleId');
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: UserPayload = {
        name: values.name.trim(),
        email: values.email.trim(),
        roleId: values.roleId,
        active: values.active,
        providesAppointments: values.providesAppointments,
        isPrimary: values.providesAppointments ? values.isPrimary : false,
      };
      if (user) return usersApi.update(user.id, payload);
      return usersApi.create(payload as UserPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'appointment-providers'] });
      queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
      onClose();
    },
  });

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
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
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
          title={user ? 'Editar profissional' : 'Novo profissional'}
          subtitle={
            user
              ? `${user.name} · ${user.email}`
              : 'Dados de acesso, permissões e agenda'
          }
          icon={
            user ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <PersonAddOutlinedIcon fontSize="small" />
            )
          }
        />

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
          <Stack spacing={2.5}>
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
                  autoFocus={!user}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              rules={{ required: 'E-mail é obrigatório' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  type="email"
                  label="E-mail"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            <Controller
              name="roleId"
              control={control}
              rules={{ required: 'Selecione um grupo' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Grupo / permissões"
                  fullWidth
                  required
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    (selectedRole?.description ||
                      (selectedRole
                        ? `${selectedRole.permissions.length} permissão(ões) neste grupo`
                        : undefined))
                  }
                >
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Opções
              </Typography>
              <Stack spacing={0.25}>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Usuário ativo (pode fazer login)"
                    />
                  )}
                />

                <Controller
                  name="providesAppointments"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            field.onChange(checked);
                            if (!checked) setValue('isPrimary', false);
                          }}
                        />
                      }
                      label="Realiza atendimentos (aparece em agendamentos e horários)"
                    />
                  )}
                />

                {providesAppointments && (
                  <Controller
                    name="isPrimary"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        sx={{ ml: 3 }}
                        control={
                          <Switch
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        }
                        label="Profissional principal"
                      />
                    )}
                  />
                )}
              </Stack>

              {providesAppointments && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  O profissional principal entra no cálculo de custo/hora dos procedimentos. Apenas
                  um pode ser marcado — ao escolher outro, o anterior é desmarcado automaticamente.
                </Typography>
              )}
            </Box>

            {mutation.isError && (
              <Alert severity="error" variant="outlined">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'Erro ao salvar profissional'}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : user ? 'Salvar' : 'Criar profissional'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

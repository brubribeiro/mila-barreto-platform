import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
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

  const selectedRoleId = watch('roleId');
  const providesAppointments = watch('providesAppointments');
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: UserPayload = {
        name: values.name,
        email: values.email,
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
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={user ? 'Editar profissional' : 'Novo profissional'}
          subtitle={user?.email ?? 'Dados de acesso e permissões'}
          subtitleTitle={user?.email}
          icon={<BadgeOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
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
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
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
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="roleId"
                control={control}
                rules={{ required: 'Selecione um grupo' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="Grupo / Permissões"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {selectedRole && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 1.5 }}>
                  {selectedRole.description ?? `${selectedRole.permissions.length} permissão(ões)`}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
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
            </Grid>

            {providesAppointments && (
              <Grid item xs={12}>
                <Controller
                  name="isPrimary"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1.5 }}>
                  Usado no cálculo de custo/hora dos procedimentos. Apenas um profissional pode ser
                  principal — ao marcar outro, o anterior é desmarcado automaticamente.
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
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
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar usuário'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

import { useEffect, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi, UserPayload } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { ALL_PERMISSIONS, countCatalogPermissions } from '../../contexts/permissions';
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

const DIALOG_MAX_WIDTH = 900;
const DIALOG_HEIGHT_DESKTOP = 640;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
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

function SubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
      {children}
    </Typography>
  );
}

export function ProfessionalFormDialog({ open, onClose, user }: ProfessionalFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
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
  const active = watch('active');
  const selectedRoleId = watch('roleId');
  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedPermissionCount = selectedRole
    ? countCatalogPermissions(selectedRole.permissions)
    : 0;

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
          trailing={
            !isCompact && selectedPermissionCount > 0 ? (
              <Chip
                size="small"
                label={`${selectedPermissionCount} de ${ALL_PERMISSIONS.length}`}
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            ) : undefined
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
            display: 'flex',
            flexDirection: 'column',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação e acesso" />

                <Grid container spacing={2}>
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
                          autoFocus={!user}
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
                </Grid>

                <Divider sx={{ my: 2 }} />

                <SubsectionLabel>Grupo e permissões</SubsectionLabel>
                <Controller
                  name="roleId"
                  control={control}
                  rules={{ required: 'Selecione um grupo' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      select
                      label="Grupo"
                      fullWidth
                      required
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message ??
                        (selectedRole
                          ? `${selectedPermissionCount} de ${ALL_PERMISSIONS.length} permissões neste grupo`
                          : 'Define o que este profissional pode acessar na plataforma')
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

                {selectedRole?.description && (
                  <Alert severity="info" sx={{ mt: 2, py: 0.75 }}>
                    {selectedRole.description}
                  </Alert>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<WorkOutlineOutlinedIcon fontSize="small" />} title="Operação na clínica" />

                <SubsectionLabel>Status do usuário</SubsectionLabel>
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
                      label={field.value ? 'Usuário ativo' : 'Usuário inativo'}
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 0.5 }}>
                  {active
                    ? 'Pode fazer login e usar a plataforma.'
                    : 'Acesso bloqueado até reativar o usuário.'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <SubsectionLabel>Agenda e atendimentos</SubsectionLabel>
                <Stack spacing={0.25}>
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
                        label="Realiza atendimentos"
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

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  {providesAppointments
                    ? 'Aparece em agendamentos e horários. O profissional principal entra no cálculo de custo/hora dos procedimentos — apenas um pode ser marcado.'
                    : 'Não aparece na seleção de profissionais em agendamentos e horários.'}
                </Typography>
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar profissional'}
                </Alert>
              </Grid>
            )}
          </Grid>
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

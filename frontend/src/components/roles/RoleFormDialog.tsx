import { useEffect, useState, type ReactNode } from 'react';
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
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rolesApi, RolePayload } from '../../api/roles';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { ALL_PERMISSIONS, countCatalogPermissions, SYSTEM_ADMIN_ROLE_NAME } from '../../contexts/permissions';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { PermissionsMatrix } from './PermissionsMatrix';
import type { Role } from '../../types';

interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
}

type FormValues = {
  name: string;
  description: string;
  restrictToOwnAppointments: boolean;
};

const empty: FormValues = { name: '', description: '', restrictToOwnAppointments: false };

const DIALOG_MAX_WIDTH = 1100;
const DIALOG_HEIGHT_DESKTOP = 800;

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

export function RoleFormDialog({ open, onClose, role }: RoleFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });
  const [permissions, setPermissions] = useState<string[]>([]);

  const isSystem = !!role?.isSystem;
  const isAdminRole = role?.name === SYSTEM_ADMIN_ROLE_NAME;
  const selectedPermissionCount = countCatalogPermissions(permissions);

  const handlePermissionsChange = (next: string[]) => {
    if (isAdminRole) {
      setPermissions([...ALL_PERMISSIONS]);
      return;
    }
    setPermissions(next);
  };

  useEffect(() => {
    if (!open) return;
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? '',
        restrictToOwnAppointments: role.restrictToOwnAppointments,
      });
      setPermissions(role.name === SYSTEM_ADMIN_ROLE_NAME ? [...ALL_PERMISSIONS] : role.permissions);
    } else {
      reset(empty);
      setPermissions([]);
    }
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: RolePayload = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        permissions: isAdminRole ? [...ALL_PERMISSIONS] : permissions,
        restrictToOwnAppointments: values.restrictToOwnAppointments,
      };
      return role ? rolesApi.update(role.id, payload) : rolesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(role ? 'Grupo atualizado.' : 'Grupo criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o grupo.'));
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
                maxHeight: '94dvh',
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
          title={role ? 'Editar grupo' : 'Novo grupo'}
          subtitle={
            role
              ? `${role.name}${
                  selectedPermissionCount
                    ? ` · ${selectedPermissionCount} de ${ALL_PERMISSIONS.length} permissões`
                    : ''
                }`
              : 'Nome, regras de agenda e permissões por módulo'
          }
          icon={
            role ? <EditOutlinedIcon fontSize="small" /> : <GroupAddOutlinedIcon fontSize="small" />
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
          <Grid
            container
            spacing={2.5}
            sx={{
              flex: 1,
              minHeight: 0,
              alignItems: 'stretch',
            }}
          >
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação" />
                <Stack spacing={2}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Nome é obrigatório' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Nome do grupo"
                        fullWidth
                        required
                        autoFocus={!role}
                        disabled={isSystem}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ??
                          (isSystem ? 'Grupos do sistema não podem ser renomeados' : undefined)
                        }
                      />
                    )}
                  />
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descrição"
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Finalidade deste grupo na clínica…"
                      />
                    )}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />
                <SectionTitle icon={<CalendarMonthOutlinedIcon fontSize="small" />} title="Agenda" />
                <Controller
                  name="restrictToOwnAppointments"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isAdminRole}
                        />
                      }
                      label="Restringir à própria agenda"
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Usuários deste grupo só veem e editam os próprios agendamentos.
                </Typography>
              </Paper>
            </Grid>

            <Grid
              item
              xs={12}
              md={8}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                ...(isCompact ? {} : { height: '100%' }),
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  ...FORM_CARD_SX,
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                  sx={{ mb: 1.5, flexShrink: 0 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <SectionIcon>
                        <SecurityOutlinedIcon fontSize="small" />
                      </SectionIcon>
                      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
                        Permissões
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, ml: 6.25 }}>
                      Marque o que este grupo pode ver, criar, editar e excluir em cada módulo
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${selectedPermissionCount} de ${ALL_PERMISSIONS.length}`}
                    variant="outlined"
                  />
                </Stack>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
                  <PermissionsMatrix
                    value={permissions}
                    onChange={handlePermissionsChange}
                    disableClear={isAdminRole}
                  />
                </Box>

                {isAdminRole && (
                  <Alert severity="info" sx={{ mt: 1.5, flexShrink: 0, py: 0.75 }}>
                    Este grupo sempre possui acesso total. Permissões não podem ser removidas; ao salvar, o
                    catálogo é sincronizado automaticamente.
                  </Alert>
                )}
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar grupo'}
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
            {mutation.isPending ? 'Salvando…' : role ? 'Salvar' : 'Criar grupo'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
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
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rolesApi, RolePayload } from '../../api/roles';
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

export function RoleFormDialog({ open, onClose, role }: RoleFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });
  const [permissions, setPermissions] = useState<string[]>([]);

  const isSystem = !!role?.isSystem;
  const isAdminRole = role?.name === 'Administrador';

  useEffect(() => {
    if (!open) return;
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? '',
        restrictToOwnAppointments: role.restrictToOwnAppointments,
      });
      setPermissions(role.permissions);
    } else {
      reset(empty);
      setPermissions([]);
    }
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: RolePayload = {
        name: values.name.trim(),
        description: values.description || undefined,
        permissions,
        restrictToOwnAppointments: values.restrictToOwnAppointments,
      };
      return role ? rolesApi.update(role.id, payload) : rolesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={role ? 'Editar grupo' : 'Novo grupo'}
          subtitle="Permissões e acesso dos profissionais"
          icon={<GroupOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
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
                    disabled={isSystem}
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message ??
                      (isSystem ? 'Grupos do sistema não podem ser renomeados' : undefined)
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="restrictToOwnAppointments"
                control={control}
                render={({ field }) => (
                  <Box sx={{ pt: 1 }}>
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                      Usuários desse grupo só veem/editam seus próprios agendamentos
                    </Typography>
                  </Box>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Descrição" fullWidth multiline rows={2} />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 1 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Permissões
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Marque o que esse grupo pode acessar, criar, editar e excluir em cada módulo
                  </Typography>
                </Box>
              </Stack>
              <PermissionsMatrix
                value={permissions}
                onChange={setPermissions}
                disabled={isAdminRole}
              />
              {isAdminRole && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  O grupo Administrador precisa manter todas as permissões.
                </Alert>
              )}
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar grupo'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={dialogActionsBorderSx}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

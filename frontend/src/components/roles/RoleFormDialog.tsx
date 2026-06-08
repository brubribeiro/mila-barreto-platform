import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
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

const DIALOG_MAX_WIDTH = 1100;
const DIALOG_HEIGHT_DESKTOP = 800;

const SECTION_LABEL_SX = {
  mb: 1,
  display: 'block',
  letterSpacing: '0.04em',
} as const;

export function RoleFormDialog({ open, onClose, role }: RoleFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
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
        description: values.description.trim() || undefined,
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
          title={role ? 'Editar grupo' : 'Novo grupo'}
          subtitle={
            role
              ? `${role.name}${permissions.length ? ` · ${permissions.length} permissão(ões)` : ''}`
              : 'Nome, regras de agenda e permissões por módulo'
          }
          icon={
            role ? <EditOutlinedIcon fontSize="small" /> : <GroupAddOutlinedIcon fontSize="small" />
          }
          trailing={
            !isCompact && permissions.length > 0 ? (
              <Chip
                size="small"
                label={`${permissions.length} permissões`}
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
            overflow: isCompact ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Grid
            container
            spacing={2.5}
            sx={{
              flex: 1,
              minHeight: 0,
              alignItems: 'stretch',
              ...(isCompact ? {} : { height: '100%' }),
            }}
          >
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  height: '100%',
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={SECTION_LABEL_SX}
                    >
                      Identificação
                    </Typography>
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
                  </Box>

                  <Divider />

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={SECTION_LABEL_SX}
                    >
                      Agenda
                    </Typography>
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
                  </Box>
                </Stack>
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
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
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
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Permissões
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Marque o que este grupo pode ver, criar, editar e excluir em cada módulo
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${permissions.length} selecionada(s)`} variant="outlined" />
                </Stack>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
                  <PermissionsMatrix
                    value={permissions}
                    onChange={setPermissions}
                    disabled={isAdminRole}
                  />
                </Box>

                {isAdminRole && (
                  <Alert severity="info" sx={{ mt: 1.5, flexShrink: 0, py: 0.75 }}>
                    O grupo Administrador precisa manter todas as permissões.
                  </Alert>
                )}
              </Paper>
            </Grid>
          </Grid>

          {mutation.isError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2, flexShrink: 0 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar grupo'}
            </Alert>
          )}
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

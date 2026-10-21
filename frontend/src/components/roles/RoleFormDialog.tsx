import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  alpha,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
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
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rolesApi, RolePayload } from '../../api/roles';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { SYSTEM_ADMIN_ROLE_NAME } from '../../contexts/permissions';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { LabeledField } from '../LabeledField';
import { AuroraIcon } from '../AuroraIcon';
import { ROLE_COLORS, roleColor } from './roleColors';
import type { Role } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
  /** Grupos existentes (para "Copiar permissões de" e cor padrão). */
  roles: Role[];
  onSaved?: (role: Role) => void;
}

type FormValues = {
  name: string;
  description: string;
  copyFromId: string;
  color: string;
  restrictToOwnAppointments: boolean;
};

const DIALOG_MAX_WIDTH = 520;

export function RoleFormDialog({ open, onClose, role, roles, onSaved }: RoleFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset, setValue } = useForm<FormValues>();

  const isSystem = !!role?.isSystem;
  const isAdminRole = role?.name === SYSTEM_ADMIN_ROLE_NAME;

  useEffect(() => {
    if (!open) return;
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? '',
        copyFromId: '',
        color: roleColor(role, Math.max(0, roles.findIndex((r) => r.id === role.id))),
        restrictToOwnAppointments: role.restrictToOwnAppointments,
      });
    } else {
      const used = new Set(roles.map((r, i) => roleColor(r, i)));
      reset({
        name: '',
        description: '',
        copyFromId: '',
        color: ROLE_COLORS.find((c) => !used.has(c)) ?? ROLE_COLORS[0],
        restrictToOwnAppointments: false,
      });
    }
    // `roles` fica fora das dependências: muda a cada refetch e reiniciaria o formulário.
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const base = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        color: values.color,
        restrictToOwnAppointments: values.restrictToOwnAppointments,
      };
      // Na edição as permissões são ajustadas direto na matriz da página.
      if (role) return rolesApi.update(role.id, base);
      const source = roles.find((r) => r.id === values.copyFromId);
      const payload: RolePayload = { ...base, permissions: source ? [...source.permissions] : [] };
      return rolesApi.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(role ? 'Grupo atualizado.' : 'Grupo criado.');
      onSaved?.(saved);
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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh' }),
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
          title={role ? 'Editar grupo de permissões' : 'Novo grupo de permissões'}
          subtitle={role ? role.name : 'Defina um papel de acesso'}
          icon={
            role ? <EditOutlinedIcon fontSize="small" /> : <GroupAddOutlinedIcon fontSize="small" />
          }
        />

        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: 'background.paper',
            '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
          }}
        >
          <Stack spacing={2.25}>
            <Controller
              name="name"
              control={control}
              rules={{
                validate: (v) => !!v?.trim() || 'Nome é obrigatório',
              }}
              render={({ field, fieldState }) => (
                <LabeledField label="Nome do grupo" required>
                  <TextField
                    {...field}
                    fullWidth
                    autoFocus={!role}
                    disabled={isSystem}
                    placeholder="Ex.: Coordenação"
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message ??
                      (isSystem ? 'Grupos do sistema não podem ser renomeados' : undefined)
                    }
                  />
                </LabeledField>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <LabeledField label="Descrição">
                  <TextField {...field} fullWidth placeholder="O que esse papel pode fazer" />
                </LabeledField>
              )}
            />

            {!role && (
              <Controller
                name="copyFromId"
                control={control}
                render={({ field }) => (
                  <LabeledField label="Copiar permissões de">
                    <TextField
                      {...field}
                      select
                      fullWidth
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        const source = roles.find((r) => r.id === e.target.value);
                        setValue('restrictToOwnAppointments', source?.restrictToOwnAppointments ?? false);
                      }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="">Começar do zero</MenuItem>
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </LabeledField>
                )}
              />
            )}

            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <LabeledField label="Cor do grupo">
                  <Stack direction="row" spacing={1.25} role="radiogroup" aria-label="Cor do grupo">
                    {ROLE_COLORS.map((c) => {
                      const selected = field.value === c;
                      return (
                        <ButtonBase
                          key={c}
                          role="radio"
                          aria-checked={selected}
                          aria-label={c}
                          onClick={() => field.onChange(c)}
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: '9px',
                            bgcolor: c,
                            color: '#fff',
                            boxShadow: selected ? `0 0 0 3px ${alpha(c, 0.25)}` : 'none',
                            transition: 'box-shadow .15s',
                          }}
                        >
                          {selected && <AuroraIcon name="check" size={15} strokeWidth={2.4} />}
                        </ButtonBase>
                      );
                    })}
                  </Stack>
                </LabeledField>
              )}
            />

            <Controller
              name="restrictToOwnAppointments"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    sx={{ ml: -0.75 }}
                    control={
                      <Switch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isAdminRole}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                        Restringir à própria agenda
                      </Typography>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Usuários deste grupo só veem e editam os próprios agendamentos.
                  </Typography>
                </Box>
              )}
            />

            {!role && (
              <Typography variant="caption" color="text.secondary">
                Depois de criar, ajuste o que o grupo pode ver, criar, editar e excluir na matriz de
                permissões.
              </Typography>
            )}
          </Stack>
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

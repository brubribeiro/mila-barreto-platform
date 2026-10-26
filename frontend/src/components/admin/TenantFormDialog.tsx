import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../../api/admin';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { FormSection } from '../FormSection';
import { LabeledField } from '../LabeledField';
import type { AdminTenant } from '../../types';

const DIALOG_MAX_WIDTH = 760;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormValues {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = nova clínica */
  editing: Pick<AdminTenant, 'id' | 'name' | 'slug'> | null;
}

/** Criar clínica (com o primeiro administrador) ou editar nome/identificador. */
export function TenantFormDialog({ open, onClose, editing }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', slug: '', adminName: '', adminEmail: '' },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const slug = values.slug.trim() || undefined;
      if (editing) return adminApi.updateTenant(editing.id, { name: values.name.trim(), slug });
      return adminApi.createTenant({
        name: values.name.trim(),
        slug,
        adminName: values.adminName.trim(),
        adminEmail: values.adminEmail.trim().toLowerCase(),
      });
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      if (editing) queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', editing.id] });
      toast.success(editing ? 'Clínica atualizada.' : `Clínica ${tenant.name} criada.`);
      onClose();
    },
  });

  const saving = saveMutation.isPending;
  const resetMutation = saveMutation.reset;

  useEffect(() => {
    if (!open) return;
    reset({ name: editing?.name ?? '', slug: editing?.slug ?? '', adminName: '', adminEmail: '' });
    resetMutation();
  }, [open, editing, reset, resetMutation]);

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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh', overflow: 'hidden' }),
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...(isMobile ? { height: '100%' } : {}) }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={editing ? 'Editar clínica' : 'Nova clínica'}
          subtitle={editing ? editing.name : 'A clínica já nasce com os grupos padrão e o primeiro administrador'}
          icon={editing ? <EditOutlinedIcon fontSize="small" /> : <StorefrontOutlinedIcon fontSize="small" />}
        />

        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: 'background.default',
            '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: editing ? '1fr' : '1fr 1fr' },
              gap: 2.25,
              alignItems: 'stretch',
            }}
          >
            <FormSection title="Clínica" sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    validate: (v) => v.trim().length >= 2 || 'Informe o nome da clínica',
                  }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="Nome da clínica" required>
                      <TextField
                        {...field}
                        placeholder="Ex.: Clínica Bela Pele"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        fullWidth
                        autoFocus
                      />
                    </LabeledField>
                  )}
                />
                <Controller
                  name="slug"
                  control={control}
                  rules={{
                    validate: (v) =>
                      !v.trim() || SLUG_PATTERN.test(v.trim()) || 'Use só letras minúsculas, números e hífens',
                  }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="Identificador">
                      <TextField
                        {...field}
                        placeholder="clinica-bela-pele"
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ??
                          (editing ? 'Único na plataforma' : 'Opcional: gerado a partir do nome se vazio')
                        }
                        fullWidth
                      />
                    </LabeledField>
                  )}
                />
              </Box>
            </FormSection>

            {!editing && (
              <FormSection title="Primeiro administrador" sx={{ height: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                  <Controller
                    name="adminName"
                    control={control}
                    rules={{ validate: (v) => v.trim().length >= 2 || 'Informe o nome do administrador' }}
                    render={({ field, fieldState }) => (
                      <LabeledField label="Nome" required>
                        <TextField
                          {...field}
                          placeholder="Ex.: Ana Souza"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          fullWidth
                        />
                      </LabeledField>
                    )}
                  />
                  <Controller
                    name="adminEmail"
                    control={control}
                    rules={{ validate: (v) => EMAIL_PATTERN.test(v.trim()) || 'Informe um e-mail válido' }}
                    render={({ field, fieldState }) => (
                      <LabeledField label="E-mail (conta Google)" required>
                        <TextField
                          {...field}
                          type="email"
                          placeholder="ana@clinica.com"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message ?? 'Entra com o Google deste e-mail, no grupo Administrador'}
                          fullWidth
                          inputProps={{ inputMode: 'email', autoCapitalize: 'none' }}
                        />
                      </LabeledField>
                    )}
                  />
                </Box>
              </FormSection>
            )}
          </Box>

          {saveMutation.error && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2.25 }}>
              {getApiErrorMessage(saveMutation.error, 'Não foi possível salvar a clínica.')}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar clínica'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

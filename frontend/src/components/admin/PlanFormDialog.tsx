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
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../../api/admin';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { FormSection } from '../FormSection';
import { LabeledField } from '../LabeledField';
import type { AdminPlan, PlanLimits } from '../../types';

const DIALOG_MAX_WIDTH = 760;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface FormValues {
  name: string;
  slug: string;
  description: string;
  maxUsers: string;
  maxPatients: string;
  storageGb: string;
}

const LIMIT_FIELDS = [
  { name: 'maxUsers', label: 'Usuários', placeholder: 'Ex.: 5', integer: true },
  { name: 'maxPatients', label: 'Pacientes', placeholder: 'Ex.: 1000', integer: true },
  { name: 'storageGb', label: 'Armazenamento (GB)', placeholder: 'Ex.: 10', integer: false },
] as const;

/** "" = ilimitado; aceita vírgula decimal. */
function parseLimit(value: string): number | undefined {
  const v = value.trim().replace(',', '.');
  return v ? Number(v) : undefined;
}

function limitError(value: string, integer: boolean): string | true {
  const n = parseLimit(value);
  if (n === undefined) return true;
  if (!Number.isFinite(n) || n <= 0) return 'Informe um número maior que zero';
  if (integer && !Number.isInteger(n)) return 'Use um número inteiro';
  if (!integer && Math.round(n * 10) !== n * 10) return 'Use no máximo 1 casa decimal';
  return true;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = novo plano */
  editing: AdminPlan | null;
}

/** Criar ou editar um plano da plataforma (sem preço/cobrança; limites só informativos). */
export function PlanFormDialog({ open, onClose, editing }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', slug: '', description: '', maxUsers: '', maxPatients: '', storageGb: '' },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const limits: PlanLimits = {};
      for (const f of LIMIT_FIELDS) {
        const n = parseLimit(values[f.name]);
        if (n !== undefined) limits[f.name] = n;
      }
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        description: values.description.trim() || null,
        limits: Object.keys(limits).length ? limits : null,
      };
      return editing ? adminApi.updatePlan(editing.id, payload) : adminApi.createPlan(payload);
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      // Nome do plano aparece na lista e no detalhe das clínicas
      if (editing) queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      if (editing) queryClient.invalidateQueries({ queryKey: ['admin', 'tenant'] });
      toast.success(editing ? 'Plano atualizado.' : `Plano ${plan.name} criado.`);
      onClose();
    },
  });

  const saving = saveMutation.isPending;
  const resetMutation = saveMutation.reset;

  useEffect(() => {
    if (!open) return;
    const l = editing?.limits;
    reset({
      name: editing?.name ?? '',
      slug: editing?.slug ?? '',
      description: editing?.description ?? '',
      maxUsers: l?.maxUsers != null ? String(l.maxUsers) : '',
      maxPatients: l?.maxPatients != null ? String(l.maxPatients) : '',
      storageGb: l?.storageGb != null ? String(l.storageGb).replace('.', ',') : '',
    });
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
          title={editing ? 'Editar plano' : 'Novo plano'}
          subtitle={editing ? editing.name : 'Cadastro do plano; sem cobrança nesta versão'}
          icon={editing ? <EditOutlinedIcon fontSize="small" /> : <WorkspacePremiumOutlinedIcon fontSize="small" />}
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
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.25,
              alignItems: 'stretch',
            }}
          >
            <FormSection title="Plano" sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ validate: (v) => v.trim().length >= 2 || 'Informe o nome do plano' }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="Nome" required>
                      <TextField
                        {...field}
                        placeholder="Ex.: Profissional"
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
                        placeholder="profissional"
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
                <Controller
                  name="description"
                  control={control}
                  rules={{ maxLength: { value: 500, message: 'Máximo de 500 caracteres' } }}
                  render={({ field, fieldState }) => (
                    <LabeledField label="Descrição">
                      <TextField
                        {...field}
                        placeholder="Para quem é este plano"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        fullWidth
                        multiline
                        minRows={2}
                      />
                    </LabeledField>
                  )}
                />
              </Box>
            </FormSection>

            <FormSection title="Limites" sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {LIMIT_FIELDS.map((f) => (
                  <Controller
                    key={f.name}
                    name={f.name}
                    control={control}
                    rules={{ validate: (v) => limitError(v, f.integer) }}
                    render={({ field, fieldState }) => (
                      <LabeledField label={f.label}>
                        <TextField
                          {...field}
                          placeholder={f.placeholder}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message ?? 'Vazio = ilimitado'}
                          fullWidth
                          inputProps={{ inputMode: f.integer ? 'numeric' : 'decimal' }}
                        />
                      </LabeledField>
                    )}
                  />
                ))}
              </Box>
            </FormSection>
          </Box>

          <Alert severity="info" variant="outlined" sx={{ mt: 2.25 }}>
            Os limites ficam registrados no plano, mas ainda não bloqueiam nada nas clínicas.
          </Alert>

          {saveMutation.error && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2.25 }}>
              {getApiErrorMessage(saveMutation.error, 'Não foi possível salvar o plano.')}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar plano'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

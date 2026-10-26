import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../../api/admin';
import { useAppToast } from '../../contexts/AppToastContext';
import {
  PLATFORM_CATALOG_KIND_LABELS,
  PLATFORM_CATALOG_KINDS,
} from '../../features/platformCatalog';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { FormSection } from '../FormSection';
import { LabeledField } from '../LabeledField';
import type { PlatformCatalogItem, PlatformCatalogKind } from '../../types';

const DIALOG_MAX_WIDTH = 560;

interface FormValues {
  kind: PlatformCatalogKind;
  value: string;
  label: string;
  sortOrder: string;
  color: string;
  defaultTrigger: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editing: PlatformCatalogItem | null;
  defaultKind: PlatformCatalogKind;
}

function metaFromForm(kind: PlatformCatalogKind, values: FormValues): Record<string, unknown> | null {
  if (kind === 'document_category' && values.color.trim()) {
    return { color: values.color.trim() };
  }
  if (kind === 'message_category' && values.defaultTrigger.trim()) {
    return { defaultTrigger: values.defaultTrigger.trim() };
  }
  return null;
}

/** Criar ou editar item do catálogo global da plataforma. */
export function CatalogFormDialog({ open, onClose, editing, defaultKind }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const isEdit = !!editing;

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      kind: defaultKind,
      value: '',
      label: '',
      sortOrder: '0',
      color: '',
      defaultTrigger: '',
    },
  });
  const kind = watch('kind');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const meta = (editing.meta ?? {}) as Record<string, unknown>;
      reset({
        kind: editing.kind,
        value: editing.value,
        label: editing.label,
        sortOrder: String(editing.sortOrder),
        color: typeof meta.color === 'string' ? meta.color : '',
        defaultTrigger: typeof meta.defaultTrigger === 'string' ? meta.defaultTrigger : '',
      });
    } else {
      reset({
        kind: defaultKind,
        value: '',
        label: '',
        sortOrder: '0',
        color: '',
        defaultTrigger: '',
      });
    }
  }, [open, editing, defaultKind, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const sortOrder = Number(values.sortOrder) || 0;
      const meta = metaFromForm(values.kind, values);
      if (editing) {
        return adminApi.updateCatalogItem(editing.id, {
          value: values.value.trim(),
          label: values.label.trim(),
          sortOrder,
          meta,
        });
      }
      return adminApi.createCatalogItem({
        kind: values.kind,
        value: values.value.trim(),
        label: values.label.trim(),
        sortOrder,
        meta,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success(isEdit ? 'Item atualizado.' : 'Item criado.');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível salvar o item.')),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth={false}
      PaperProps={{ sx: { ...dialogPaperSx, width: '100%', maxWidth: DIALOG_MAX_WIDTH } }}
    >
      <DialogHeader
        icon={isEdit ? <EditOutlinedIcon /> : <CategoryOutlinedIcon />}
        title={isEdit ? 'Editar item' : 'Novo item'}
        subtitle="Catálogo global — todas as clínicas usam os mesmos valores"
        onClose={onClose}
      />
      <DialogContent sx={{ pt: 2.5 }}>
        <FormSection title="Identificação">
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <LabeledField label="Tipo">
                <TextField {...field} select fullWidth disabled={isEdit}>
                  {PLATFORM_CATALOG_KINDS.map((k) => (
                    <MenuItem key={k} value={k}>
                      {PLATFORM_CATALOG_KIND_LABELS[k]}
                    </MenuItem>
                  ))}
                </TextField>
              </LabeledField>
            )}
          />
          <Controller
            name="value"
            control={control}
            rules={{ required: 'Informe o valor' }}
            render={({ field, fieldState }) => (
              <LabeledField label="Valor / código" required>
                <TextField
                  {...field}
                  fullWidth
                  inputProps={{ 'aria-label': 'Valor / código' }}
                  placeholder={kind === 'procedure_category' ? 'Ex.: Facial' : 'Ex.: contrato'}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? 'Persistido nas entidades da clínica'}
                />
              </LabeledField>
            )}
          />
          <Controller
            name="label"
            control={control}
            rules={{ required: 'Informe o rótulo' }}
            render={({ field, fieldState }) => (
              <LabeledField label="Rótulo" required>
                <TextField
                  {...field}
                  fullWidth
                  inputProps={{ 'aria-label': 'Rótulo' }}
                  placeholder="Ex.: Contrato"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              </LabeledField>
            )}
          />
          <Controller
            name="sortOrder"
            control={control}
            render={({ field }) => (
              <LabeledField label="Ordem">
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 1, 'aria-label': 'Ordem' }}
                />
              </LabeledField>
            )}
          />
          {kind === 'document_category' && (
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <LabeledField label="Cor (hex)">
                  <TextField {...field} fullWidth placeholder="#5C6BC0" inputProps={{ 'aria-label': 'Cor (hex)' }} />
                </LabeledField>
              )}
            />
          )}
          {kind === 'message_category' && (
            <Controller
              name="defaultTrigger"
              control={control}
              render={({ field }) => (
                <LabeledField label="Gatilho padrão">
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="ON_BOOKING, DAY_BEFORE…"
                    helperText="Opcional — usado na sugestão do WhatsApp"
                    inputProps={{ 'aria-label': 'Gatilho padrão' }}
                  />
                </LabeledField>
              )}
            />
          )}
        </FormSection>
      </DialogContent>
      <DialogActions sx={dialogActionsBorderSx}>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
          {isEdit ? 'Salvar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

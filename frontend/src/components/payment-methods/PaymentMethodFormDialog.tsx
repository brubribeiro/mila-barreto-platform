import { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import { useForm, Controller, type Control } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { paymentMethodsApi, CreatePaymentMethodPayload } from '../../api/paymentMethods';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { PaymentMethodEntry } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: PaymentMethodEntry | null;
}

interface FormValues {
  name: string;
  feePercent: number | '';
  active: boolean;
}

const DIALOG_MAX_WIDTH = 620;
const DIALOG_HEIGHT_DESKTOP = 560;

const SECTION_LABEL_SX = {
  mb: 1,
  display: 'block',
  letterSpacing: '0.04em',
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function PaymentMethodActiveToggle({
  control,
  fullWidth = false,
}: {
  control: Control<FormValues>;
  fullWidth?: boolean;
}) {
  return (
    <Controller
      name="active"
      control={control}
      render={({ field }) => (
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          fullWidth={fullWidth}
          value={field.value ? 'active' : 'inactive'}
          onChange={(_, val) => {
            if (val === 'active') field.onChange(true);
            if (val === 'inactive') field.onChange(false);
          }}
        >
          <ToggleButton value="active" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Ativa
          </ToggleButton>
          <ToggleButton value="inactive" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Inativa
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function PaymentMethodFormDialog({ open, onClose, editing }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: { name: '', feePercent: '', active: true },
  });

  const watchedFee = watch('feePercent');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        name: editing.name,
        feePercent: Number(editing.feePercent),
        active: editing.active,
      });
    } else {
      reset({ name: '', feePercent: '', active: true });
    }
  }, [open, editing, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePaymentMethodPayload) => paymentMethodsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePaymentMethodPayload> }) =>
      paymentMethodsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      onClose();
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreatePaymentMethodPayload = {
      name: values.name.trim(),
      feePercent: values.feePercent === '' ? 0 : Number(values.feePercent),
      active: values.active,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const feePreview = useMemo(() => {
    const fee = watchedFee === '' ? 0 : Number(watchedFee);
    if (Number.isNaN(fee) || fee < 0) return null;

    const exampleAmount = 100;
    const netAmount = exampleAmount * (1 - fee / 100);

    if (fee === 0) {
      return `Sem desconto de taxa — ${brl.format(exampleAmount)} líquidos em vendas de ${brl.format(exampleAmount)}.`;
    }

    return `Taxa de ${fee.toFixed(2).replace('.', ',')}% — em ${brl.format(exampleAmount)} você recebe ${brl.format(netAmount)}.`;
  }, [watchedFee]);

  const usageCount = editing?._count?.financialEntries ?? 0;

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
        onSubmit={handleSubmit(onSubmit)}
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
          title={editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
          subtitle={
            editing
              ? `${editing.name}${usageCount > 0 ? ` · ${usageCount} lançamento(s)` : ''}`
              : 'Nome, taxa da maquininha e disponibilidade no financeiro'
          }
          icon={editing ? <EditOutlinedIcon fontSize="small" /> : <PaymentIcon fontSize="small" />}
          trailing={!isCompact ? <PaymentMethodActiveToggle control={control} /> : undefined}
          bottom={
            isCompact ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Disponível para lançamentos
                </Typography>
                <PaymentMethodActiveToggle control={control} fullWidth />
              </Box>
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
          }}
        >
          <Stack spacing={2.5}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={SECTION_LABEL_SX}>
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
                      label="Nome da forma de pagamento"
                      placeholder="Ex.: Crédito à vista"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                      required
                      autoFocus={!editing}
                    />
                  )}
                />
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={SECTION_LABEL_SX}>
                Taxa da maquininha
              </Typography>
              <Stack spacing={2}>
                <Controller
                  name="feePercent"
                  control={control}
                  rules={{
                    min: { value: 0, message: 'Não pode ser negativo' },
                    max: { value: 100, message: 'Máximo 100%' },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Percentual da operadora"
                      type="number"
                      error={!!fieldState.error}
                      helperText={
                        fieldState.error?.message ??
                        'Desconto aplicado automaticamente nos lançamentos financeiros'
                      }
                      fullWidth
                      inputProps={{ step: 0.01, min: 0, max: 100 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PercentOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  )}
                />

                {feePreview && (
                  <Alert severity="info" sx={{ py: 0.75 }}>
                    {feePreview}
                  </Alert>
                )}
              </Stack>
            </Paper>

            {mutationError && (
              <Alert severity="error" variant="outlined">
                {(mutationError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  'Erro ao salvar forma de pagamento'}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar forma'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

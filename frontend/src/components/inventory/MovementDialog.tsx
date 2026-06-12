import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inventoryApi, MovementType } from '../../api/inventory';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { dateOnlyToApiIso } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';

interface MovementDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

interface FormValues {
  type: MovementType;
  quantity: number;
  totalPrice: number | '';
  reason: string;
  expiresAt: string;
}

const empty: FormValues = { type: 'IN', quantity: 1, totalPrice: '', reason: '', expiresAt: '' };

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function MovementDialog({ open, onClose, item }: MovementDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: empty });

  useEffect(() => {
    if (!open) return;
    const defaultQty = 1;
    const cost = item?.costPrice != null ? Number(item.costPrice) : 0;
    reset({
      ...empty,
      totalPrice: cost > 0 ? Math.round(cost * defaultQty * 100) / 100 : '',
    });
  }, [open, item, reset]);

  const type = watch('type');
  const quantity = Number(watch('quantity')) || 0;
  const totalPrice = Number(watch('totalPrice')) || 0;
  const calculatedUnitPrice = type === 'IN' && quantity > 0 && totalPrice > 0 ? totalPrice / quantity : 0;
  const currentQty = Number(item?.quantity ?? 0);

  const newQuantity = !item
    ? 0
    : type === 'IN'
      ? currentQty + quantity
      : type === 'OUT'
        ? currentQty - quantity
        : quantity;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.createMovement(item!.id, {
        type: values.type,
        quantity: Number(values.quantity),
        ...(values.reason ? { reason: values.reason } : {}),
        ...(values.expiresAt
          ? { expiresAt: dateOnlyToApiIso(values.expiresAt) }
          : {}),
        ...(values.type === 'IN' && values.totalPrice !== ''
          ? { totalPrice: Number(values.totalPrice) }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Movimentação registrada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar a movimentação.'));
    },
  });

  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title="Movimentar estoque"
          subtitle={`${item.name} · atual: ${item.quantity} ${item.unit ?? ''}`}
          icon={<SwapHorizOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    onChange={(_, val) => val && field.onChange(val)}
                    color="primary"
                    size="small"
                  >
                    <ToggleButton value="IN">Entrada</ToggleButton>
                    <ToggleButton value="OUT">Saída</ToggleButton>
                    <ToggleButton value="ADJUSTMENT">Ajuste</ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="quantity"
                control={control}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label={type === 'ADJUSTMENT' ? 'Nova quantidade total' : 'Quantidade'}
                    fullWidth
                    required
                    helperText={
                      type === 'ADJUSTMENT'
                        ? `O estoque ficará com ${quantity} unidades`
                        : `Quantidade resultante: ${newQuantity}`
                    }
                    error={newQuantity < 0}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Motivo (opcional)"
                    fullWidth
                    placeholder={
                      type === 'IN'
                        ? 'Compra, devolução...'
                        : type === 'OUT'
                          ? 'Uso em procedimento, perda...'
                          : 'Inventário, correção...'
                    }
                  />
                )}
              />
            </Grid>
            {type === 'IN' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="totalPrice"
                    control={control}
                    rules={{
                      required: 'Valor total é obrigatório para entradas',
                      min: { value: 0.01, message: 'Informe um valor maior que zero' },
                    }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        type="number"
                        inputProps={{ step: '0.01', min: 0.01 }}
                        label="Valor total da compra"
                        fullWidth
                        required
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ??
                          (calculatedUnitPrice > 0
                            ? `Custo unitário: ${brl.format(calculatedUnitPrice)} · gera despesa no financeiro`
                            : 'Gera uma despesa no financeiro ao confirmar')
                        }
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="expiresAt"
                    control={control}
                    rules={{ required: 'Data de validade é obrigatória para entradas' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Data de validade do lote"
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ??
                          'Cada entrada pode ter validade diferente (lotes distintos)'
                        }
                      />
                    )}
                  />
                </Grid>
              </>
            )}
            {newQuantity < 0 && (
              <Grid item xs={12}>
                <Alert severity="error">Estoque insuficiente para essa saída.</Alert>
              </Grid>
            )}
            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao registrar movimento'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              mutation.isPending ||
              newQuantity < 0 ||
              (type === 'IN' && totalPrice <= 0)
            }
          >
            {mutation.isPending ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

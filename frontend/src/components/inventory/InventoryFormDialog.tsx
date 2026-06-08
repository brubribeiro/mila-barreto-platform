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
  MenuItem,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inventoryApi, InventoryItemPayload } from '../../api/inventory';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { InventoryItem } from '../../types';

interface InventoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

interface FormValues {
  name: string;
  sku: string;
  description: string;
  minQuantity: number;
  unit: string;
  costPrice: number;
  expiryNotifyDaysBefore: string;
}

const empty: FormValues = {
  name: '',
  sku: '',
  description: '',
  minQuantity: 0,
  unit: '',
  costPrice: 0,
  expiryNotifyDaysBefore: '',
};

const unitOptions = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'par', label: 'Par' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'fr', label: 'Frasco (fr)' },
  { value: 'tb', label: 'Tubo (tb)' },
  { value: 'amp', label: 'Ampola (amp)' },
];

export function InventoryFormDialog({ open, onClose, item }: InventoryFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  useEffect(() => {
    if (!open) return;
    if (item) {
      reset({
        name: item.name,
        sku: item.sku ?? '',
        description: item.description ?? '',
        minQuantity: item.minQuantity,
        unit: item.unit ?? '',
        costPrice: Number(item.costPrice ?? 0),
        expiryNotifyDaysBefore: item.expiryNotifyDaysBefore != null ? String(item.expiryNotifyDaysBefore) : '',
      });
    } else {
      reset(empty);
    }
  }, [open, item, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const notify = values.expiryNotifyDaysBefore ? Number(values.expiryNotifyDaysBefore) : null;
      const payload: InventoryItemPayload = {
        name: values.name,
        minQuantity: Number(values.minQuantity),
        ...(values.sku ? { sku: values.sku } : {}),
        ...(values.description ? { description: values.description } : {}),
        ...(values.unit ? { unit: values.unit } : {}),
        ...(values.costPrice ? { costPrice: Number(values.costPrice) } : {}),
        expiryNotifyDaysBefore: notify,
      };
      return item ? inventoryApi.update(item.id, payload) : inventoryApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={item ? 'Editar item' : 'Novo item de estoque'}
          subtitle="Nome, unidade, estoque mínimo e custo"
          icon={<Inventory2OutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={8}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Nome é obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome do produto"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="sku"
                control={control}
                render={({ field }) => <TextField {...field} label="SKU / Código" fullWidth />}
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
            <Grid item xs={6} sm={4}>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Unidade" fullWidth>
                    <MenuItem value="">
                      <em>Nenhuma</em>
                    </MenuItem>
                    {unitOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Controller
                name="minQuantity"
                control={control}
                render={({ field }) => (
                  <TextField {...field} type="number" label="Estoque mínimo" fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Controller
                name="costPrice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    inputProps={{ step: '0.01' }}
                    label="Custo"
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="expiryNotifyDaysBefore"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Notificar antes da validade"
                    fullWidth
                    inputProps={{ min: 1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                    }}
                    helperText="Deixe vazio para não notificar"
                  />
                )}
              />
            </Grid>
            {!item && (
              <Grid item xs={12}>
                <Alert severity="info">
                  O estoque inicial é zero. Para adicionar quantidade, registre uma entrada de estoque após criar o item.
                </Alert>
              </Grid>
            )}
            {item && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Para alterar quantidade ou validade, use a movimentação de entrada.
                </Alert>
              </Grid>
            )}
            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar item'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

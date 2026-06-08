import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
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

const INVENTORY_DIALOG_MAX_WIDTH = 820;

const SECTION_LABEL_SX = {
  mb: 1,
  display: 'block',
  letterSpacing: '0.04em',
} as const;

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
] as const;

const COMMON_UNIT_VALUES = ['un', 'ml', 'fr', 'amp', 'g', 'kg'] as const;

const unitLabelByValue = Object.fromEntries(unitOptions.map((opt) => [opt.value, opt.label])) as Record<
  string,
  string
>;

export function InventoryFormDialog({ open, onClose, item }: InventoryFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({ defaultValues: empty });
  const watchedUnit = watch('unit');

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
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...dialogPaperSx(isMobile),
          width: '100%',
          maxWidth: isMobile ? undefined : INVENTORY_DIALOG_MAX_WIDTH,
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={item ? 'Editar item' : 'Novo item de estoque'}
          subtitle={
            item
              ? `${item.name} · ${item.quantity} ${item.unit ?? 'un'} em estoque`
              : 'Cadastre o produto e configure estoque mínimo e custo'
          }
          icon={<Inventory2OutlinedIcon fontSize="small" />}
        />

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          <Grid container spacing={2.5} alignItems="flex-start">
            <Grid item xs={12} md={6}>
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
                      label="Nome do produto"
                      fullWidth
                      required
                      autoFocus={!item}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => <TextField {...field} label="SKU / Código" fullWidth />}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Descrição" fullWidth multiline minRows={3} />
                  )}
                />
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={SECTION_LABEL_SX}>
                  Estoque e custo
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Unidade de medida
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mb: 1.5 }}>
                      {COMMON_UNIT_VALUES.map((value) => (
                        <Chip
                          key={value}
                          label={unitLabelByValue[value]?.replace(/\s*\(.+\)$/, '') ?? value}
                          size="small"
                          clickable
                          color={watchedUnit === value ? 'primary' : 'default'}
                          variant={watchedUnit === value ? 'filled' : 'outlined'}
                          onClick={() => setValue('unit', value, { shouldDirty: true })}
                        />
                      ))}
                    </Stack>
                    <Controller
                      name="unit"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="Unidade" fullWidth size="small">
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
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Controller
                      name="minQuantity"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Estoque mínimo"
                          fullWidth
                          inputProps={{ min: 0, step: 1 }}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />
                    <Controller
                      name="costPrice"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          inputProps={{ step: '0.01', min: 0 }}
                          label="Custo unitário"
                          fullWidth
                          InputProps={{
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                          }}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={SECTION_LABEL_SX}>
                      Validade
                    </Typography>
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
                        />
                      )}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                      Deixe vazio para não receber alertas de validade.
                    </Typography>
                  </Box>

                  <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                    {item
                      ? 'Para alterar quantidade ou lote com validade, use a movimentação de entrada.'
                      : 'O estoque inicial é zero. Após criar, registre uma entrada para adicionar quantidade.'}
                  </Alert>

                  {mutation.isError && (
                    <Alert severity="error">
                      {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar item'}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={dialogActionsBorderSx}>
          <Button onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : item ? 'Salvar' : 'Criar item'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

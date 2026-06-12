import { useEffect, type ReactNode } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inventoryApi, InventoryItemPayload } from '../../api/inventory';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
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

const DIALOG_MAX_WIDTH = 900;
const DIALOG_HEIGHT_DESKTOP = 650;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
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

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <SectionIcon>{icon}</SectionIcon>
      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
        {title}
      </Typography>
    </Stack>
  );
}

function SubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
      {children}
    </Typography>
  );
}

export function InventoryFormDialog({ open, onClose, item }: InventoryFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
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
      toast.success(item ? 'Item atualizado.' : 'Item criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o item.'));
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
                maxHeight: '94dvh',
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
          title={item ? 'Editar item' : 'Novo item de estoque'}
          subtitle={
            item
              ? `${item.name} · ${item.quantity} ${item.unit ?? 'un'} em estoque`
              : 'Cadastre o produto e configure estoque mínimo e custo'
          }
          icon={
            item ? <EditOutlinedIcon fontSize="small" /> : <Inventory2OutlinedIcon fontSize="small" />
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
            display: 'flex',
            flexDirection: 'column',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação" />
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
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<WarehouseOutlinedIcon fontSize="small" />} title="Estoque e custo" />
                <Stack spacing={2}>
                  <Box>
                    <SubsectionLabel>Unidade de medida</SubsectionLabel>
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
                    <SubsectionLabel>Validade</SubsectionLabel>
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

                  <Alert severity="info" sx={{ py: 0.75 }}>
                    {item
                      ? 'Para alterar quantidade ou lote com validade, use a movimentação de entrada.'
                      : 'O estoque inicial é zero. Após criar, registre uma entrada para adicionar quantidade.'}
                  </Alert>
                </Stack>
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar item'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : item ? 'Salvar' : 'Criar item'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

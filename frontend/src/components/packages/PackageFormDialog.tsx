import { useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { packagesApi, PackagePayload } from '../../api/packages';
import { proceduresApi } from '../../api/procedures';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { Package } from '../../types';

interface PackageFormDialogProps {
  open: boolean;
  onClose: () => void;
  pkg?: Package | null;
}

type ItemRow = { procedureId: string; quantity: number; sortOrder: number };

type FormValues = {
  name: string;
  description: string;
  type: 'COMBO' | 'SESSIONS';
  totalPrice: number | string;
  discountPercent: number | string;
  validityDays: number | string;
  active: boolean;
  items: ItemRow[];
};

const empty: FormValues = {
  name: '',
  description: '',
  type: 'COMBO',
  totalPrice: '',
  discountPercent: '',
  validityDays: '',
  active: true,
  items: [{ procedureId: '', quantity: 1, sortOrder: 0 }],
};

export function PackageFormDialog({ open, onClose, pkg }: PackageFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: empty,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      pkg
        ? {
            name: pkg.name,
            description: pkg.description ?? '',
            type: pkg.type,
            totalPrice: pkg.totalPrice ? Number(pkg.totalPrice) : '',
            discountPercent: pkg.discountPercent ? Number(pkg.discountPercent) : '',
            validityDays: pkg.validityDays ?? '',
            active: pkg.active,
            items:
              pkg.items?.map((item, idx) => ({
                procedureId: item.procedureId,
                quantity: item.quantity,
                sortOrder: item.sortOrder ?? idx,
              })) ?? [],
          }
        : empty,
    );
  }, [open, pkg, reset]);

  const watchedItems = watch('items');
  const watchedType = watch('type');
  const usedProcIds = new Set(watchedItems.map((i) => i.procedureId).filter(Boolean));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: PackagePayload = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        totalPrice: values.totalPrice ? Number(values.totalPrice) : null,
        discountPercent: values.discountPercent ? Number(values.discountPercent) : null,
        validityDays: values.validityDays ? Number(values.validityDays) : null,
        active: values.active,
        items: values.items
          .filter((i) => i.procedureId)
          .map((i, idx) => ({
            procedureId: i.procedureId,
            quantity: Number(i.quantity),
            sortOrder: i.sortOrder ?? idx,
          })),
      };
      return pkg ? packagesApi.update(pkg.id, payload) : packagesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      onClose();
    },
  });

  // Calcula preço somando procedimentos
  const calculatedPrice = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const proc = procedures.find((p) => p.id === item.procedureId);
      return sum + (proc ? Number(proc.price) * (item.quantity || 1) : 0);
    }, 0);
  }, [watchedItems, procedures]);

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={pkg ? 'Editar pacote' : 'Novo pacote'}
          subtitle="Procedimentos, sessões e validade"
          icon={<RedeemOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Nome */}
            <Grid item xs={12} sm={8}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Nome é obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome do pacote"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            {/* Tipo */}
            <Grid item xs={12} sm={4}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth>
                    <MenuItem value="COMBO">Combo (procedimentos diferentes)</MenuItem>
                    <MenuItem value="SESSIONS">Sessões (mesmo procedimento)</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            {/* Descrição */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Descrição" fullWidth multiline rows={2} />
                )}
              />
            </Grid>

            {/* Preço fixo */}
            <Grid item xs={4}>
              <Controller
                name="totalPrice"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Preço fixo"
                    fullWidth
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                    helperText="Deixe vazio para usar desconto %"
                  />
                )}
              />
            </Grid>

            {/* Desconto percentual */}
            <Grid item xs={4}>
              <Controller
                name="discountPercent"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Desconto"
                    fullWidth
                    inputProps={{ step: '0.01', min: 0, max: 100 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    helperText="Alternativo ao preço fixo"
                  />
                )}
              />
            </Grid>

            {/* Validade */}
            <Grid item xs={4}>
              <Controller
                name="validityDays"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Validade"
                    fullWidth
                    inputProps={{ min: 1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                    }}
                    helperText="Deixe vazio = sem validade"
                  />
                )}
              />
            </Grid>

            {/* Ativo */}
            <Grid item xs={12}>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Pacote ativo (disponível para venda)"
                  />
                )}
              />
            </Grid>

            {/* Procedimentos do pacote */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  Procedimentos do pacote
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Soma dos procedimentos: {brl.format(calculatedPrice)}
                </Typography>
              </Stack>

              {fields.map((field, index) => {
                const currentId = watchedItems[index]?.procedureId;
                return (
                  <Stack key={field.id} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                    <Controller
                      name={`items.${index}.procedureId`}
                      control={control}
                      rules={{ required: true }}
                      render={({ field: f }) => (
                        <Autocomplete
                          sx={{ flex: 1 }}
                          options={procedures.filter(
                            (p) => p.active && (!usedProcIds.has(p.id) || p.id === currentId),
                          )}
                          getOptionLabel={(o) =>
                            typeof o === 'string' ? o : `${o.name} (${brl.format(Number(o.price))})`
                          }
                          value={procedures.find((p) => p.id === f.value) ?? null}
                          onChange={(_, v) => f.onChange(v?.id ?? '')}
                          renderInput={(params) => (
                            <TextField {...params} label="Procedimento" size="small" required />
                          )}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                        />
                      )}
                    />
                    <Controller
                      name={`items.${index}.quantity`}
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field: f }) => (
                        <TextField
                          {...f}
                          type="number"
                          label="Qtd"
                          size="small"
                          sx={{ width: 90 }}
                          inputProps={{ min: 1 }}
                        />
                      )}
                    />
                    <Tooltip title="Remover">
                      <IconButton
                        size="small"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                );
              })}

              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => append({ procedureId: '', quantity: 1, sortOrder: fields.length })}
                disabled={watchedType === 'SESSIONS' && fields.length >= 1}
              >
                Adicionar procedimento
              </Button>
              {watchedType === 'SESSIONS' && fields.length >= 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Pacote de sessões aceita apenas 1 procedimento (ajuste a quantidade)
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {pkg ? 'Salvar' : 'Criar pacote'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

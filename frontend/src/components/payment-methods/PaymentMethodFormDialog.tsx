import { useEffect } from 'react';
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Button,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi, CreatePaymentMethodPayload } from '../../api/paymentMethods';
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

export function PaymentMethodFormDialog({ open, onClose, editing }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', feePercent: 0, active: true },
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          feePercent: Number(editing.feePercent),
          active: editing.active,
        });
      } else {
        reset({ name: '', feePercent: 0, active: true });
      }
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
      name: values.name,
      feePercent: Number(values.feePercent),
      active: values.active,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Nome é obrigatório' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Nome"
                  placeholder="Ex: Crédito à vista"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  fullWidth
                />
              )}
            />

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
                  label="Taxa da maquininha"
                  type="number"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? 'Percentual descontado pela operadora'}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 100 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              )}
            />

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={field.onChange} />}
                  label="Ativa"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

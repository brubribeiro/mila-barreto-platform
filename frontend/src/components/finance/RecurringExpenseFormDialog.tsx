import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recurringExpensesApi, RecurringExpensePayload } from '../../api/recurring-expenses';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { ExpenseType, RecurringExpense } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  expense?: RecurringExpense | null;
}

interface FormValues {
  name: string;
  description: string;
  amount: number;
  category: string;
  expenseType: ExpenseType;
  dueDay: number;
  active: boolean;
}

const empty: FormValues = {
  name: '',
  description: '',
  amount: 0,
  category: '',
  expenseType: 'FIXED',
  dueDay: 1,
  active: true,
};

export function RecurringExpenseFormDialog({ open, onClose, expense }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? {
            name: expense.name,
            description: expense.description ?? '',
            amount: Number(expense.amount),
            category: expense.category ?? '',
            expenseType: expense.expenseType,
            dueDay: expense.dueDay,
            active: expense.active,
          }
        : empty,
    );
  }, [open, expense, reset]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload: RecurringExpensePayload = {
        name: v.name,
        amount: Number(v.amount),
        expenseType: v.expenseType,
        dueDay: Number(v.dueDay),
        active: v.active,
        ...(v.description ? { description: v.description } : {}),
        ...(v.category ? { category: v.category } : {}),
      };
      return expense
        ? recurringExpensesApi.update(expense.id, payload)
        : recurringExpensesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
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
          title={expense ? 'Editar despesa recorrente' : 'Nova despesa recorrente'}
          subtitle="Valor, vencimento e tipo fixo ou variável"
          icon={<EventRepeatOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Nome obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    placeholder="Ex: Aluguel, Internet, Seguro"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="amount"
                control={control}
                rules={{ required: true, min: 0.01 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Valor"
                    fullWidth
                    required
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="dueDay"
                control={control}
                rules={{ required: true, min: 1, max: 31 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Dia do vencimento"
                    fullWidth
                    required
                    inputProps={{ min: 1, max: 31 }}
                    helperText="Dia do mês (1-31)"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="expenseType"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth>
                    <MenuItem value="FIXED">Fixa</MenuItem>
                    <MenuItem value="VARIABLE">Variável</MenuItem>
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Categoria"
                    fullWidth
                    placeholder="Ex: Aluguel, Utilidades, Marketing"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descrição (opcional)"
                    fullWidth
                    multiline
                    rows={2}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Ativa"
                  />
                )}
              />
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar'}
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

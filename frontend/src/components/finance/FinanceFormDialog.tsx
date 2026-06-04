import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { financeApi, FinancialEntryPayload } from '../../api/finance';
import { dateInputValueFromApi, dateOnlyToApiIso } from '../../utils/dateOnly';
import { patientsApi } from '../../api/patients';
import { paymentMethodsApi } from '../../api/paymentMethods';
import type { ExpenseType, FinancialEntry, FinancialType, PaymentMethodEntry } from '../../types';

interface FinanceFormDialogProps {
  open: boolean;
  onClose: () => void;
  entry?: FinancialEntry | null;
}

interface FormValues {
  type: FinancialType;
  description: string;
  amount: number;
  paymentMethodId: string;
  category: string;
  paidAt: string;
  patientId: string;
  expenseType: ExpenseType | '';
}

const empty: FormValues = {
  type: 'INCOME',
  description: '',
  amount: 0,
  paymentMethodId: '',
  category: '',
  paidAt: dayjs().format('YYYY-MM-DD'),
  patientId: '',
  expenseType: '',
};

export function FinanceFormDialog({ open, onClose, entry }: FinanceFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: empty });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => patientsApi.list(),
    enabled: open,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodEntry[]>({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (entry) {
      reset({
        type: entry.type,
        description: entry.description,
        amount: Number(entry.amount),
        paymentMethodId: entry.paymentMethodId ?? '',
        category: entry.category ?? '',
        paidAt: dateInputValueFromApi(entry.paidAt),
        patientId: entry.patientId ?? '',
        expenseType: entry.expenseType ?? '',
      });
    } else {
      reset(empty);
    }
  }, [open, entry, reset]);

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: FinancialEntryPayload = {
        type: values.type,
        description: values.description,
        amount: Number(values.amount),
        ...(values.paymentMethodId ? { paymentMethodId: values.paymentMethodId } : {}),
        ...(values.category ? { category: values.category } : {}),
        ...(values.paidAt ? { paidAt: dateOnlyToApiIso(values.paidAt) } : {}),
        ...(values.patientId ? { patientId: values.patientId } : {}),
        ...(values.type === 'EXPENSE' && values.expenseType
          ? { expenseType: values.expenseType }
          : {}),
      };
      return entry ? financeApi.update(entry.id, payload) : financeApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogTitle>{entry ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
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
                  >
                    <ToggleButton value="INCOME" sx={{ py: 1 }}>
                      Receita
                    </ToggleButton>
                    <ToggleButton value="EXPENSE" sx={{ py: 1 }}>
                      Despesa
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                rules={{ required: 'Descrição é obrigatória' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Descrição"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
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
                    inputProps={{ step: '0.01' }}
                    label="Valor"
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="paidAt"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Data do pagamento"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="paymentMethodId"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Forma de pagamento" fullWidth>
                    <MenuItem value="">—</MenuItem>
                    {paymentMethods.filter((m) => m.active).map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.name}{Number(m.feePercent) > 0 ? ` (${Number(m.feePercent)}%)` : ''}
                      </MenuItem>
                    ))}
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
                    placeholder={type === 'INCOME' ? 'Ex: Atendimentos' : 'Ex: Material, Aluguel'}
                  />
                )}
              />
            </Grid>

            {type === 'EXPENSE' && (
              <Grid item xs={12}>
                <Controller
                  name="expenseType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Tipo de despesa"
                      fullWidth
                      helperText="Fixa = recorrente (aluguel, internet) · Variável = pontual (material, taxas)"
                    >
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="FIXED">Fixa</MenuItem>
                      <MenuItem value="VARIABLE">Variável</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            )}

            {type === 'INCOME' && (
              <Grid item xs={12}>
                <Controller
                  name="patientId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={patients}
                      getOptionLabel={(p) => p.name}
                      value={patients.find((p) => p.id === field.value) ?? null}
                      onChange={(_, val) => field.onChange(val?.id ?? '')}
                      renderInput={(params) => (
                        <TextField {...params} label="Vincular a paciente (opcional)" />
                      )}
                    />
                  )}
                />
              </Grid>
            )}

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar lançamento'}
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

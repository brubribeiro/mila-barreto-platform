import { useEffect } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useForm, Controller, type Control } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import {
  DialogHeader,
  dialogActionsBorderSx,
  dialogContentScrollSx,
  dialogFormLayoutSx,
  formDialogPaperSx,
} from '../DialogCloseButton';
import { FormSection } from '../FormSection';
import { MoneyField } from '../MoneyField';
import { financeApi, FinancialEntryPayload } from '../../api/finance';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { dateInputValueFromApi, dateOnlyToApiIso } from '../../utils/dateOnly';
import { patientsApi } from '../../api/patients';
import { paymentMethodsApi } from '../../api/paymentMethods';
import type { ExpenseType, FinancialEntry, FinancialType, PaymentMethodEntry } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

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

const DIALOG_MAX_WIDTH = 860;
const FORM_STACK_GAP = 1.75;

const COMPACT_SECTION_SX = {
  p: { xs: 1.5, sm: 1.75 },
  alignSelf: 'flex-start',
  width: '100%',
  height: 'fit-content',
  flex: 'none',
  '& > .MuiStack-root:first-of-type': { mb: 1.25 },
} as const;

const GRID_ITEM_SX = { alignSelf: 'flex-start', height: 'auto' } as const;

function EntryTypeToggle({
  control,
  fullWidth = false,
}: {
  control: Control<FormValues>;
  fullWidth?: boolean;
}) {
  return (
    <Controller
      name="type"
      control={control}
      render={({ field }) => (
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          fullWidth={fullWidth}
          value={field.value}
          onChange={(_, val) => val && field.onChange(val)}
        >
          <ToggleButton value="INCOME" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Receita
          </ToggleButton>
          <ToggleButton value="EXPENSE" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Despesa
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function FinanceFormDialog({ open, onClose, entry }: FinanceFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
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
      toast.success(entry ? 'Lançamento atualizado.' : 'Lançamento criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o lançamento.'));
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
          ...formDialogPaperSx(isMobile, {
            maxWidth: DIALOG_MAX_WIDTH,
            height: 'min(86dvh, 520px)',
          }),
          ...(!isMobile
            ? {
                height: 'fit-content',
                maxHeight: 'min(86dvh, 520px)',
              }
            : {}),
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        sx={{ ...dialogFormLayoutSx(isMobile), overflow: 'hidden' }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={entry ? 'Editar lançamento' : 'Novo lançamento'}
          subtitle={
            entry
              ? entry.description
              : 'Registre receitas e despesas manualmente'
          }
          icon={
            entry ? <EditOutlinedIcon fontSize="small" /> : <AttachMoneyIcon fontSize="small" />
          }
          trailing={!isCompact ? <EntryTypeToggle control={control} /> : undefined}
          bottom={
            isCompact ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Tipo de lançamento
                </Typography>
                <EntryTypeToggle control={control} fullWidth />
              </Box>
            ) : undefined
          }
        />

        <DialogContent
          sx={{
            ...dialogContentScrollSx,
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            bgcolor: 'background.default',
            '&.MuiDialogContent-root': { pt: { xs: 2, sm: 2.25 } },
          }}
        >
          <Grid container spacing={FORM_STACK_GAP} alignItems="flex-start">
            <Grid item xs={12} md={6} sx={GRID_ITEM_SX}>
              <FormSection title="Identificação" sx={COMPACT_SECTION_SX}>
                <Stack spacing={FORM_STACK_GAP}>
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
                        autoFocus={!entry}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />

                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Categoria"
                        fullWidth
                        placeholder={type === 'INCOME' ? 'Ex.: Atendimentos' : 'Ex.: Material, Aluguel'}
                      />
                    )}
                  />

                  {type === 'EXPENSE' && (
                    <Box>
                      <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, mb: 0.75 }}>
                        Tipo de despesa
                      </Typography>
                      <Controller
                        name="expenseType"
                        control={control}
                        render={({ field }) => (
                          <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            color="primary"
                            value={field.value || null}
                            onChange={(_, val) => field.onChange(val ?? '')}
                          >
                            <ToggleButton value="FIXED">Fixa</ToggleButton>
                            <ToggleButton value="VARIABLE">Variável</ToggleButton>
                          </ToggleButtonGroup>
                        )}
                      />
                      <Typography
                        sx={{
                          display: 'block',
                          mt: 0.75,
                          fontSize: fontSizes['2xs'],
                          color: 'text.secondary',
                          lineHeight: 1.35,
                        }}
                      >
                        Fixa = recorrente (aluguel, internet) · Variável = pontual (material, taxas)
                      </Typography>
                    </Box>
                  )}

                  {type === 'INCOME' && (
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
                            <TextField
                              {...params}
                              label="Vincular a paciente"
                              placeholder="Opcional"
                            />
                          )}
                        />
                      )}
                    />
                  )}
                </Stack>
              </FormSection>
            </Grid>

            <Grid item xs={12} md={6} sx={GRID_ITEM_SX}>
              <FormSection title="Valor e pagamento" sx={COMPACT_SECTION_SX}>
                <Stack spacing={FORM_STACK_GAP}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={FORM_STACK_GAP}>
                    <Controller
                      name="amount"
                      control={control}
                      rules={{ validate: (v) => Number(v) > 0 || 'Informe um valor maior que zero' }}
                      render={({ field, fieldState }) => (
                        <MoneyField
                          {...field}
                          label="Valor"
                          fullWidth
                          required
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />

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
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />
                  </Stack>

                  <Controller
                    name="paymentMethodId"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Forma de pagamento" fullWidth>
                        <MenuItem value="">—</MenuItem>
                        {paymentMethods.filter((m) => m.active).map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.name}
                            {Number(m.feePercent) > 0 ? ` (${Number(m.feePercent)}%)` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Stack>
              </FormSection>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar lançamento'}
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
            {mutation.isPending ? 'Salvando…' : entry ? 'Salvar' : 'Criar lançamento'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

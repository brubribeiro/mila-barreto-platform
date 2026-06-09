import { useEffect, type ReactNode } from 'react';
import {
  Alert,
  alpha,
  Autocomplete,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { useForm, Controller, type Control } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
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

const DIALOG_MAX_WIDTH = 900;
const DIALOG_HEIGHT_DESKTOP = 540;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
} as const;

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
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
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
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
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
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<PaymentsOutlinedIcon fontSize="small" />} title="Valor e pagamento" />
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Controller
                      name="amount"
                      control={control}
                      rules={{ required: true, min: 0.01 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          inputProps={{ step: '0.01', min: 0 }}
                          label="Valor"
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                          }}
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
              </Paper>
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

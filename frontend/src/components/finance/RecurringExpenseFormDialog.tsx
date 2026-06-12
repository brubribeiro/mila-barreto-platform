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
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { useForm, Controller, type Control } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recurringExpensesApi, RecurringExpensePayload } from '../../api/recurring-expenses';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
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

const DIALOG_MAX_WIDTH = 860;
const DIALOG_HEIGHT_DESKTOP = 560;

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

function RecurringExpenseActiveToggle({
  control,
  fullWidth = false,
}: {
  control: Control<FormValues>;
  fullWidth?: boolean;
}) {
  return (
    <Controller
      name="active"
      control={control}
      render={({ field }) => (
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          fullWidth={fullWidth}
          value={field.value ? 'active' : 'inactive'}
          onChange={(_, val) => {
            if (val === 'active') field.onChange(true);
            if (val === 'inactive') field.onChange(false);
          }}
        >
          <ToggleButton value="active" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Ativa
          </ToggleButton>
          <ToggleButton value="inactive" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Inativa
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function RecurringExpenseFormDialog({ open, onClose, expense }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
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
      toast.success(expense ? 'Despesa atualizada.' : 'Despesa criada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar a despesa.'));
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
          title={expense ? 'Editar despesa recorrente' : 'Nova despesa recorrente'}
          subtitle={
            expense
              ? expense.name
              : 'Valor, vencimento e tipo fixo ou variável'
          }
          icon={
            expense ? <EditOutlinedIcon fontSize="small" /> : <EventRepeatOutlinedIcon fontSize="small" />
          }
          trailing={!isCompact ? <RecurringExpenseActiveToggle control={control} /> : undefined}
          bottom={
            isCompact ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Status da despesa
                </Typography>
                <RecurringExpenseActiveToggle control={control} fullWidth />
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
                    name="name"
                    control={control}
                    rules={{ required: 'Nome obrigatório' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Nome"
                        fullWidth
                        required
                        autoFocus={!expense}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        placeholder="Ex.: Aluguel, Internet, Seguro"
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
                        placeholder="Ex.: Aluguel, Utilidades, Marketing"
                      />
                    )}
                  />

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descrição"
                        fullWidth
                        multiline
                        minRows={2}
                        placeholder="Detalhes adicionais (opcional)"
                      />
                    )}
                  />
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<PaymentsOutlinedIcon fontSize="small" />} title="Valores e vencimento" />
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
                          label="Valor mensal"
                          fullWidth
                          required
                          inputProps={{ step: '0.01', min: 0 }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                          }}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />

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
                          helperText="Dia do mês (1–31)"
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    />
                  </Stack>

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
                          value={field.value}
                          onChange={(_, val) => val && field.onChange(val)}
                        >
                          <ToggleButton value="FIXED">Fixa</ToggleButton>
                          <ToggleButton value="VARIABLE">Variável</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Fixas entram no custo/hora mensal; variáveis podem ser incluídas no cálculo dos
                      procedimentos.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar despesa'}
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
            {mutation.isPending ? 'Salvando…' : expense ? 'Salvar' : 'Criar despesa'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

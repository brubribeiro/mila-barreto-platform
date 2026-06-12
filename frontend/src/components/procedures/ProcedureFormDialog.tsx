import { useEffect, type ReactNode } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { proceduresApi, ProcedurePayload } from '../../api/procedures';
import { inventoryApi } from '../../api/inventory';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader } from '../DialogCloseButton';
import type { Procedure } from '../../types';

interface ProcedureFormDialogProps {
  open: boolean;
  onClose: () => void;
  procedure?: Procedure | null;
}

type MaterialRow = { itemId: string; quantity: number };

type FormValues = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  recurrenceDays: number | string;
  materials: MaterialRow[];
};

const empty: FormValues = {
  name: '',
  description: '',
  durationMinutes: 60,
  price: 0,
  active: true,
  recurrenceDays: '',
  materials: [],
};

const DIALOG_HEIGHT_DESKTOP = 860;
const DIALOG_MAX_WIDTH = 1200;

const FIELD_SX = {
  '& .MuiOutlinedInput-root': { bgcolor: '#fff' },
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
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

function FormSection({
  title,
  subtitle,
  icon,
  action,
  children,
  sx,
  fill,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  sx?: object;
  fill?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2 },
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <HeaderIcon>{icon}</HeaderIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {action}
      </Stack>
      {fill ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      ) : (
        children
      )}
    </Paper>
  );
}

export function ProcedureFormDialog({ open, onClose, procedure }: ProcedureFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isEditing = !!procedure;
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: empty });
  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      procedure
        ? {
            name: procedure.name,
            description: procedure.description ?? '',
            durationMinutes: procedure.durationMinutes,
            price: Number(procedure.price),
            active: procedure.active,
            recurrenceDays: procedure.recurrenceDays ?? '',
            materials:
              procedure.materials?.map((m) => ({
                itemId: m.itemId,
                quantity: m.quantity,
              })) ?? [],
          }
        : empty,
    );
  }, [open, procedure, reset]);

  const watchedMaterials = watch('materials');
  const watchedName = watch('name');
  const watchedPrice = Number(watch('price')) || 0;
  const watchedDuration = Number(watch('durationMinutes')) || 0;
  const watchedActive = watch('active');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: ProcedurePayload = {
        name: values.name,
        durationMinutes: Number(values.durationMinutes),
        price: Number(values.price),
        active: values.active,
        recurrenceDays: values.recurrenceDays ? Number(values.recurrenceDays) : null,
        ...(values.description ? { description: values.description } : {}),
        materials: values.materials
          .filter((m) => m.itemId && Number(m.quantity) > 0)
          .map((m) => ({ itemId: m.itemId, quantity: Number(m.quantity) })),
      };
      return procedure
        ? proceduresApi.update(procedure.id, payload)
        : proceduresApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(procedure ? 'Procedimento atualizado.' : 'Procedimento criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o procedimento.'));
    },
  });

  const usedIds = new Set(watchedMaterials.map((m) => m.itemId).filter(Boolean));

  const hasStockWarning = fields.length > 0 && watchedMaterials.some((m) => {
    const item = inventory.find((i) => i.id === m.itemId);
    return item && Number(m.quantity) > item.quantity;
  });

  const estimatedMargin =
    procedure?.baseCost != null && watchedPrice > 0
      ? watchedPrice - procedure.baseCost
      : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
          width: '100%',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : {
                maxWidth: DIALOG_MAX_WIDTH,
                height: DIALOG_HEIGHT_DESKTOP,
                maxHeight: '96dvh',
              }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={isEditing ? 'Editar procedimento' : 'Novo procedimento'}
          subtitle={watchedName?.trim() || 'Nome, valores, retorno e materiais do estoque'}
          icon={<SpaOutlinedIcon fontSize="small" />}
          trailing={
            <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
              {watchedDuration > 0 && (
                <Chip
                  size="small"
                  icon={<ScheduleOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                  label={`${watchedDuration} min`}
                  variant="outlined"
                />
              )}
              {watchedPrice > 0 && (
                <Chip size="small" label={brl.format(watchedPrice)} color="primary" variant="outlined" />
              )}
              <Chip
                size="small"
                label={watchedActive ? 'Ativo' : 'Inativo'}
                color={watchedActive ? 'success' : 'default'}
                variant={watchedActive ? 'filled' : 'outlined'}
              />
            </Stack>
          }
        />

        <DialogContent
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
            display: 'flex',
            flexDirection: 'column',
            '&.MuiDialogContent-root': {
              paddingTop: { xs: 2, sm: 3 },
            },
          }}
        >
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
            <Grid item xs={12} lg={6} sx={{ display: 'flex', minHeight: 0 }}>
              <Stack spacing={2} sx={{ width: '100%' }}>
                <FormSection
                  title="Identificação"
                  subtitle="Como o procedimento aparece na agenda e nas listagens"
                  icon={<DescriptionOutlinedIcon fontSize="small" />}
                  sx={{ height: 'auto' }}
                >
                  <Stack spacing={1.5}>
                    <Controller
                      name="name"
                      control={control}
                      rules={{ required: 'Nome é obrigatório' }}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label="Nome do procedimento"
                          fullWidth
                          required
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          sx={FIELD_SX}
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
                          minRows={3}
                          placeholder="Detalhes visíveis para a equipe..."
                          sx={FIELD_SX}
                        />
                      )}
                    />
                  </Stack>
                </FormSection>

                <FormSection
                  title="Agendamento e valores"
                  subtitle="Duração, preço cobrado e retorno sugerido"
                  icon={<ScheduleOutlinedIcon fontSize="small" />}
                  sx={{ height: 'auto' }}
                >
                  <Stack spacing={1.5} sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={2} sx={{ width: '100%', '& > *': { flex: 1, minWidth: 0 } }}>
                      <Controller
                        name="durationMinutes"
                        control={control}
                        rules={{ required: true, min: 5 }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="Duração"
                            fullWidth
                            required
                            sx={FIELD_SX}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">min</InputAdornment>,
                            }}
                          />
                        )}
                      />
                      <Controller
                        name="price"
                        control={control}
                        rules={{ required: true, min: 0 }}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            inputProps={{ step: '0.01' }}
                            label="Preço"
                            fullWidth
                            required
                            sx={FIELD_SX}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            }}
                          />
                        )}
                      />
                    </Stack>

                    <Controller
                      name="recurrenceDays"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Intervalo de retorno"
                          fullWidth
                          sx={FIELD_SX}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                          }}
                          FormHelperTextProps={{ sx: { mx: 0 } }}
                          helperText="Dias até a próxima visita sugerida (opcional)"
                        />
                      )}
                    />

                    {procedure?.baseCost != null && (
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        <Stack spacing={0.25}>
                          <Typography variant="body2">
                            Custo base (materiais):{' '}
                            <strong>{brl.format(procedure.baseCost)}</strong>
                          </Typography>
                          {estimatedMargin != null && (
                            <Typography variant="caption" color="text.secondary">
                              Margem estimada:{' '}
                              <strong style={{ color: estimatedMargin >= 0 ? undefined : theme.palette.error.main }}>
                                {brl.format(estimatedMargin)}
                              </strong>
                            </Typography>
                          )}
                        </Stack>
                      </Alert>
                    )}

                    <Paper
                      variant="outlined"
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderColor: 'divider',
                        bgcolor: watchedActive
                          ? alpha(theme.palette.success.main, 0.06)
                          : alpha(theme.palette.action.disabledBackground, 0.4),
                      }}
                    >
                      <Controller
                        name="active"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                            labelPlacement="start"
                            control={
                              <Switch
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  Disponível para agendamento
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {field.value
                                    ? 'Visível na agenda e nos pacotes'
                                    : 'Oculto até reativar'}
                                </Typography>
                              </Box>
                            }
                          />
                        )}
                      />
                    </Paper>
                  </Stack>
                </FormSection>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={6} sx={{ display: 'flex', minHeight: 0 }}>
            <FormSection
              fill
              sx={{ flex: 1, width: '100%', minHeight: 0 }}
              title="Materiais do estoque"
              subtitle="Itens deduzidos automaticamente a cada atendimento"
              icon={<Inventory2OutlinedIcon fontSize="small" />}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => append({ itemId: '', quantity: 1 })}
                >
                  Adicionar
                </Button>
              }
            >
              {fields.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 2,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Nenhum material vinculado. Esse procedimento não alterará o estoque.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflow: isMobile ? 'visible' : 'auto', pr: 0.5 }}>
                  {fields.map((field, index) => {
                    const currentItemId = watchedMaterials[index]?.itemId;
                    const currentQty = Number(watchedMaterials[index]?.quantity ?? 0);
                    const selectedItem = inventory.find((i) => i.id === currentItemId);
                    const availableItems = inventory.filter(
                      (i) => i.id === currentItemId || !usedIds.has(i.id),
                    );
                    const insufficient =
                      selectedItem && currentQty > 0 && selectedItem.quantity < currentQty;

                    return (
                      <Paper
                        key={field.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderColor: insufficient ? 'warning.main' : 'divider',
                          bgcolor: insufficient
                            ? alpha(theme.palette.warning.main, 0.04)
                            : 'background.paper',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems={{ sm: 'flex-start' }}
                        >
                          <Controller
                            name={`materials.${index}.itemId` as const}
                            control={control}
                            rules={{ required: true }}
                            render={({ field: f }) => (
                              <Autocomplete
                                sx={{ flex: 1, width: '100%' }}
                                options={availableItems}
                                getOptionLabel={(i) =>
                                  `${i.name}${i.unit ? ` (${i.unit})` : ''} — ${i.quantity} em estoque`
                                }
                                value={availableItems.find((i) => i.id === f.value) ?? null}
                                onChange={(_, val) => f.onChange(val?.id ?? '')}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Material"
                                    size="small"
                                    required
                                    sx={FIELD_SX}
                                  />
                                )}
                              />
                            )}
                          />
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Controller
                              name={`materials.${index}.quantity` as const}
                              control={control}
                              rules={{ required: true, min: 1 }}
                              render={({ field: f }) => (
                                <TextField
                                  {...f}
                                  type="number"
                                  size="small"
                                  label="Quantidade"
                                  inputProps={{ min: 1 }}
                                  sx={{ width: { xs: '100%', sm: 120 }, ...FIELD_SX }}
                                  error={insufficient}
                                  helperText={
                                    insufficient
                                      ? `Só ${selectedItem?.quantity} disponível`
                                      : selectedItem?.unit
                                        ? `Unidade: ${selectedItem.unit}`
                                        : undefined
                                  }
                                />
                              )}
                            />
                            <Tooltip title="Remover material">
                              <IconButton
                                onClick={() => remove(index)}
                                sx={{ mt: 0.25 }}
                                aria-label="Remover material"
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              {hasStockWarning && (
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1.5, flexShrink: 0 }}>
                  Algum material está acima do estoque atual. Você pode salvar, mas novos
                  agendamentos só serão permitidos quando houver quantidade suficiente.
                </Alert>
              )}
            </FormSection>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
              <Alert severity="error">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'Erro ao salvar procedimento'}
              </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            gap: 1,
          }}
        >
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar procedimento'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

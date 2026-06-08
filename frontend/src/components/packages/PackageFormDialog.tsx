import { useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray, type Control } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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

const PACKAGE_DIALOG_HEIGHT = 820;
const PACKAGE_DIALOG_MAX_WIDTH = 1000;

const SECTION_LABEL_SX = {
  mb: 1,
  display: 'block',
  letterSpacing: '0.04em',
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function PackageActiveToggle({
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
            Ativo
          </ToggleButton>
          <ToggleButton value="inactive" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Inativo
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function PackageFormDialog({ open, onClose, pkg }: PackageFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
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

  const calculatedPrice = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const proc = procedures.find((p) => p.id === item.procedureId);
      return sum + (proc ? Number(proc.price) * (item.quantity || 1) : 0);
    }, 0);
  }, [watchedItems, procedures]);

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
                maxWidth: PACKAGE_DIALOG_MAX_WIDTH,
                height: PACKAGE_DIALOG_HEIGHT,
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
          title={pkg ? 'Editar pacote' : 'Novo pacote'}
          subtitle="Procedimentos, precificação e validade"
          icon={<RedeemOutlinedIcon fontSize="small" />}
          trailing={!isCompact ? <PackageActiveToggle control={control} /> : undefined}
          bottom={
            isCompact ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Disponível para venda
                </Typography>
                <PackageActiveToggle control={control} fullWidth />
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
            overflow: isCompact ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Grid
            container
            spacing={2.5}
            sx={{
              flex: 1,
              minHeight: 0,
              alignItems: 'stretch',
              ...(isCompact ? {} : { height: '100%' }),
            }}
          >
            <Grid item xs={12} md={6}>
              <Stack spacing={2.5} sx={{ width: '100%' }}>
                <Box>
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
                          label="Nome do pacote"
                          fullWidth
                          required
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Tipo de pacote
                      </Typography>
                      <Controller
                        name="type"
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
                            <ToggleButton value="COMBO">Combo</ToggleButton>
                            <ToggleButton value="SESSIONS">Sessões</ToggleButton>
                          </ToggleButtonGroup>
                        )}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                        {watchedType === 'COMBO'
                          ? 'Vários procedimentos diferentes no mesmo pacote'
                          : 'Um procedimento repetido em várias sessões'}
                      </Typography>
                    </Box>

                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Descrição" fullWidth multiline minRows={2} />
                      )}
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={SECTION_LABEL_SX}>
                    Precificação
                  </Typography>
                  <Stack spacing={2}>
                    <Stack spacing={2}>
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
                          />
                        )}
                      />
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
                          />
                        )}
                      />
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
                          />
                        )}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Use preço fixo ou desconto percentual sobre a soma dos procedimentos. Validade vazia = sem prazo.
                    </Typography>

                    {calculatedPrice > 0 && isCompact && (
                      <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                        Soma dos procedimentos: <strong>{brl.format(calculatedPrice)}</strong>
                      </Alert>
                    )}

                    {mutation.isError && (
                      <Alert severity="error" sx={{ mx: 0 }}>
                        {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar pacote'}
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
              sx={{
                display: 'flex',
                minHeight: 0,
                ...(isCompact ? {} : { height: '100%' }),
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  ...(isCompact ? {} : { height: '100%' }),
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mb: 1.5, flexShrink: 0 }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ ...SECTION_LABEL_SX, mb: 0 }}
                  >
                    Procedimentos
                  </Typography>
                  {calculatedPrice > 0 && (
                    <Chip size="small" label={brl.format(calculatedPrice)} color="primary" variant="outlined" />
                  )}
                </Stack>

                {!isCompact && calculatedPrice > 0 && (
                  <Alert severity="info" icon={false} sx={{ py: 0.75, mb: 1.5, flexShrink: 0 }}>
                    Soma dos procedimentos: <strong>{brl.format(calculatedPrice)}</strong>
                  </Alert>
                )}

                <Box
                  sx={{
                    flex: isCompact ? undefined : 1,
                    minHeight: isCompact ? undefined : 0,
                    overflow: isCompact ? 'visible' : 'auto',
                    pr: isCompact ? 0 : 0.25,
                  }}
                >
                  <Stack spacing={1.5}>
                    {fields.map((field, index) => {
                      const currentId = watchedItems[index]?.procedureId;
                      return (
                        <Paper
                          key={field.id}
                          variant="outlined"
                          sx={{
                            p: { xs: 1.5, sm: 1.75 },
                            borderRadius: 2,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Controller
                              name={`items.${index}.procedureId`}
                              control={control}
                              rules={{ required: true }}
                              render={({ field: f }) => (
                                <Autocomplete
                                  sx={{ width: '100%' }}
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
                            <Stack direction="row" spacing={1} alignItems="center">
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
                                    sx={{ width: 96 }}
                                    inputProps={{ min: 1 }}
                                  />
                                )}
                              />
                              <Tooltip title="Remover">
                                <IconButton
                                  size="small"
                                  onClick={() => remove(index)}
                                  disabled={fields.length <= 1}
                                  aria-label="Remover procedimento"
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </Paper>
                    );
                  })}
                  </Stack>
                </Box>

                <Stack spacing={1} sx={{ mt: 1.5, flexShrink: 0 }}>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => append({ procedureId: '', quantity: 1, sortOrder: fields.length })}
                    disabled={watchedType === 'SESSIONS' && fields.length >= 1}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Adicionar procedimento
                  </Button>
                  {watchedType === 'SESSIONS' && fields.length >= 1 && (
                    <Typography variant="caption" color="text.secondary">
                      Pacote de sessões aceita apenas 1 procedimento — ajuste a quantidade
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : pkg ? 'Salvar' : 'Criar pacote'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

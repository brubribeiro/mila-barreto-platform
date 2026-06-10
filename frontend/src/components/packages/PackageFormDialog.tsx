import { useEffect, useMemo, type ReactNode } from 'react';
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
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
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

type PricingMode = 'PROCEDURES' | 'FIXED' | 'DISCOUNT';

type FormValues = {
  name: string;
  description: string;
  type: 'COMBO' | 'SESSIONS';
  pricingMode: PricingMode;
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
  pricingMode: 'PROCEDURES',
  totalPrice: '',
  discountPercent: '',
  validityDays: '',
  active: true,
  items: [{ procedureId: '', quantity: 1, sortOrder: 0 }],
};

const PACKAGE_DIALOG_HEIGHT = 880;
const PACKAGE_DIALOG_MAX_WIDTH = 1140;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
} as const;

const FORM_CARD_FILL_SX = {
  ...FORM_CARD_SX,
  height: '100%',
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

function resolvePricingMode(pkg: Package): PricingMode {
  if (pkg.totalPrice != null && Number(pkg.totalPrice) > 0) return 'FIXED';
  if (pkg.discountPercent != null && Number(pkg.discountPercent) > 0) return 'DISCOUNT';
  return 'PROCEDURES';
}

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
  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
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
            pricingMode: resolvePricingMode(pkg),
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
  const watchedPricingMode = watch('pricingMode');
  const watchedTotalPrice = watch('totalPrice');
  const watchedDiscountPercent = watch('discountPercent');
  const usedProcIds = new Set(watchedItems.map((i) => i.procedureId).filter(Boolean));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: PackagePayload = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        totalPrice:
          values.pricingMode === 'FIXED' && values.totalPrice ? Number(values.totalPrice) : null,
        discountPercent:
          values.pricingMode === 'DISCOUNT' && values.discountPercent
            ? Number(values.discountPercent)
            : null,
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

  const salePricePreview = useMemo(() => {
    if (watchedPricingMode === 'FIXED') {
      const fixed = Number(watchedTotalPrice);
      return fixed > 0 ? fixed : null;
    }
    if (calculatedPrice <= 0) return null;
    if (watchedPricingMode === 'DISCOUNT') {
      const pct = Number(watchedDiscountPercent);
      if (pct > 0) {
        return Math.round(calculatedPrice * (1 - pct / 100) * 100) / 100;
      }
      return null;
    }
    return calculatedPrice;
  }, [watchedPricingMode, watchedTotalPrice, watchedDiscountPercent, calculatedPrice]);

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
          title={pkg ? 'Editar pacote' : 'Novo pacote'}
          subtitle="Procedimentos, precificação e validade"
          icon={
            pkg ? <EditOutlinedIcon fontSize="small" /> : <RedeemOutlinedIcon fontSize="small" />
          }
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
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid
            container
            spacing={2.5}
            sx={{
              flex: 1,
              minHeight: 0,
              alignItems: 'stretch',
            }}
          >
            <Grid item xs={12} md={6}>
              <Stack spacing={2.5} sx={{ width: '100%' }}>
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
                          label="Nome do pacote"
                          fullWidth
                          required
                          autoFocus={!pkg}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />

                    <Box>
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

                    <Controller
                      name="validityDays"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Validade"
                          fullWidth
                          helperText="Validade vazia = sem prazo de expiração do pacote vendido."
                          inputProps={{ min: 1 }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                          }}
                        />
                      )}
                    />
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={FORM_CARD_SX}>
                  <SectionTitle icon={<PercentOutlinedIcon fontSize="small" />} title="Precificação" />
                  <Stack spacing={2}>
                    <Box>
                      <SubsectionLabel>Forma de precificação</SubsectionLabel>
                      <Controller
                        name="pricingMode"
                        control={control}
                        render={({ field }) => (
                          <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            color="primary"
                            value={field.value}
                            onChange={(_, val) => {
                              if (!val) return;
                              field.onChange(val);
                              if (val === 'FIXED') setValue('discountPercent', '');
                              if (val === 'DISCOUNT') setValue('totalPrice', '');
                              if (val === 'PROCEDURES') {
                                setValue('totalPrice', '');
                                setValue('discountPercent', '');
                              }
                            }}
                          >
                            <ToggleButton value="PROCEDURES">Soma dos procedimentos</ToggleButton>
                            <ToggleButton value="FIXED">
                              <AttachMoneyOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} />
                              Preço fixo
                            </ToggleButton>
                            <ToggleButton value="DISCOUNT">
                              <PercentOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} />
                              Desconto (%)
                            </ToggleButton>
                          </ToggleButtonGroup>
                        )}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                        {watchedPricingMode === 'PROCEDURES'
                          ? 'O pacote será vendido pelo valor total dos procedimentos selecionados.'
                          : watchedPricingMode === 'FIXED'
                            ? 'Informe um valor fechado para o pacote, independente da soma dos procedimentos.'
                            : 'Informe o desconto percentual aplicado sobre a soma dos procedimentos.'}
                      </Typography>
                    </Box>

                    {watchedPricingMode === 'FIXED' && (
                      <Controller
                        name="totalPrice"
                        control={control}
                        rules={{
                          required: 'Informe o preço fixo do pacote',
                          min: { value: 0.01, message: 'O preço deve ser maior que zero' },
                        }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="Preço fixo do pacote"
                            fullWidth
                            required
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            inputProps={{ step: '0.01', min: 0 }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            }}
                          />
                        )}
                      />
                    )}

                    {watchedPricingMode === 'DISCOUNT' && (
                      <Controller
                        name="discountPercent"
                        control={control}
                        rules={{
                          required: 'Informe o desconto percentual',
                          min: { value: 0.01, message: 'O desconto deve ser maior que zero' },
                          max: { value: 100, message: 'Máximo 100%' },
                        }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="Desconto sobre a soma"
                            fullWidth
                            required
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            inputProps={{ step: '0.01', min: 0, max: 100 }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        )}
                      />
                    )}

                    {calculatedPrice > 0 && watchedPricingMode !== 'PROCEDURES' && (
                      <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                        Soma dos procedimentos: <strong>{brl.format(calculatedPrice)}</strong>
                        {salePricePreview != null && (
                          <>
                            {' '}
                            · Preço de venda: <strong>{brl.format(salePricePreview)}</strong>
                          </>
                        )}
                      </Alert>
                    )}

                    {watchedPricingMode === 'PROCEDURES' && calculatedPrice > 0 && (
                      <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                        Preço de venda: <strong>{brl.format(calculatedPrice)}</strong>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
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
                  ...FORM_CARD_FILL_SX,
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  ...(isCompact ? {} : { height: '100%' }),
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1.25}
                  sx={{ mb: 1.5, flexShrink: 0 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                    <SectionIcon>
                      <MedicalServicesOutlinedIcon fontSize="small" />
                    </SectionIcon>
                    <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
                      Procedimentos
                    </Typography>
                  </Stack>
                  {salePricePreview != null && (
                    <Chip
                      size="small"
                      label={brl.format(salePricePreview)}
                      color="primary"
                      variant="outlined"
                      sx={{ flexShrink: 0 }}
                    />
                  )}
                </Stack>

                {!isCompact && calculatedPrice > 0 && (
                  <Alert severity="info" icon={false} sx={{ py: 0.75, mb: 1.5, flexShrink: 0 }}>
                    Soma dos procedimentos: <strong>{brl.format(calculatedPrice)}</strong>
                    {salePricePreview != null && salePricePreview !== calculatedPrice && (
                      <>
                        {' '}
                        · Preço de venda: <strong>{brl.format(salePricePreview)}</strong>
                      </>
                    )}
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
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => remove(index)}
                                    disabled={fields.length <= 1}
                                    aria-label="Remover procedimento"
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </span>
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

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar pacote'}
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
            {mutation.isPending ? 'Salvando…' : pkg ? 'Salvar' : 'Criar pacote'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

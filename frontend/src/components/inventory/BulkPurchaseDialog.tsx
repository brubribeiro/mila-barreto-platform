import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
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
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { inventoryApi } from '../../api/inventory';
import { DialogHeader } from '../DialogCloseButton';
import { dateOnlyToApiIso, formatDateOnlyFromApi } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';

interface BulkPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
}

type LineMode = 'existing' | 'new';

interface LineForm {
  mode: LineMode;
  item: InventoryItem | null;
  newName: string;
  newSku: string;
  newUnit: string;
  newMinQuantity: number;
  quantity: number;
  productTotal: number | '';
  expiresAt: string;
}

interface FormValues {
  reason: string;
  freight: number | '';
  lines: LineForm[];
}

const DIALOG_HEIGHT_DESKTOP = 860;
const DIALOG_MAX_WIDTH = 1280;

const FIELD_SX = {
  '& .MuiOutlinedInput-root': { bgcolor: '#fff' },
} as const;

/** Campos da seção Materiais — labels sempre visíveis e legíveis */
const MATERIAL_FIELD_SX = {
  ...FIELD_SX,
  '& .MuiInputLabel-root': {
    color: 'text.primary',
    fontWeight: 500,
    fontSize: '0.875rem',
    backgroundColor: 'background.paper',
    px: 0.5,
    zIndex: 1,
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    transform: 'translate(14px, -9px) scale(0.85)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'primary.main',
  },
  '& .MuiFormHelperText-root': {
    color: 'text.secondary',
    fontSize: '0.75rem',
    lineHeight: 1.45,
    mt: 0.75,
  },
} as const;

const MATERIAL_LABEL_PROPS = { shrink: true } as const;

const unitOptions = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'par', label: 'Par' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'fr', label: 'Frasco (fr)' },
  { value: 'tb', label: 'Tubo (tb)' },
  { value: 'amp', label: 'Ampola (amp)' },
];

const emptyLine = (): LineForm => ({
  mode: 'existing',
  item: null,
  newName: '',
  newSku: '',
  newUnit: 'un',
  newMinQuantity: 0,
  quantity: 1,
  productTotal: '',
  expiresAt: '',
});

const defaultValues: FormValues = {
  reason: '',
  freight: '',
  lines: [emptyLine()],
};

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
  fill,
  sx,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  fill?: boolean;
  sx?: object;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2 },
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        ...(fill ? { flex: 1, minHeight: 0, overflow: 'hidden' } : { flexShrink: 0 }),
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 1.5, flexShrink: 0 }}
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

function parseNum(v: unknown): number {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function allocateFreight(
  lines: { productTotal: number }[],
  freight: number,
): number[] {
  const sum = lines.reduce((s, l) => s + l.productTotal, 0);
  if (sum <= 0 || freight <= 0) return lines.map(() => 0);
  const shares = lines.map((l) =>
    Math.round(freight * (l.productTotal / sum) * 100) / 100,
  );
  const allocated = shares.reduce((s, v) => s + v, 0);
  const diff = Math.round((freight - allocated) * 100) / 100;
  if (diff !== 0 && shares.length > 0) {
    shares[shares.length - 1] = Math.round((shares[shares.length - 1] + diff) * 100) / 100;
  }
  return shares;
}

function getLineLabel(line: LineForm): string {
  if (line.mode === 'existing') return line.item?.name ?? 'Selecione o produto';
  return line.newName.trim() || 'Novo item (sem nome)';
}

function isLineFilled(line: LineForm, unitCost: number): boolean {
  const qty = Number(line.quantity) > 0;
  const price = Number(line.productTotal) > 0;
  const itemOk = line.mode === 'existing' ? !!line.item : line.newName.trim().length > 0;
  return qty && price && itemOk && !!line.expiresAt && unitCost > 0;
}

export function BulkPurchaseDialog({ open, onClose }: BulkPurchaseDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
    setActiveLineIndex(0);
  }, [open, reset]);

  useEffect(() => {
    if (fields.length > 0 && activeLineIndex >= fields.length) {
      setActiveLineIndex(fields.length - 1);
    }
  }, [activeLineIndex, fields.length]);

  const watchedLines = (useWatch({ control, name: 'lines' }) ?? defaultValues.lines) as LineForm[];
  const watchedFreight = useWatch({ control, name: 'freight' });
  const freight = parseNum(watchedFreight);

  const lineTotals = useMemo(() => {
    const parsed = watchedLines.map((l) => ({
      productTotal: parseNum(l.productTotal),
      quantity: parseNum(l.quantity),
      label:
        l.mode === 'existing'
          ? l.item?.name ?? '—'
          : l.newName.trim() || 'Novo item',
    }));
    const sumProducts = parsed.reduce((s, l) => s + l.productTotal, 0);
    const freightShares = allocateFreight(parsed, freight);
    return parsed.map((l, i) => {
      const freightShare = freightShares[i] ?? 0;
      const total = Math.round((l.productTotal + freightShare) * 100) / 100;
      const unitCost =
        l.quantity > 0 ? Math.round((total / l.quantity) * 100) / 100 : 0;
      return { ...l, freightShare, total, unitCost };
    });
  }, [watchedLines, freight]);

  const productsTotal = lineTotals.reduce((s, l) => s + l.productTotal, 0);
  const grandTotal = Math.round((productsTotal + freight) * 100) / 100;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payloadLines = values.lines.map((line) => {
        const base = {
          quantity: Number(line.quantity),
          productTotal: Number(line.productTotal),
          expiresAt: dateOnlyToApiIso(line.expiresAt),
        };
        if (line.mode === 'existing') {
          return { itemId: line.item!.id, ...base };
        }
        return {
          newItem: {
            name: line.newName.trim(),
            ...(line.newSku.trim() ? { sku: line.newSku.trim() } : {}),
            minQuantity: Number(line.newMinQuantity) || 0,
            unit: line.newUnit || undefined,
          },
          ...base,
        };
      });
      return inventoryApi.createBulkPurchase({
        ...(values.reason.trim() ? { reason: values.reason.trim() } : {}),
        ...(freight > 0 ? { freight } : {}),
        lines: payloadLines,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
  });

  const canSubmit =
    productsTotal > 0 &&
    watchedLines.every((l, i) => {
      const qty = parseNum(l.quantity) > 0;
      const price = parseNum(l.productTotal) > 0;
      const itemOk =
        l.mode === 'existing' ? !!l.item : l.newName.trim().length > 0;
      return qty && price && itemOk && !!l.expiresAt && lineTotals[i].unitCost > 0;
    });

  const formIndex = fields.length > 0 ? Math.min(activeLineIndex, fields.length - 1) : 0;
  const currentLineTotals = lineTotals[formIndex];
  const currentUnitCost = currentLineTotals?.unitCost ?? 0;

  const handleAddLine = () => {
    append(emptyLine());
    setActiveLineIndex(fields.length);
  };

  const handleRemoveLine = (idx: number) => {
    if (fields.length <= 1) return;
    remove(idx);
    setActiveLineIndex((prev) => {
      if (prev > idx) return prev - 1;
      if (prev >= idx) return Math.max(0, prev - 1);
      return prev;
    });
  };

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
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : {
                maxWidth: DIALOG_MAX_WIDTH,
                height: DIALOG_HEIGHT_DESKTOP,
                maxHeight: '96vh',
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
          title="Compra em lote"
          subtitle="Vários materiais, validade por item e frete rateado no custo"
          icon={<ShoppingCartOutlinedIcon fontSize="small" />}
          sx={{ bgcolor: 'background.paper' }}
          trailing={
            <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
              <Chip
                size="small"
                icon={<Inventory2OutlinedIcon sx={{ fontSize: '16px !important' }} />}
                label={`${fields.length} ${fields.length === 1 ? 'material' : 'materiais'}`}
                variant="outlined"
              />
              {grandTotal > 0 && (
                <Chip size="small" label={brl.format(grandTotal)} color="primary" variant="outlined" />
              )}
              {freight > 0 && (
                <Chip
                  size="small"
                  icon={<LocalShippingOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                  label={`Frete ${brl.format(freight)}`}
                  variant="outlined"
                />
              )}
            </Stack>
          }
        />

        <DialogContent
          dividers={false}
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            p: { xs: 2, sm: 3 },
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
            display: 'flex',
            flexDirection: 'column',
            '&.MuiDialogContent-root': {
              paddingTop: { xs: 2, sm: 3 },
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Box
              sx={{
                flex: { xs: '0 0 auto', lg: '0 0 60%' },
                maxWidth: { lg: '60%' },
                width: { xs: '100%', lg: '60%' },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <Stack
                spacing={2}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
            <FormSection
              title="Dados da compra"
              subtitle="Frete diluído proporcionalmente ao valor de cada produto"
              icon={<LocalShippingOutlinedIcon fontSize="small" />}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="freight"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        size="small"
                        inputProps={{ step: '0.01', min: 0 }}
                        label="Frete (opcional)"
                        fullWidth
                        sx={FIELD_SX}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="reason"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        size="small"
                        label="Motivo (opcional)"
                        fullWidth
                        placeholder="Compra fornecedor X..."
                        sx={FIELD_SX}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection
              fill
              title="Materiais"
              subtitle="Preencha o formulário e adicione à lista ao lado"
              icon={<Inventory2OutlinedIcon fontSize="small" />}
              sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
                  <Paper
                    variant="outlined"
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      p: { xs: 1.5, sm: 2 },
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      overflow: 'hidden',
                      height: '100%',
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1.5, flexShrink: 0 }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {fields.length > 1
                          ? `Editando material ${formIndex + 1}`
                          : 'Adicionar material'}
                      </Typography>
                      {fields.length > 1 && (
                        <Tooltip title="Remover este material">
                          <IconButton
                            size="small"
                            aria-label="Remover material"
                            onClick={() => handleRemoveLine(formIndex)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>

                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        pt: 2.5,
                        pr: 0.5,
                        pb: 1.5,
                        scrollPaddingTop: 20,
                      }}
                    >
                      <Grid container spacing={2} sx={{ alignContent: 'flex-start' }}>
                        <Grid item xs={12} sm={4}>
                          <Controller
                            name={`lines.${formIndex}.mode`}
                            control={control}
                            render={({ field: modeField }) => (
                              <TextField
                                select
                                label="Tipo"
                                fullWidth
                                size="medium"
                                sx={MATERIAL_FIELD_SX}
                                InputLabelProps={MATERIAL_LABEL_PROPS}
                                value={modeField.value}
                                onChange={(e) => modeField.onChange(e.target.value as LineMode)}
                              >
                                <MenuItem value="existing">Item existente</MenuItem>
                                <MenuItem value="new">Cadastrar novo</MenuItem>
                              </TextField>
                            )}
                          />
                        </Grid>

                        {watchedLines[formIndex]?.mode === 'existing' ? (
                          <Grid item xs={12} sm={8}>
                            <Controller
                              name={`lines.${formIndex}.item`}
                              control={control}
                              rules={{ required: 'Selecione um item' }}
                              render={({ field: itemField, fieldState }) => (
                                <Autocomplete
                                  options={items}
                                  getOptionLabel={(o) =>
                                    o.sku ? `${o.name} (${o.sku})` : o.name
                                  }
                                  isOptionEqualToValue={(a, b) => a.id === b.id}
                                  value={itemField.value}
                                  onChange={(_, v) => itemField.onChange(v)}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Produto"
                                      size="medium"
                                      required
                                      sx={MATERIAL_FIELD_SX}
                                      InputLabelProps={MATERIAL_LABEL_PROPS}
                                      error={!!fieldState.error}
                                      helperText={fieldState.error?.message}
                                    />
                                  )}
                                />
                              )}
                            />
                          </Grid>
                        ) : (
                          <Grid item xs={12} sm={8}>
                            <Box
                              sx={{
                                height: '100%',
                                minHeight: 40,
                                display: 'flex',
                                alignItems: 'center',
                                px: 1.5,
                                py: 1,
                                borderRadius: 2,
                                border: '1px dashed',
                                borderColor: 'primary.light',
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <AddBoxOutlinedIcon fontSize="small" color="primary" />
                                <Typography variant="body2" color="text.secondary">
                                  Preencha o cadastro do item abaixo — será criado ao confirmar a compra
                                </Typography>
                              </Stack>
                            </Box>
                          </Grid>
                        )}

                        {watchedLines[formIndex]?.mode === 'new' && (
                          <Grid item xs={12}>
                            <Box
                              sx={{
                                p: { xs: 1.5, sm: 2 },
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'grey.50',
                                '& .MuiInputLabel-root': {
                                  backgroundColor: 'grey.50',
                                },
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                color="text.primary"
                                sx={{ display: 'block', mb: 2 }}
                              >
                                Cadastro do novo item
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Controller
                                    name={`lines.${formIndex}.newName`}
                                    control={control}
                                    rules={{ required: 'Nome obrigatório' }}
                                    render={({ field: f, fieldState }) => (
                                      <TextField
                                        {...f}
                                        label="Nome do produto"
                                        fullWidth
                                        size="medium"
                                        required
                                        sx={MATERIAL_FIELD_SX}
                                        InputLabelProps={MATERIAL_LABEL_PROPS}
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        placeholder="Ex.: Agulha descartável 30G"
                                      />
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Controller
                                    name={`lines.${formIndex}.newSku`}
                                    control={control}
                                    render={({ field: f }) => (
                                      <TextField
                                        {...f}
                                        label="SKU / Código"
                                        fullWidth
                                        size="medium"
                                        sx={MATERIAL_FIELD_SX}
                                        InputLabelProps={MATERIAL_LABEL_PROPS}
                                        placeholder="Opcional"
                                      />
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Controller
                                    name={`lines.${formIndex}.newUnit`}
                                    control={control}
                                    render={({ field: f }) => (
                                      <TextField
                                        {...f}
                                        select
                                        label="Unidade de medida"
                                        fullWidth
                                        size="medium"
                                        sx={MATERIAL_FIELD_SX}
                                        InputLabelProps={MATERIAL_LABEL_PROPS}
                                      >
                                        {unitOptions.map((u) => (
                                          <MenuItem key={u.value} value={u.value}>
                                            {u.label}
                                          </MenuItem>
                                        ))}
                                      </TextField>
                                    )}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Controller
                                    name={`lines.${formIndex}.newMinQuantity`}
                                    control={control}
                                    render={({ field: f }) => (
                                      <TextField
                                        {...f}
                                        type="number"
                                        label="Estoque mínimo"
                                        fullWidth
                                        size="medium"
                                        sx={MATERIAL_FIELD_SX}
                                        InputLabelProps={MATERIAL_LABEL_PROPS}
                                        inputProps={{ min: 0, step: '0.001' }}
                                      />
                                    )}
                                  />
                                </Grid>
                              </Grid>
                            </Box>
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <Divider sx={{ my: 1 }}>
                            <Chip
                              label="Entrada na compra"
                              size="small"
                              variant="outlined"
                              sx={{ bgcolor: 'background.paper', fontWeight: 600 }}
                            />
                          </Divider>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Controller
                            name={`lines.${formIndex}.quantity`}
                            control={control}
                            rules={{ required: true, min: 0.001 }}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                type="number"
                                label="Quantidade"
                                fullWidth
                                size="medium"
                                required
                                sx={MATERIAL_FIELD_SX}
                                InputLabelProps={MATERIAL_LABEL_PROPS}
                                inputProps={{ min: 0.001, step: '0.001' }}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name={`lines.${formIndex}.expiresAt`}
                            control={control}
                            rules={{ required: 'Validade obrigatória' }}
                            render={({ field: f, fieldState }) => (
                              <TextField
                                {...f}
                                type="date"
                                label="Validade do lote"
                                fullWidth
                                size="medium"
                                required
                                sx={MATERIAL_FIELD_SX}
                                InputLabelProps={MATERIAL_LABEL_PROPS}
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Controller
                            name={`lines.${formIndex}.productTotal`}
                            control={control}
                            rules={{
                              required: 'Valor obrigatório',
                              min: { value: 0.01, message: 'Mínimo R$ 0,01' },
                            }}
                            render={({ field: f, fieldState }) => (
                              <TextField
                                {...f}
                                type="number"
                                label="Valor do produto (sem frete)"
                                fullWidth
                                size="medium"
                                required
                                sx={MATERIAL_FIELD_SX}
                                InputLabelProps={MATERIAL_LABEL_PROPS}
                                inputProps={{ step: '0.01', min: 0.01 }}
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                }}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            key={`unit-cost-${formIndex}-${currentUnitCost}`}
                            label="Valor unitário"
                            type="text"
                            value={currentUnitCost > 0 ? brl.format(currentUnitCost) : ''}
                            placeholder="—"
                            fullWidth
                            size="medium"
                            InputLabelProps={MATERIAL_LABEL_PROPS}
                            inputProps={{ readOnly: true }}
                            helperText={
                              currentUnitCost > 0 && currentLineTotals
                                ? `Total da linha: ${brl.format(currentLineTotals.total)}${
                                    currentLineTotals.freightShare > 0
                                      ? ` (frete ${brl.format(currentLineTotals.freightShare)})`
                                      : ''
                                  }`
                                : 'Preencha quantidade e valor do produto'
                            }
                            sx={{
                              ...MATERIAL_FIELD_SX,
                              '& .MuiOutlinedInput-root': {
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                              },
                              '& .MuiInputBase-input': {
                                color: 'primary.main',
                                fontWeight: 600,
                                WebkitTextFillColor: (t) => t.palette.primary.main,
                              },
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    <Box
                      sx={{
                        flexShrink: 0,
                        pt: 1.5,
                        mt: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Button
                        type="button"
                        variant="contained"
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={handleAddLine}
                      >
                        Adicionar à lista
                      </Button>
                    </Box>
                  </Paper>
            </FormSection>
              </Stack>
            </Box>

            <Box
              sx={{
                flex: { xs: '0 0 auto', lg: '0 0 40%' },
                maxWidth: { lg: '40%' },
                width: { xs: '100%', lg: '40%' },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
                  <Paper
                    variant="outlined"
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      height: { xs: 280, lg: '100%' },
                      display: 'flex',
                      flexDirection: 'column',
                      p: 1.5,
                      borderColor: 'divider',
                      bgcolor: 'grey.50',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>
                      Itens na compra
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.75, fontWeight: 400 }}
                      >
                        ({fields.length})
                      </Typography>
                    </Typography>

                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.25 }}>
                      {fields.map((field, i) => {
                        const line = watchedLines[i];
                        if (!line) return null;
                        const totals = lineTotals[i];
                        const label = getLineLabel(line);
                        const filled = isLineFilled(line, totals?.unitCost ?? 0);
                        const selected = i === formIndex;
                        const unit =
                          line.mode === 'existing'
                            ? line.item?.unit
                            : line.newUnit;

                        return (
                          <Box
                            key={field.id}
                            component="button"
                            type="button"
                            onClick={() => setActiveLineIndex(i)}
                            sx={{
                              display: 'block',
                              width: '100%',
                              mb: 1,
                              p: 1.25,
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: selected ? 'primary.main' : 'divider',
                              bgcolor: selected
                                ? alpha(theme.palette.primary.main, 0.08)
                                : 'background.paper',
                              boxShadow: selected ? 1 : 0,
                              transition: 'border-color 0.15s, background-color 0.15s',
                              '&:hover': {
                                borderColor: selected ? 'primary.main' : 'text.disabled',
                                bgcolor: selected
                                  ? alpha(theme.palette.primary.main, 0.1)
                                  : 'background.paper',
                              },
                            }}
                          >
                            <Stack direction="row" spacing={0.75} alignItems="flex-start">
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                  sx={{ mb: 0.25 }}
                                >
                                  <Typography variant="body2" fontWeight={600} noWrap>
                                    {i + 1}. {label}
                                  </Typography>
                                  {!filled && (
                                    <Chip
                                      label="Incompleto"
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.65rem' }}
                                    />
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {Number(line.quantity) > 0 ? (
                                    <>
                                      {line.quantity}
                                      {unit ? ` ${unit}` : ' un'}
                                    </>
                                  ) : (
                                    'Qtd —'
                                  )}
                                  {' · '}
                                  {totals?.unitCost > 0
                                    ? `${brl.format(totals.unitCost)}/un`
                                    : 'Unit. —'}
                                  {' · Val. '}
                                  {formatDateOnlyFromApi(line.expiresAt) || '—'}
                                </Typography>
                                {totals?.total > 0 && (
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    color="primary.main"
                                    display="block"
                                    sx={{ mt: 0.25 }}
                                  >
                                    Linha: {brl.format(totals.total)}
                                  </Typography>
                                )}
                              </Box>
                              {fields.length > 1 && (
                                <Tooltip title="Remover da lista">
                                  <IconButton
                                    size="small"
                                    aria-label="Remover"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveLine(i);
                                    }}
                                    sx={{ mt: -0.25 }}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ pt: 1, flexShrink: 0, display: 'block', borderTop: 1, borderColor: 'divider' }}
                    >
                      Clique em um item para editar. Use o botão à esquerda para incluir outro.
                    </Typography>
                  </Paper>
            </Box>
          </Box>

          {mutation.isError && (
            <Alert severity="error" sx={{ mt: 2, flexShrink: 0 }}>
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao registrar compra em lote'}
            </Alert>
          )}
        </DialogContent>

        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 2 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Produtos: <strong>{brl.format(productsTotal)}</strong>
            {freight > 0 && (
              <>
                {' '}
                · Frete: <strong>{brl.format(freight)}</strong>
              </>
            )}
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ ml: { sm: 'auto' } }}>
            Total: {brl.format(grandTotal)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
            Uma despesa será lançada no financeiro ao confirmar.
          </Typography>
        </Box>

        <DialogActions
          sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            gap: 1,
          }}
        >
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? 'Salvando...' : 'Confirmar compra'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

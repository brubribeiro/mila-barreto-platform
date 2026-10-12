import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { inventoryApi } from '../../api/inventory';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { dateOnlyToApiIso } from '../../utils/dateOnly';
import type { InventoryItem } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

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
  /** Valor unitário do produto (sem frete) */
  unitPrice: number | '';
  expiresAt: string;
}

interface FormValues {
  reason: string;
  freight: number | '';
  lines: LineForm[];
}

const DIALOG_MAX_WIDTH = 1180;
const DIALOG_HEIGHT_DESKTOP = 820;
const LINE_COLUMNS = '2.3fr 1.15fr .8fr .6fr .75fr .95fr .85fr .95fr 30px';

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

const emptyLine = (mode: LineMode = 'existing'): LineForm => ({
  mode,
  item: null,
  newName: '',
  newSku: '',
  newUnit: 'un',
  newMinQuantity: 0,
  quantity: 1,
  unitPrice: '',
  expiresAt: '',
});

const defaultValues: FormValues = {
  reason: '',
  freight: '',
  lines: [emptyLine()],
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const LABEL_SX = { fontSize: fontSizes.sm, fontWeight: 700, mb: 0.9 } as const;

const CELL_TEXT_SX = {
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  fontSize: fontSizes.xs,
  color: 'text.secondary',
  fontWeight: 600,
  minWidth: 0,
} as const;

const CELL_INPUT_SX = {
  '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', fontSize: fontSizes.xs },
  '& input': { px: 1 },
} as const;

function parseNum(v: unknown): number {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Mesmo rateio do backend: proporcional ao valor de cada produto, sobra de centavos no último. */
function allocateFreight(lines: { productTotal: number }[], freight: number): number[] {
  const sum = lines.reduce((s, l) => s + l.productTotal, 0);
  if (sum <= 0 || freight <= 0) return lines.map(() => 0);
  const shares = lines.map((l) => Math.round(freight * (l.productTotal / sum) * 100) / 100);
  const allocated = shares.reduce((s, v) => s + v, 0);
  const diff = Math.round((freight - allocated) * 100) / 100;
  if (diff !== 0 && shares.length > 0) {
    shares[shares.length - 1] = Math.round((shares[shares.length - 1] + diff) * 100) / 100;
  }
  return shares;
}

function lineProductTotal(line: Pick<LineForm, 'quantity' | 'unitPrice'>) {
  return Math.round(parseNum(line.quantity) * parseNum(line.unitPrice) * 100) / 100;
}

export function BulkPurchaseDialog({ open, onClose }: BulkPurchaseDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
  }, [open, reset]);

  const watchedLines = (useWatch({ control, name: 'lines' }) ?? defaultValues.lines) as LineForm[];
  const watchedFreight = useWatch({ control, name: 'freight' });
  const freight = parseNum(watchedFreight);

  const lineTotals = useMemo(() => {
    const parsed = watchedLines.map((l) => ({
      productTotal: lineProductTotal(l),
      quantity: parseNum(l.quantity),
    }));
    const freightShares = allocateFreight(parsed, freight);
    return parsed.map((l, i) => {
      const freightShare = freightShares[i] ?? 0;
      const total = Math.round((l.productTotal + freightShare) * 100) / 100;
      const unitCost = l.quantity > 0 ? Math.round((total / l.quantity) * 100) / 100 : 0;
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
          productTotal: lineProductTotal(line),
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
      toast.success('Compra registrada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar a compra.'));
    },
  });

  const canSubmit =
    productsTotal > 0 &&
    watchedLines.every((l, i) => {
      const qty = parseNum(l.quantity) > 0;
      const price = lineTotals[i].productTotal > 0;
      const itemOk = l.mode === 'existing' ? !!l.item : l.newName.trim().length > 0;
      return qty && price && itemOk && !!l.expiresAt && lineTotals[i].unitCost > 0;
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
          overflow: 'hidden',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { maxWidth: DIALOG_MAX_WIDTH, height: DIALOG_HEIGHT_DESKTOP, maxHeight: '96dvh' }),
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
        />

        <DialogContent
          dividers
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack spacing={2.25}>
            <Box>
              <Typography sx={LABEL_SX}>Descrição da compra</Typography>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="Opcional — ex.: fornecedor, nº da nota fiscal"
                    inputProps={{ 'aria-label': 'Descrição da compra' }}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'grey.50' } }}
                  />
                )}
              />
            </Box>

            <Box>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1.25 }}
              >
                <Typography
                  sx={{ fontSize: fontSizes.sm, fontWeight: 800, color: 'text.disabled', letterSpacing: '0.6px' }}
                >
                  ITENS DA COMPRA · {fields.length}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PostAddOutlinedIcon />}
                    onClick={() => append(emptyLine('new'))}
                    sx={{ height: 34, borderRadius: '10px', borderColor: 'divider', color: 'text.primary', fontSize: fontSizes.xs }}
                  >
                    Cadastrar produto
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => append(emptyLine())}
                    sx={{
                      height: 34,
                      borderRadius: '10px',
                      fontSize: fontSizes.xs,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    }}
                  >
                    Adicionar linha
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '14px', overflowX: 'auto' }}>
                <Box sx={{ minWidth: 980 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: LINE_COLUMNS,
                      gap: 0.9,
                      px: 1.5,
                      py: 1.25,
                      bgcolor: 'grey.50',
                      borderBottom: 1,
                      borderColor: 'divider',
                      fontSize: fontSizes['3xs'],
                      fontWeight: 700,
                      color: 'text.disabled',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      alignItems: 'center',
                    }}
                  >
                    <span>Produto</span>
                    <span>Validade do lote</span>
                    <span>Unidade</span>
                    <Box component="span" sx={{ textAlign: 'center' }}>Qtd</Box>
                    <Box component="span" sx={{ textAlign: 'center' }}>Est. mín</Box>
                    <Box component="span" sx={{ textAlign: 'right' }}>Valor un.</Box>
                    <Box component="span" sx={{ textAlign: 'right' }}>Frete rat.</Box>
                    <Box component="span" sx={{ textAlign: 'right' }}>Custo final</Box>
                    <span />
                  </Box>

                  {fields.map((f, index) => {
                    const line = watchedLines[index] ?? f;
                    // useWatch lags one render behind append(); the new row has no totals yet
                    const totals = lineTotals[index] ?? { freightShare: 0, unitCost: 0 };
                    const isNew = line.mode === 'new';
                    return (
                      <Box
                        key={f.id}
                        sx={{
                          px: 1.5,
                          py: 1.1,
                          borderBottom: index < fields.length - 1 ? 1 : 0,
                          borderColor: 'grey.100',
                          bgcolor: isNew ? (t) => alpha(t.palette.primary.main, 0.03) : undefined,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: LINE_COLUMNS,
                            gap: 0.9,
                            alignItems: 'center',
                          }}
                        >
                          {/* Produto */}
                          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                            {isNew ? (
                              <Controller
                                name={`lines.${index}.newName`}
                                control={control}
                                rules={{ validate: (v) => v.trim().length > 0 }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    size="small"
                                    fullWidth
                                    placeholder="Nome do novo produto"
                                    inputProps={{ 'aria-label': 'Nome do novo produto' }}
                                    sx={CELL_INPUT_SX}
                                  />
                                )}
                              />
                            ) : (
                              <Controller
                                name={`lines.${index}.item`}
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                  <Autocomplete
                                    options={items}
                                    size="small"
                                    fullWidth
                                    getOptionLabel={(o) => (o.sku ? `${o.name} (${o.sku})` : o.name)}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    value={field.value}
                                    onChange={(_, v) => field.onChange(v)}
                                    noOptionsText="Nenhum produto"
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        placeholder="Selecione o produto"
                                        inputProps={{ ...params.inputProps, 'aria-label': 'Produto' }}
                                        sx={CELL_INPUT_SX}
                                      />
                                    )}
                                  />
                                )}
                              />
                            )}
                            {isNew && (
                              <Box
                                component="span"
                                sx={{
                                  flexShrink: 0,
                                  px: 0.9,
                                  py: 0.25,
                                  borderRadius: '6px',
                                  fontSize: fontSizes['3xs'],
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  color: 'primary.dark',
                                  bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                }}
                              >
                                novo
                              </Box>
                            )}
                          </Stack>

                          {/* Validade */}
                          <Controller
                            name={`lines.${index}.expiresAt`}
                            control={control}
                            rules={{ required: true }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="date"
                                size="small"
                                fullWidth
                                inputProps={{ 'aria-label': 'Validade do lote' }}
                                sx={CELL_INPUT_SX}
                              />
                            )}
                          />

                          {/* Unidade */}
                          {isNew ? (
                            <Controller
                              name={`lines.${index}.newUnit`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  size="small"
                                  fullWidth
                                  inputProps={{ 'aria-label': 'Unidade' }}
                                  SelectProps={{ renderValue: (v) => String(v || '—') }}
                                  sx={CELL_INPUT_SX}
                                >
                                  {unitOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            />
                          ) : (
                            <Box sx={CELL_TEXT_SX}>{line.item?.unit || '—'}</Box>
                          )}

                          {/* Quantidade */}
                          <Controller
                            name={`lines.${index}.quantity`}
                            control={control}
                            rules={{ required: true, min: 0.001 }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                size="small"
                                inputProps={{ min: 0.001, step: 'any', 'aria-label': 'Quantidade', style: { textAlign: 'center' } }}
                                sx={CELL_INPUT_SX}
                              />
                            )}
                          />

                          {/* Estoque mínimo */}
                          {isNew ? (
                            <Controller
                              name={`lines.${index}.newMinQuantity`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  inputProps={{ min: 0, step: 1, 'aria-label': 'Estoque mínimo', style: { textAlign: 'center' } }}
                                  sx={CELL_INPUT_SX}
                                />
                              )}
                            />
                          ) : (
                            <Box sx={{ ...CELL_TEXT_SX, justifyContent: 'center' }}>
                              {line.item ? Number(line.item.minQuantity) : '—'}
                            </Box>
                          )}

                          {/* Valor unitário */}
                          <Controller
                            name={`lines.${index}.unitPrice`}
                            control={control}
                            rules={{ required: true, min: 0.01 }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                size="small"
                                placeholder="0,00"
                                inputProps={{ min: 0, step: '0.01', 'aria-label': 'Valor unitário', style: { textAlign: 'right' } }}
                                sx={CELL_INPUT_SX}
                              />
                            )}
                          />

                          <Box sx={{ ...CELL_TEXT_SX, justifyContent: 'flex-end' }}>
                            {totals.freightShare > 0 ? brl.format(totals.freightShare) : '—'}
                          </Box>
                          <Box
                            sx={{ ...CELL_TEXT_SX, justifyContent: 'flex-end', fontSize: fontSizes.sm, fontWeight: 800, color: 'primary.main' }}
                            title="Custo unitário com frete"
                          >
                            {totals.unitCost > 0 ? brl.format(totals.unitCost) : '—'}
                          </Box>

                          <Tooltip title={fields.length <= 1 ? 'A compra precisa de ao menos um item' : 'Remover linha'}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Remover linha"
                                disabled={fields.length <= 1}
                                onClick={() => remove(index)}
                                sx={{
                                  width: 28,
                                  height: 32,
                                  borderRadius: '8px',
                                  color: 'text.disabled',
                                  '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.14), color: 'error.main' },
                                }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>

                        {isNew && (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.9, maxWidth: 420 }}>
                            <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 600, flexShrink: 0 }}>
                              SKU / Código
                            </Typography>
                            <Controller
                              name={`lines.${index}.newSku`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  fullWidth
                                  placeholder="Opcional"
                                  inputProps={{ 'aria-label': 'SKU do novo produto' }}
                                  sx={CELL_INPUT_SX}
                                />
                              )}
                            />
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  mt: 1.25,
                  px: 1.75,
                  py: 1.4,
                  bgcolor: 'grey.50',
                  border: 1,
                  borderColor: 'grey.100',
                  borderRadius: '11px',
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', lineHeight: 1.4 }}>
                  Selecione um produto cadastrado em cada linha — a compra gera uma{' '}
                  <Box component="b" sx={{ color: 'success.main' }}>movimentação de entrada</Box> no item. Para um
                  produto que ainda não existe, use{' '}
                  <Box component="b" sx={{ color: 'text.primary' }}>Cadastrar produto</Box>: ele é criado ao
                  confirmar a compra.
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Box>
                <Typography sx={LABEL_SX}>Frete da compra</Typography>
                <Controller
                  name="freight"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      fullWidth
                      placeholder="0,00"
                      inputProps={{ min: 0, step: '0.01', 'aria-label': 'Frete da compra' }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'grey.50', fontWeight: 700 } }}
                    />
                  )}
                />
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', mt: 0.75 }}>
                  Opcional. Diluído proporcionalmente ao valor de cada item.
                </Typography>
              </Box>

              <Stack
                spacing={1.4}
                sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: '14px', px: 2.25, py: 2 }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    Subtotal produtos
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>{brl.format(productsTotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    Frete (rateado)
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>{brl.format(freight)}</Typography>
                </Stack>
                <Box sx={{ height: '1px', bgcolor: 'divider' }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>Total da compra</Typography>
                  <Typography
                    sx={{ fontSize: fontSizes['2xl'], fontWeight: 800, color: 'primary.main', letterSpacing: '-0.4px' }}
                  >
                    {brl.format(grandTotal)}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary' }}>
                  Uma despesa será lançada no financeiro ao confirmar.
                </Typography>
              </Stack>
            </Box>

            {mutation.isError && (
              <Alert severity="error" variant="outlined">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'Erro ao registrar compra em lote'}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? 'Salvando…' : 'Confirmar compra'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

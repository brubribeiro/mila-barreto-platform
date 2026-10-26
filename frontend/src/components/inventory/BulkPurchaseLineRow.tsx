import { Autocomplete, Box, IconButton, MenuItem, Stack, TextField, Tooltip, Typography, alpha } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Controller, type Control } from 'react-hook-form';
import type { InventoryItem } from '../../types';
import { MoneyField } from '../MoneyField';
import { fontSizes } from '../../theme/fontSizes';
import type { BulkPurchaseFormValues, LineForm } from './bulkPurchase';
import { usePlatformCatalog } from '../../hooks/usePlatformCatalog';

export const BULK_LINE_COLUMNS = '2.3fr 1.15fr .8fr .6fr .75fr .95fr .85fr .95fr 30px';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

interface BulkPurchaseLineRowProps {
  control: Control<BulkPurchaseFormValues>;
  index: number;
  line: LineForm;
  totals: { freightShare: number; unitCost: number };
  items: InventoryItem[];
  isLast: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

/** Linha da compra em lote: produto existente (busca) ou novo (nome, unidade, mínimo e SKU). */
export function BulkPurchaseLineRow({
  control,
  index,
  line,
  totals,
  items,
  isLast,
  canRemove,
  onRemove,
}: BulkPurchaseLineRowProps) {
  const isNew = line.mode === 'new';
  const unitOptions = usePlatformCatalog('inventory_unit');
  return (
      <Box
        sx={{
          px: 1.5,
          py: 1.1,
          borderBottom: isLast ? 0 : 1,
          borderColor: 'grey.100',
          bgcolor: isNew ? (t) => alpha(t.palette.primary.main, 0.03) : undefined,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: BULK_LINE_COLUMNS,
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
            rules={{
              required: 'Informe a quantidade',
              min: { value: 0.001, message: 'Informe uma quantidade maior que zero' },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                size="small"
                error={!!fieldState.error}
                inputProps={{ inputMode: 'decimal', min: 0.001, step: 'any', 'aria-label': 'Quantidade', style: { textAlign: 'center' } }}
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
                  inputProps={{ inputMode: 'numeric', min: 0, step: 1, 'aria-label': 'Estoque mínimo', style: { textAlign: 'center' } }}
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
            rules={{
              required: 'Informe o valor unitário',
              min: { value: 0.01, message: 'Informe um valor maior que zero' },
            }}
            render={({ field, fieldState }) => (
              <MoneyField
                {...field}
                size="small"
                error={!!fieldState.error}
                InputProps={{ startAdornment: null }}
                inputProps={{ 'aria-label': 'Valor unitário', style: { textAlign: 'right' } }}
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

          <Tooltip title={canRemove ? 'Remover linha' : 'A compra precisa de ao menos um item'}>
            <span>
              <IconButton
                size="small"
                aria-label="Remover linha"
                disabled={!canRemove}
                onClick={onRemove}
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
}

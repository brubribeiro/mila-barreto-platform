import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputBase,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { paymentMethodsApi } from '../api/paymentMethods';
import { PaymentMethodFormDialog } from '../components/payment-methods/PaymentMethodFormDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import type { PaymentMethodEntry } from '../types';
import { fontSizes } from '../theme/fontSizes';
import { brl } from '../utils/money';

const ICON_COLORS = ['#15998B', '#E0915B', '#5BA8DE', '#D46B8A', '#9B7BD4', '#4FB3A8'];
const CARD_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))',
  gap: 2.25,
} as const;
const EXAMPLE_AMOUNT = 100;

const TOOLBAR_SELECT_SX = {
  flexShrink: 0,
  width: { xs: 'calc(50% - 5px)', sm: 'auto' },
  minWidth: { sm: 150 },
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    fontSize: fontSizes.sm,
    bgcolor: 'background.paper',
  },
} as const;

const ACTION_BUTTON_SX = {
  width: 30,
  height: 30,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  color: 'text.secondary',
} as const;


function colorFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function formatFee(fee: number) {
  return `${fee.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function usageLabel(count: number) {
  if (count === 0) return 'Ainda sem lançamentos';
  return `Usada em ${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`;
}

export function PaymentMethods() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const { has } = usePermissions();
  const canCreate = has('payment-methods:create');
  const canEdit = has('payment-methods:edit');
  const canDelete = has('payment-methods:delete');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodEntry | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Forma de pagamento excluída.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir a forma de pagamento.'));
    },
  });

  const filteredMethods = useMemo(
    () =>
      methods.filter(
        (m) =>
          matchesActiveFilter(m.active, activeFilter) && matchFields(search, m.name),
      ),
    [methods, search, activeFilter],
  );

  const activeCount = methods.filter((m) => m.active).length;

  const handleEdit = (m: PaymentMethodEntry) => {
    setEditing(m);
    setFormOpen(true);
  };

  const handleDelete = async (m: PaymentMethodEntry) => {
    const ok = await confirm({
      title: 'Excluir forma de pagamento',
      message: `Excluir a forma de pagamento "${m.name}"?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(m.id);
  };

  return (
    <Stack spacing={2.25}>
      {/* Resumo + filtros + ações */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: 'text.secondary' }}>
          Taxas configuradas por método e maquininha
          {!isLoading && methods.length > 0 && (
            <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>
              {` · ${activeCount} de ${methods.length} ${methods.length === 1 ? 'ativa' : 'ativas'}`}
            </Box>
          )}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap={{ xs: 'wrap', md: 'nowrap' }}
          useFlexGap
          justifyContent={{ md: 'flex-end' }}
          sx={{ minWidth: 0 }}
        >
          <TextField
            select
            size="small"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            sx={TOOLBAR_SELECT_SX}
            inputProps={{ 'aria-label': 'Status' }}
          >
            <MenuItem value="ALL">Todos os status</MenuItem>
            <MenuItem value="ACTIVE">Ativas</MenuItem>
            <MenuItem value="INACTIVE">Inativas</MenuItem>
          </TextField>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              height: 38,
              px: 1.75,
              borderRadius: '12px',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              width: { xs: '100%', sm: 210 },
              minWidth: 0,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar método..."
              sx={{ fontSize: fontSizes.sm, flex: 1 }}
            />
          </Stack>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Adicionar método
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Lista de cards */}
      {isLoading ? (
        <Box sx={CARD_GRID_SX}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={156} sx={{ borderRadius: '18px' }} />
          ))}
        </Box>
      ) : filteredMethods.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: '18px' }}>
          <CreditCardOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>
            {methods.length === 0
              ? 'Nenhuma forma de pagamento cadastrada'
              : 'Nenhuma forma de pagamento encontrada'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
            {methods.length === 0
              ? 'Cadastre Pix, dinheiro e cartões com a taxa cobrada pela maquininha.'
              : 'Tente ajustar a busca ou os filtros.'}
          </Typography>
        </Card>
      ) : (
        <Box sx={CARD_GRID_SX}>
          {filteredMethods.map((m) => {
            const color = colorFor(m.name);
            const fee = Number(m.feePercent);
            const usage = m._count?.financialEntries ?? 0;
            return (
              <Card
                key={m.id}
                onClick={canEdit ? () => handleEdit(m) : undefined}
                sx={{
                  p: 2.5,
                  borderRadius: '18px',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
                  opacity: m.active ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.75,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'box-shadow .15s, border-color .15s',
                  '&:hover': { boxShadow: '0 12px 30px -20px rgba(16,40,37,0.45)', borderColor: alpha(color, 0.5) },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(color, 0.1),
                      color,
                      fontWeight: 800,
                      fontSize: fontSizes.lg,
                    }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                      <Typography
                        title={m.name}
                        sx={{
                          fontSize: fontSizes.lg,
                          fontWeight: 800,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {m.name}
                      </Typography>
                      {!m.active && (
                        <Chip
                          size="small"
                          label="Inativa"
                          sx={{ height: 20, fontSize: fontSizes['2xs'], fontWeight: 700, flexShrink: 0 }}
                        />
                      )}
                    </Stack>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.disabled' }}>
                      {usageLabel(usage)}
                    </Typography>
                  </Box>
                  {(canEdit || canDelete) && (
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                      {canEdit && (
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleEdit(m);
                            }}
                            sx={ACTION_BUTTON_SX}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Excluir">
                          <IconButton
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDelete(m);
                            }}
                            sx={{ ...ACTION_BUTTON_SX, '&:hover': { color: 'error.main', borderColor: 'error.light' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </Stack>

                <Stack
                  direction="row"
                  alignItems="flex-end"
                  justifyContent="space-between"
                  sx={{ pt: 1.6, borderTop: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ lineHeight: 1 }}>
                    <Typography
                      sx={{
                        fontSize: fontSizes['5xl'],
                        fontWeight: 800,
                        letterSpacing: '-0.5px',
                        lineHeight: 1,
                        color: fee === 0 ? 'success.main' : 'text.primary',
                      }}
                    >
                      {formatFee(fee)}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600, mt: 0.6 }}>
                      taxa
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', lineHeight: 1.2 }}>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                      {brl.format(EXAMPLE_AMOUNT * (1 - fee / 100))}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }}>
                      líquido a cada {brl.format(EXAMPLE_AMOUNT)}
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            );
          })}
        </Box>
      )}

      <PaymentMethodFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </Stack>
  );
}

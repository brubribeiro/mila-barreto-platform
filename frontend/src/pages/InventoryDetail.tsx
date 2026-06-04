import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../utils/dateOnly';

import { PageHeader } from '../components/PageHeader';
import { inventoryApi, InventoryMovement } from '../api/inventory';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { MovementDialog } from '../components/inventory/MovementDialog';
import { usePermissions } from '../contexts/usePermissions';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const movementTypeLabel: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
};

const movementTypeColor: Record<string, 'success' | 'error' | 'info'> = {
  IN: 'success',
  OUT: 'error',
  ADJUSTMENT: 'info',
};

interface Batch {
  expiresAt: string;
  totalIn: number;
  totalOut: number;
  remaining: number;
  movements: InventoryMovement[];
}

function buildBatches(movements: InventoryMovement[]): Batch[] {
  const map = new Map<string, { totalIn: number; totalOut: number; movements: InventoryMovement[] }>();

  // Agrupa entradas por data de validade
  for (const m of movements) {
    if (m.type === 'IN' && m.expiresAt) {
      const key = m.expiresAt.substring(0, 10);
      const existing = map.get(key) ?? { totalIn: 0, totalOut: 0, movements: [] };
      existing.totalIn += Number(m.quantity);
      existing.movements.push(m);
      map.set(key, existing);
    }
  }

  return Array.from(map.entries())
    .map(([expiresAt, data]) => ({
      expiresAt,
      totalIn: data.totalIn,
      totalOut: data.totalOut,
      remaining: data.totalIn - data.totalOut,
      movements: data.movements,
    }))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

function ExpiryChip({ date }: { date: string }) {
  const d = dayjsFromDateOnlyApi(date) ?? dayjs(date);
  const days = d.diff(dayjs(), 'day');
  const expired = days < 0;
  const soon = days >= 0 && days <= 30;
  return (
    <Chip
      size="small"
      variant="outlined"
      label={formatDateOnlyFromApi(date)}
      color={expired ? 'error' : soon ? 'warning' : 'default'}
    />
  );
}

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canManage = has('inventory:edit');

  const [formOpen, setFormOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryApi.findOne(id!),
    enabled: !!id,
  });

  const batches = useMemo(
    () => (item?.movements ? buildBatches(item.movements) : []),
    [item?.movements],
  );

  const lowStock = item ? Number(item.quantity) <= Number(item.minQuantity) : false;

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Carregando...</Typography>
      </Box>
    );
  }

  if (isError || !item) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Item não encontrado.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/estoque')}>Voltar ao estoque</Button>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={item.name}
        subtitle={item.description || 'Detalhes do item de estoque'}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/estoque')}
            >
              Voltar
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SwapHorizIcon />}
                  onClick={() => setMovementOpen(true)}
                >
                  Movimentar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setFormOpen(true)}
                >
                  Editar
                </Button>
              </>
            )}
          </Stack>
        }
      />

      {/* ── Dados gerais ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Informações do item
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">SKU</Typography>
              <Typography variant="body2">{item.sku || '—'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Unidade</Typography>
              <Typography variant="body2">{item.unit || '—'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Custo unitário</Typography>
              <Typography variant="body2">
                {item.costPrice ? brl.format(Number(item.costPrice)) : '—'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Validade (item)</Typography>
              <Typography variant="body2">
                {item.expiresAt ? <ExpiryChip date={item.expiresAt} /> : '—'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Estoque atual</Typography>
                  <Typography variant="body2" fontWeight={lowStock ? 600 : 400} color={lowStock ? 'warning.main' : 'inherit'}>
                    {item.quantity} {item.unit ?? ''}
                  </Typography>
                </Box>
                {lowStock && (
                  <Tooltip title={`Abaixo do mínimo (${item.minQuantity})`}>
                    <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  </Tooltip>
                )}
              </Stack>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Estoque mínimo</Typography>
              <Typography variant="body2">{item.minQuantity} {item.unit ?? ''}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Notificar antes da validade</Typography>
              <Typography variant="body2">
                {item.expiryNotifyDaysBefore != null ? `${item.expiryNotifyDaysBefore} dias` : '—'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Lotes (entradas agrupadas por validade) ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Lotes cadastrados
          </Typography>
          {batches.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Nenhuma entrada com data de validade registrada.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Validade</TableCell>
                    <TableCell align="right">Qtd. entrada</TableCell>
                    <TableCell align="right">Entradas</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((b) => {
                    const bd = dayjsFromDateOnlyApi(b.expiresAt) ?? dayjs(b.expiresAt);
                    const expired = bd.isBefore(dayjs(), 'day');
                    const soon = !expired && bd.diff(dayjs(), 'day') <= 30;
                    return (
                      <TableRow key={b.expiresAt}>
                        <TableCell>
                          <ExpiryChip date={b.expiresAt} />
                        </TableCell>
                        <TableCell align="right">
                          {b.totalIn} {item.unit ?? ''}
                        </TableCell>
                        <TableCell align="right">
                          {b.movements.length} movimentação{b.movements.length !== 1 ? 'ões' : ''}
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Chip size="small" color="error" label="Vencido" />
                          ) : soon ? (
                            <Chip size="small" color="warning" label="Vence em breve" />
                          ) : (
                            <Chip size="small" color="success" label="Válido" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Histórico completo de movimentações ── */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Histórico de movimentações
          </Typography>
          {item.movements.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Nenhuma movimentação registrada.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell>Validade do lote</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {dayjs(m.createdAt).format('DD/MM/YYYY HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={movementTypeLabel[m.type] ?? m.type}
                          color={movementTypeColor[m.type] ?? 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : ''}
                        {m.quantity} {item.unit ?? ''}
                      </TableCell>
                      <TableCell>
                        {m.expiresAt ? <ExpiryChip date={m.expiresAt} /> : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {m.reason || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <InventoryFormDialog open={formOpen} onClose={() => { setFormOpen(false); queryClient.invalidateQueries({ queryKey: ['inventory', id] }); }} item={item} />
      <MovementDialog
        open={movementOpen}
        onClose={() => {
          setMovementOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory', id] });
        }}
        item={item}
      />
    </Box>
  );
}

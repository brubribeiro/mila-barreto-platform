import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, Skeleton, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { inventoryApi } from '../api/inventory';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { MovementDialog } from '../components/inventory/MovementDialog';
import {
  InventoryDetailBody,
  InventoryDetailHero,
} from '../components/inventory/InventoryDetailParts';
import { usePermissions } from '../contexts/usePermissions';

const OUTLINED_BUTTON_SX = {
  height: 38,
  borderRadius: '11px',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
} as const;

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

  const backButton = (
    <Button
      variant="outlined"
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate('/estoque')}
      sx={OUTLINED_BUTTON_SX}
    >
      Voltar ao estoque
    </Button>
  );

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={38} width={170} sx={{ mb: 2.25, borderRadius: '11px' }} />
        <Skeleton variant="rounded" height={480} sx={{ borderRadius: '18px' }} />
      </Box>
    );
  }

  if (isError || !item) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>Item não encontrado.</Alert>
        {backButton}
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
        spacing={1.25}
        sx={{ mb: 2.25 }}
      >
        {backButton}
        {canManage && (
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setFormOpen(true)}
              sx={OUTLINED_BUTTON_SX}
            >
              Editar
            </Button>
            <Button
              variant="contained"
              startIcon={<SwapVertIcon />}
              onClick={() => setMovementOpen(true)}
              sx={{ height: 38, borderRadius: '11px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Movimentar
            </Button>
          </Stack>
        )}
      </Stack>

      <Card sx={{ borderRadius: '18px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <InventoryDetailHero item={item} />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.75 }}>
          <InventoryDetailBody
            item={item}
            onNewMovement={canManage ? () => setMovementOpen(true) : undefined}
          />
        </Box>
      </Card>

      <InventoryFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory', id] });
        }}
        item={item}
      />
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

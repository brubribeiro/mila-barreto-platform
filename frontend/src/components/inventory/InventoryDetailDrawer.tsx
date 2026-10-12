import { Alert, Box, Button, CircularProgress, Drawer, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useQuery } from '@tanstack/react-query';

import { inventoryApi } from '../../api/inventory';
import type { InventoryItem } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { InventoryDetailBody, InventoryDetailHero } from './InventoryDetailParts';

const HEADER_BUTTON_SX = {
  width: 36,
  height: 36,
  borderRadius: '10px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
  '&:hover': { bgcolor: 'grey.50' },
} as const;

interface InventoryDetailDrawerProps {
  itemId: string | null;
  onClose: () => void;
  onMovement: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onOpenPage: (id: string) => void;
}

export function InventoryDetailDrawer({
  itemId,
  onClose,
  onMovement,
  onEdit,
  onDelete,
  onOpenPage,
}: InventoryDetailDrawerProps) {
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['inventory', itemId],
    queryFn: () => inventoryApi.findOne(itemId!),
    enabled: !!itemId,
  });

  const closeButton = (
    <Tooltip title="Fechar">
      <IconButton onClick={onClose} aria-label="Fechar detalhes" sx={HEADER_BUTTON_SX}>
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );

  return (
    <Drawer
      anchor="right"
      open={!!itemId}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: 1,
          borderColor: 'divider',
        },
      }}
    >
      {isLoading || (!item && !isError) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : isError || !item ? (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>{closeButton}</Box>
          <Alert severity="error">Item não encontrado.</Alert>
        </Box>
      ) : (
        <>
          <InventoryDetailHero
            item={item}
            action={
              <>
                <Tooltip title="Abrir página do item">
                  <IconButton onClick={() => onOpenPage(item.id)} aria-label="Abrir página do item" sx={HEADER_BUTTON_SX}>
                    <OpenInNewIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                {closeButton}
              </>
            }
          />

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.75 }}>
            <InventoryDetailBody item={item} onNewMovement={() => onMovement(item)} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 1.25,
              px: 3,
              py: 2.25,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <Button
              variant="contained"
              startIcon={<SwapVertIcon />}
              onClick={() => onMovement(item)}
              sx={{
                flex: 1,
                height: 44,
                borderRadius: '12px',
                fontSize: fontSizes.md,
                boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}`,
              }}
            >
              Movimentar
            </Button>
            {onEdit && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => onEdit(item)}
                sx={{
                  height: 44,
                  px: 2,
                  borderRadius: '12px',
                  fontSize: fontSizes.md,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                }}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Tooltip title="Excluir item">
                <IconButton
                  onClick={() => onDelete(item)}
                  aria-label="Excluir item"
                  sx={{ ...HEADER_BUTTON_SX, width: 44, height: 44, borderRadius: '12px', color: 'error.main' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </>
      )}
    </Drawer>
  );
}

import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import dayjs from 'dayjs';

import type { DocumentFile } from '../../types';
import { categoryMeta, canOpenDocument, documentFileIcon, fmtFileSize } from './documentUtils';

interface DocumentCardProps {
  doc: DocumentFile;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

export function DocumentCard({
  doc,
  canDelete,
  onOpen,
  onDelete,
}: DocumentCardProps) {
  const category = categoryMeta(doc.category);
  const { Icon, color } = documentFileIcon(doc.mimeType);
  const openable = canOpenDocument(doc);
  const linkLabel = doc.patient?.name ?? doc.equipment?.name;
  const LinkIcon = doc.patient ? PersonOutlineIcon : BuildOutlinedIcon;

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          boxShadow: 1,
          borderColor: 'primary.light',
        },
      }}
    >
      <CardActionArea
        onClick={openable ? onOpen : undefined}
        disabled={!openable}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          p: 1.25,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: '100%' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.12),
              color,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap title={doc.name} sx={{ lineHeight: 1.3 }}>
              {doc.name}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                size="small"
                label={category.label}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(category.color, 0.1),
                  color: category.color,
                  border: '1px solid',
                  borderColor: alpha(category.color, 0.25),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {fmtFileSize(doc.size)} · {dayjs(doc.createdAt).format('DD/MM/YY')}
              </Typography>
            </Stack>
            {linkLabel ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, minWidth: 0 }}>
                <LinkIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" noWrap title={linkLabel}>
                  {linkLabel}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                Sem vínculo
              </Typography>
            )}
          </Box>
        </Stack>
      </CardActionArea>

      <Stack
        direction="row"
        spacing={0}
        justifyContent="flex-end"
        sx={{ px: 0.5, py: 0.25, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}
      >
        {openable && (
          <Tooltip title="Abrir arquivo">
            <IconButton size="small" onClick={onOpen} aria-label="Abrir arquivo">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Excluir">
            <IconButton size="small" color="error" onClick={onDelete} aria-label="Excluir">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}

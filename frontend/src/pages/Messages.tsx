import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { DialogHeader, dialogPaperSx } from '../components/DialogCloseButton';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { MessageTemplateFormDialog } from '../components/messages/MessageTemplateFormDialog';
import { WhatsAppPreview } from '../components/messages/WhatsAppPreview';
import { categoryLabel, categoryOptions } from '../components/messages/messageTemplateConstants';
import { FILTER_FIELD_SX, matchFields } from '../utils/listFilters';
import { messagesApi } from '../api/messages';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { proceduresApi } from '../api/procedures';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { MessageTemplate } from '../types';

function PreviewDialog({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: MessageTemplate | null;
}) {
  if (!template) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx(false) }}>
      <DialogHeader
        onClose={onClose}
        title={`Preview — ${template.name}`}
        subtitle={template.category ?? 'Visualização do template'}
        icon={<VisibilityOutlinedIcon fontSize="small" />}
      />
      <DialogContent>
        <WhatsAppPreview
          content={template.content}
          category={template.category ?? undefined}
          procedure={template.procedure ?? null}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export function Messages() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('messages:create');
  const canEdit = has('messages:edit');
  const canDelete = has('messages:delete');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => messagesApi.list(),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) => {
        if (categoryFilter !== 'ALL' && (t.category ?? '') !== categoryFilter) return false;
        return matchFields(
          search,
          t.name,
          t.content,
          t.category ? categoryLabel[t.category] : undefined,
          t.procedure?.name,
        );
      }),
    [templates, search, categoryFilter],
  );

  const columns = useMemo<GridColDef<MessageTemplate>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1, minWidth: 180 },
      {
        field: 'category',
        headerName: 'Categoria',
        flex: 0.5,
        minWidth: 120,
        renderCell: (params) => {
          const cat = params.row.category;
          return cat ? (
            <Chip size="small" label={categoryLabel[cat] ?? cat} variant="outlined" />
          ) : (
            '—'
          );
        },
      },
      {
        field: 'content',
        headerName: 'Conteúdo',
        flex: 1.2,
        minWidth: 200,
        valueGetter: (params) => {
          const c = params.row.content ?? '';
          return c.length > 60 ? c.slice(0, 60) + '...' : c;
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 170,
        getActions: (params) => {
          const actions = [
            <GridActionsCellItem
              key="preview"
              icon={
                <Tooltip title="Preview">
                  <VisibilityIcon fontSize="small" />
                </Tooltip>
              }
              label="Preview"
              onClick={() => setPreviewTemplate(params.row)}
            />,
          ];
          if (canEdit) {
            actions.push(
              <GridActionsCellItem
                key="edit"
                icon={
                  <Tooltip title="Editar">
                    <EditIcon fontSize="small" />
                  </Tooltip>
                }
                label="Editar"
                onClick={() => {
                  setEditing(params.row);
                  setFormOpen(true);
                }}
              />,
            );
          }
          if (canDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={
                  <Tooltip title="Excluir">
                    <DeleteIcon fontSize="small" />
                  </Tooltip>
                }
                label="Excluir"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir template',
                    message: `Excluir template ${params.row.name}?`,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                  });
                  if (ok) deleteMutation.mutate(params.row.id);
                }}
              />,
            );
          }
          return actions;
        },
      },
    ],
    [confirm, deleteMutation, canEdit, canDelete],
  );

  return (
    <Box>
      <PageHeader
        title="Mensagens"
        subtitle="Templates de mensagens WhatsApp"
        action={
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryOpen(true)}
              >
                Histórico
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Novo template
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou conteúdo"
          filteredCount={filteredTemplates.length}
          totalCount={templates.length}
          countLabel={filteredTemplates.length === 1 ? 'template' : 'templates'}
        >
          <TextField
            select
            size="small"
            label="Categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todas</MenuItem>
            {categoryOptions
              .filter((c) => c.value)
              .map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
          </TextField>
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredTemplates}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              templates.length === 0
                ? 'Nenhum template cadastrado'
                : 'Nenhum template encontrado com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>

      <MessageTemplateFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        template={editing}
        procedures={procedures}
      />
      <PreviewDialog
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="MessageTemplate"
        title="Mensagens"
      />
    </Box>
  );
}

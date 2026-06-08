import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields } from '../utils/listFilters';
import { messagesApi, MessageTemplatePayload } from '../api/messages';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { proceduresApi } from '../api/procedures';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { MessageTemplate, Procedure } from '../types';

// ─── Categorias ───
const categoryOptions = [
  { value: '', label: '—' },
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'livre', label: 'Livre' },
];

const categoryLabel: Record<string, string> = Object.fromEntries(
  categoryOptions.filter((c) => c.value).map((c) => [c.value, c.label]),
);

const VARIABLES = ['{paciente_nome}', '{procedimento}', '{data}', '{hora}', '{profissional}', '{valor}'];

// ─── Emoji picker simples ───
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Rostos',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
  },
  {
    label: 'Gestos',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'],
  },
  {
    label: 'Objetos',
    emojis: ['💄','💅','💇','💆','🧖','💈','💉','💊','🩺','🩹','🧴','🧽','🧼','🪥','🪒','✂️','📋','📌','📎','🔗','📞','📱','💻','⏰','🎁','🎉','🎊','🎈','🏷️','💰','💳','📦','🚚','✈️','🏥','🏪'],
  },
  {
    label: 'Símbolos',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','💫','🔥','💥','💯','✅','❌','⚠️','📢','🔔','💬','🗨️','👁️‍🗨️','🆕','🆓','🔝','▶️','⏩','🔴','🟢','🔵','⚪','⚫'],
  },
];

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ width: 320, p: 1 }}>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, overflowX: 'auto' }}>
        {EMOJI_GROUPS.map((g, i) => (
          <Chip
            key={g.label}
            label={g.label}
            size="small"
            variant={tab === i ? 'filled' : 'outlined'}
            onClick={() => setTab(i)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, maxHeight: 200, overflowY: 'auto' }}>
        {EMOJI_GROUPS[tab].emojis.map((e) => (
          <Box
            key={e}
            onClick={() => onSelect(e)}
            sx={{
              cursor: 'pointer',
              fontSize: 22,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {e}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Preview estilo WhatsApp ───
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function WhatsAppPreview({
  content,
  category,
  procedure,
}: {
  content: string;
  category?: string;
  procedure?: Procedure | null;
}) {
  const preview = content
    .replace(/\{paciente_nome\}/g, 'Maria Silva')
    .replace(/\{procedimento\}/g, procedure?.name ?? 'Limpeza de pele')
    .replace(/\{data\}/g, dayjs().add(3, 'day').format('DD/MM/YYYY'))
    .replace(/\{hora\}/g, '14:00')
    .replace(/\{profissional\}/g, 'Dra. Mila')
    .replace(/\{valor\}/g, procedure?.price ? brl.format(Number(procedure.price)) : 'R$ 150,00');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 360,
          bgcolor: '#e5ddd5',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23c7bfb5\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")',
          borderRadius: 2,
          p: 1.5,
          minHeight: 120,
        }}
      >
        <Box
          sx={{
            bgcolor: '#dcf8c6',
            borderRadius: '8px 8px 0 8px',
            p: 1.5,
            maxWidth: '92%',
            ml: 'auto',
            position: 'relative',
            boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          }}
        >
          {category === 'promocao' && procedure && (
            <Box
              sx={{
                bgcolor: '#c8e6c9',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                mb: 1,
                display: 'inline-block',
              }}
            >
              <Typography variant="caption" fontWeight={600} sx={{ color: '#2e7d32' }}>
                ✨ PROMOÇÃO — {procedure.name}
              </Typography>
              <Typography variant="caption" display="block" sx={{ color: '#388e3c' }}>
                {brl.format(Number(procedure.price))}
              </Typography>
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#303030',
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {preview || (
              <Typography component="span" variant="body2" color="text.disabled" fontStyle="italic">
                Digite o conteúdo para ver o preview...
              </Typography>
            )}
          </Typography>
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#8d9fa5', fontSize: 11 }}>
              {dayjs().format('HH:mm')}
            </Typography>
            <DoneAllIcon sx={{ fontSize: 16, color: '#53bdeb' }} />
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

// ─── Dialog de preview (apenas leitura) ───
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Preview — {template.name}</DialogTitle>
      <DialogContent>
        <WhatsAppPreview
          content={template.content}
          category={template.category ?? undefined}
          procedure={template.procedure as any}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog de criação/edição ───
interface FormValues {
  name: string;
  category: string;
  content: string;
  procedureId: string;
}

const empty: FormValues = { name: '', category: '', content: '', procedureId: '' };

function TemplateDialog({
  open,
  onClose,
  template,
  procedures,
}: {
  open: boolean;
  onClose: () => void;
  template?: MessageTemplate | null;
  procedures: Procedure[];
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm<FormValues>({
    defaultValues: empty,
  });

  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  useMemo(() => {
    if (open) {
      reset(
        template
          ? {
              name: template.name,
              category: template.category ?? '',
              content: template.content,
              procedureId: template.procedureId ?? '',
            }
          : empty,
      );
    }
  }, [open, template, reset]);

  const category = watch('category');
  const content = watch('content');
  const procedureId = watch('procedureId');
  const selectedProcedure = procedures.find((p) => p.id === procedureId) ?? null;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: MessageTemplatePayload = {
        name: values.name,
        content: values.content,
        ...(values.category ? { category: values.category } : {}),
        procedureId: values.category === 'promocao' && values.procedureId ? values.procedureId : null,
      };
      return template ? messagesApi.update(template.id, payload) : messagesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      onClose();
    },
  });

  const insertAtCursor = (text: string) => {
    const el = contentRef.current;
    const current = getValues('content') ?? '';
    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? start;
      const next = current.slice(0, start) + text + current.slice(end);
      setValue('content', next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + text.length, start + text.length);
      });
    } else {
      setValue('content', current + text);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile ? {} : { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="span">
          {template ? 'Editar template' : 'Novo template'}
        </Typography>
        {isMobile && (
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 } }}>
        <form id="template-form" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome do template"
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Categoria" fullWidth size="small">
                    {categoryOptions.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {category === 'promocao' && (
              <Grid item xs={12}>
                <Controller
                  name="procedureId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="Procedimento vinculado" fullWidth size="small">
                      <MenuItem value="">Nenhum</MenuItem>
                      {procedures.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} — {brl.format(Number(p.price))}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {VARIABLES.map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    size="small"
                    variant="outlined"
                    onClick={() => insertAtCursor(v)}
                    sx={{ cursor: 'pointer', mb: 0.5 }}
                  />
                ))}
                <Tooltip title="Inserir emoji">
                  <IconButton
                    size="small"
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  >
                    <EmojiEmotionsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Popover
                open={!!emojiAnchor}
                anchorEl={emojiAnchor}
                onClose={() => setEmojiAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <EmojiPicker
                  onSelect={(emoji) => {
                    insertAtCursor(emoji);
                    setEmojiAnchor(null);
                  }}
                />
              </Popover>
              <Controller
                name="content"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    inputRef={contentRef}
                    label="Conteúdo da mensagem"
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={10}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Preview
              </Typography>
              <WhatsAppPreview
                content={content}
                category={category || undefined}
                procedure={selectedProcedure}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
        <Button
          type="submit"
          form="template-form"
          variant="contained"
          disabled={mutation.isPending}
          fullWidth={isMobile}
        >
          {template ? 'Salvar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Página principal ───
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

      <TemplateDialog
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

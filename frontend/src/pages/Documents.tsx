import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HistoryIcon from '@mui/icons-material/History';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { DocumentFormDialog, MAX_FILE_BYTES, UPLOAD_ACCEPT } from '../components/documents/DocumentFormDialog';
import { DocumentTemplatesDialog } from '../components/documents/DocumentTemplatesDialog';
import { DocumentViewerDialog } from '../components/documents/DocumentViewerDialog';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  canOpenDocument,
  categoryMeta,
  documentFileIcon,
  fmtFileSize,
  fmtStorageTotal,
  statusMeta,
  sumDocumentBytes,
} from '../components/documents/documentUtils';
import { documentsApi } from '../api/documents';
import { documentTemplatesApi } from '../api/documentTemplates';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { matchFields } from '../utils/listFilters';
import type { DocumentFile, DocumentStatus } from '../types';
import { fontSizes } from '../theme/fontSizes';

type LinkFilter = 'ALL' | 'PATIENT' | 'EQUIPMENT' | 'NONE';

const DOCS_KEY = ['documents'];
const PAGE_SIZE = 8;
const GRID_COLS =
  'minmax(0, 2.6fr) minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.9fr) 44px';
const GRID_MIN_WIDTH = 860;

const TOOLBAR_SELECT_SX = {
  width: { xs: 'calc(50% - 5px)', sm: 160 },
  flexShrink: 0,
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    bgcolor: 'grey.50',
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: 'text.secondary',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

const TOOLBAR_ICON_BUTTON_SX = {
  flexShrink: 0,
  width: 38,
  height: 38,
  borderRadius: '12px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
} as const;

function replaceDocument(list: DocumentFile[] | undefined, doc: DocumentFile): DocumentFile[] {
  const prev = list ?? [];
  if (!prev.some((d) => d.id === doc.id)) return [doc, ...prev];
  return prev.map((d) => (d.id === doc.id ? { ...d, ...doc } : d));
}

function StatCard({ label, value, loading }: { label: string; value: string | number; loading?: boolean }) {
  return (
    <Card sx={{ p: { xs: 2, sm: '18px 20px' }, borderRadius: '16px' }}>
      {loading ? (
        <Skeleton variant="text" width={70} sx={{ fontSize: fontSizes['6xl'] }} />
      ) : (
        <Typography
          sx={{ fontSize: { xs: '1.4rem', sm: '1.65rem' }, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.3 }}
        >
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
        {label}
      </Typography>
    </Card>
  );
}

function StatusPill({ status }: { status: DocumentStatus }) {
  const theme = useTheme();
  const meta = statusMeta(status);
  const color = theme.palette[meta.tone].main;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        fontSize: fontSizes.xs,
        fontWeight: 700,
        px: 1,
        py: 0.4,
        borderRadius: '8px',
        color: theme.palette[meta.tone].dark,
        bgcolor: alpha(color, 0.13),
        whiteSpace: 'nowrap',
      }}
    >
      <FiberManualRecordIcon sx={{ fontSize: 8, color }} />
      {meta.label}
    </Box>
  );
}

function LinkCell({ doc }: { doc: DocumentFile }) {
  const label = doc.patient?.name ?? doc.equipment?.name;
  if (!label) {
    return <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>Sem vínculo</Typography>;
  }
  const LinkIcon = doc.patient ? PersonOutlineIcon : BuildOutlinedIcon;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <LinkIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
      <Typography noWrap title={label} sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}

export function Documents() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const toast = useAppToast();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('documents:create');
  const canEdit = has('documents:edit');
  const canDelete = has('documents:delete');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentFile | null>(null);
  const [viewing, setViewing] = useState<DocumentFile | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; doc: DocumentFile } | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const attachTarget = useRef<DocumentFile | null>(null);

  const { data: docs = [], isLoading, isFetching } = useQuery({
    queryKey: DOCS_KEY,
    queryFn: () => documentsApi.list(),
  });
  const loading = isLoading || (isFetching && docs.length === 0);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: documentTemplatesApi.list,
  });

  const handleSaved = (saved: DocumentFile, created: boolean) => {
    queryClient.setQueryData<DocumentFile[]>(DOCS_KEY, (old) => replaceDocument(old, saved));
    void queryClient.invalidateQueries({ queryKey: [...DOCS_KEY, saved.id], exact: true });
    if (created) {
      setStatusFilter('ALL');
      setCategoryFilter('ALL');
      setLinkFilter('ALL');
      setSearch('');
      if (saved.templateId) void queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      // Documento gerado de modelo: abre o texto para conferir e imprimir
      if (saved.hasContent && !saved.storageKey) setViewing(saved);
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) => documentsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: DOCS_KEY, exact: true });
      const previous = queryClient.getQueryData<DocumentFile[]>(DOCS_KEY);
      queryClient.setQueryData<DocumentFile[]>(DOCS_KEY, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, status } : d)),
      );
      return { previous };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<DocumentFile[]>(DOCS_KEY, (old) => replaceDocument(old, saved));
      toast.success(`Documento marcado como ${statusMeta(saved.status).label.toLowerCase()}.`);
    },
    onError: (err, _vars, ctx) => {
      queryClient.setQueryData(DOCS_KEY, ctx?.previous);
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar o status.'));
    },
  });

  const attachMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => documentsApi.attachFile(id, file),
    onSuccess: (saved) => {
      handleSaved(saved, false);
      setViewing((v) => (v?.id === saved.id ? saved : v));
      toast.success('Versão assinada anexada.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível anexar o arquivo.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<DocumentFile[]>(DOCS_KEY, (old = []) => old.filter((d) => d.id !== id));
      void queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('Documento excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o documento.'));
    },
  });

  const stats = useMemo(() => {
    let patients = 0;
    let equipment = 0;
    let unlinked = 0;
    const byCategory: Record<string, number> = {};
    const byStatus: Record<DocumentStatus, number> = { PENDING: 0, SENT: 0, SIGNED: 0 };

    for (const d of docs) {
      if (d.patientId) patients += 1;
      else if (d.equipmentId) equipment += 1;
      else unlinked += 1;

      const key = d.category || '__none__';
      byCategory[key] = (byCategory[key] ?? 0) + 1;
      byStatus[d.status] += 1;
    }

    return {
      total: docs.length,
      patients,
      equipment,
      unlinked,
      byCategory,
      byStatus,
      totalBytes: sumDocumentBytes(docs),
    };
  }, [docs]);

  const activeTemplates = templates.filter((t) => t.active).length;

  const filteredDocs = useMemo(
    () =>
      docs.filter((d) => {
        if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL') {
          if (categoryFilter === '__none__' && d.category) return false;
          if (categoryFilter !== '__none__' && (d.category ?? '') !== categoryFilter) return false;
        }
        if (linkFilter === 'PATIENT' && !d.patientId) return false;
        if (linkFilter === 'EQUIPMENT' && !d.equipmentId) return false;
        if (linkFilter === 'NONE' && (d.patientId || d.equipmentId)) return false;
        return matchFields(
          search,
          d.name,
          categoryMeta(d.category).label,
          d.patient?.name,
          d.equipment?.name,
          d.notes,
          d.template?.name,
        );
      }),
    [docs, search, statusFilter, categoryFilter, linkFilter],
  );

  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, statusFilter, categoryFilter, linkFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filteredDocs.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const handleDelete = async (doc: DocumentFile) => {
    const ok = await confirm({
      title: 'Excluir documento',
      message: `Excluir ${doc.name}?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(doc.id);
  };

  const handleOpenDocument = async (doc: DocumentFile) => {
    try {
      const url = await documentsApi.getAccessUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      await alert({
        title: 'Não foi possível abrir',
        message: 'Não foi possível gerar o link de acesso ao documento. Tente novamente.',
      });
    }
  };

  const handleRowClick = (doc: DocumentFile) => {
    if (canOpenDocument(doc)) void handleOpenDocument(doc);
    else if (doc.hasContent) setViewing(doc);
    else if (canEdit) {
      setEditing(doc);
      setFormOpen(true);
    }
  };

  const startAttach = (doc: DocumentFile) => {
    attachTarget.current = doc;
    attachInputRef.current?.click();
  };

  const handleAttachSelected = (file: File | undefined) => {
    const doc = attachTarget.current;
    attachTarget.current = null;
    if (!file || !doc) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`O arquivo tem ${fmtFileSize(file.size)}; o limite é 25 MB.`);
      return;
    }
    attachMutation.mutate({ id: doc.id, file });
  };

  const closeMenu = () => setMenu(null);
  const menuAction = (fn: (doc: DocumentFile) => void) => () => {
    const doc = menu?.doc;
    closeMenu();
    if (doc) fn(doc);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const menuDoc = menu?.doc;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 1320, mx: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: { xs: 1.5, sm: 2.25 },
        }}
      >
        <StatCard label="Total de documentos" value={stats.total} loading={loading} />
        <StatCard label="Assinados" value={stats.byStatus.SIGNED} loading={loading} />
        <StatCard label="Pendentes" value={stats.byStatus.PENDING} loading={loading} />
        <StatCard label="Modelos ativos" value={activeTemplates} loading={templatesLoading} />
      </Box>

      <Card sx={{ p: 0, overflow: 'hidden', borderRadius: '18px' }}>
        {/* Título + filtros + ações */}
        <Stack
          direction={{ xs: 'column', xl: 'row' }}
          alignItems={{ xs: 'stretch', xl: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ px: { xs: 2, sm: 2.75 }, py: 2.25, borderBottom: 1, borderColor: 'divider' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>
              Documentos
              {!loading && docs.length > 0 && (
                <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500, fontSize: fontSizes.sm }}>
                  {` · ${filteredDocs.length} de ${docs.length}`}
                </Box>
              )}
            </Typography>
            {!loading && stats.totalBytes > 0 && (
              <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
                {fmtStorageTotal(stats.totalBytes)} em arquivos
                {stats.byStatus.SENT > 0 && ` · ${stats.byStatus.SENT} aguardando assinatura`}
              </Typography>
            )}
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            flexWrap={{ xs: 'wrap', lg: 'nowrap' }}
            useFlexGap
            justifyContent={{ xl: 'flex-end' }}
            sx={{ minWidth: 0 }}
          >
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DocumentStatus)}
              inputProps={{ 'aria-label': 'Status' }}
              sx={TOOLBAR_SELECT_SX}
            >
              <MenuItem value="ALL">Todos os status</MenuItem>
              {DOCUMENT_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label} ({stats.byStatus[s.value]})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              inputProps={{ 'aria-label': 'Tipo' }}
              sx={TOOLBAR_SELECT_SX}
            >
              <MenuItem value="ALL">Todos os tipos</MenuItem>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label} ({stats.byCategory[cat.value] ?? 0})
                </MenuItem>
              ))}
              <MenuItem value="__none__">Sem tipo ({stats.byCategory.__none__ ?? 0})</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value as LinkFilter)}
              inputProps={{ 'aria-label': 'Vínculo' }}
              sx={TOOLBAR_SELECT_SX}
            >
              <MenuItem value="ALL">Todos os vínculos</MenuItem>
              <MenuItem value="PATIENT">Pacientes ({stats.patients})</MenuItem>
              <MenuItem value="EQUIPMENT">Equipamentos ({stats.equipment})</MenuItem>
              <MenuItem value="NONE">Sem vínculo ({stats.unlinked})</MenuItem>
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
                width: { xs: '100%', sm: 230 },
                minWidth: 0,
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <InputBase
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar documento, paciente..."
                sx={{ fontSize: fontSizes.sm, flex: 1 }}
              />
            </Stack>
            <Tooltip title="Modelos de documento">
              <IconButton onClick={() => setTemplatesOpen(true)} sx={TOOLBAR_ICON_BUTTON_SX}>
                <ArticleOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Histórico de alterações">
                <IconButton onClick={() => setHistoryOpen(true)} sx={TOOLBAR_ICON_BUTTON_SX}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
              >
                Novo documento
              </Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ overflowX: 'auto' }}>
          {/* Cabeçalho de colunas */}
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: GRID_COLS,
              minWidth: GRID_MIN_WIDTH,
              gap: 1.5,
              px: 2.75,
              py: 1.6,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              fontSize: fontSizes['2xs'],
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            <span>Documento</span>
            <span>Paciente</span>
            <span>Tipo</span>
            <span>Data</span>
            <span>Status</span>
            <span />
          </Box>

          {loading ? (
            <Box sx={{ px: 2.75, py: 2 }}>
              <Stack spacing={1.25}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={48} />
                ))}
              </Stack>
            </Box>
          ) : filteredDocs.length === 0 ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <DescriptionOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                {docs.length === 0 ? 'Nenhum documento cadastrado' : 'Nenhum documento encontrado'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
                {docs.length === 0
                  ? 'Gere termos a partir dos modelos ou envie contratos, certificados e arquivos da clínica.'
                  : 'Tente ajustar a busca ou os filtros.'}
              </Typography>
              {canCreate && docs.length === 0 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 2 }}>
                  Novo documento
                </Button>
              )}
            </Box>
          ) : (
            rows.map((doc) => {
              const hasFile = canOpenDocument(doc);
              const { Icon, color } = hasFile
                ? documentFileIcon(doc.mimeType)
                : { Icon: ArticleOutlinedIcon, color: theme.palette.primary.main };
              const clickable = hasFile || !!doc.hasContent || canEdit;
              const subtitle = [
                hasFile ? fmtFileSize(doc.size) : 'Texto gerado de modelo',
                doc.notes,
              ].filter(Boolean);
              return (
                <Box
                  key={doc.id}
                  onClick={clickable ? () => handleRowClick(doc) : undefined}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: GRID_COLS },
                    minWidth: { md: GRID_MIN_WIDTH },
                    gap: 1.5,
                    px: { xs: 2, md: 2.75 },
                    py: 1.75,
                    borderBottom: 1,
                    borderColor: 'grey.100',
                    alignItems: 'center',
                    cursor: clickable ? 'pointer' : 'default',
                    '&:hover': { bgcolor: 'grey.50' },
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  {/* Documento */}
                  <Stack direction="row" alignItems="center" spacing={1.6} sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        bgcolor: alpha(color, 0.1),
                      }}
                    >
                      <Icon sx={{ fontSize: 19 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
                      <Typography noWrap title={doc.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
                        {doc.name}
                      </Typography>
                      <Typography
                        noWrap
                        title={doc.notes || undefined}
                        sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled' }}
                      >
                        <Box component="span" sx={{ display: { md: 'none' } }}>
                          {`${statusMeta(doc.status).label} · ${categoryMeta(doc.category).label} · ${dayjs(doc.createdAt).format('DD/MM/YY')}`}
                          {(doc.patient?.name ?? doc.equipment?.name) && ` · ${doc.patient?.name ?? doc.equipment?.name}`}
                          {' · '}
                        </Box>
                        {subtitle.join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Paciente / vínculo */}
                  <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                    <LinkCell doc={doc} />
                  </Box>

                  {/* Tipo */}
                  <Typography
                    noWrap
                    title={categoryMeta(doc.category).label}
                    sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
                  >
                    {categoryMeta(doc.category).label}
                  </Typography>

                  {/* Data */}
                  <Typography
                    sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
                    noWrap
                  >
                    {dayjs(doc.createdAt).locale('pt-br').format('DD MMM YYYY')}
                  </Typography>

                  {/* Status */}
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <StatusPill status={doc.status} />
                  </Box>

                  {/* Ações */}
                  <IconButton
                    aria-label="Ações"
                    onClick={(ev: MouseEvent<HTMLElement>) => {
                      ev.stopPropagation();
                      setMenu({ anchor: ev.currentTarget, doc });
                    }}
                    sx={{ width: 32, height: 32, borderRadius: '9px', color: 'text.disabled', justifySelf: 'end' }}
                  >
                    <MoreHorizIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Box>

        {/* Paginação */}
        {!loading && pageCount > 1 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{ px: 2.75, py: 1.75, borderTop: 1, borderColor: 'divider' }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
              Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filteredDocs.length)} de{' '}
              {filteredDocs.length}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="center">
              {Array.from({ length: pageCount }).map((_, i) => {
                const activePage = i === current;
                return (
                  <Box
                    key={i}
                    component="button"
                    type="button"
                    onClick={() => setPage(i)}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      px: 0.75,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: fontSizes.sm,
                      fontWeight: 700,
                      borderRadius: '9px',
                      border: 1,
                      borderColor: activePage ? 'primary.main' : 'divider',
                      color: activePage ? '#fff' : 'text.secondary',
                      bgcolor: activePage ? 'primary.main' : 'background.paper',
                      '&:hover': { bgcolor: activePage ? 'primary.main' : 'grey.50' },
                    }}
                  >
                    {i + 1}
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        )}
      </Card>

      <Menu
        anchorEl={menu?.anchor}
        open={!!menu}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 230, borderRadius: '12px' } } }}
        MenuListProps={{ dense: true }}
      >
        {menuDoc && canOpenDocument(menuDoc) && (
          <MenuItem onClick={menuAction((d) => void handleOpenDocument(d))}>
            <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Abrir arquivo</ListItemText>
          </MenuItem>
        )}
        {menuDoc?.hasContent && (
          <MenuItem onClick={menuAction(setViewing)}>
            <ListItemIcon><PrintOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Visualizar e imprimir</ListItemText>
          </MenuItem>
        )}
        {menuDoc && canEdit && (
          <MenuItem onClick={menuAction(startAttach)} disabled={attachMutation.isPending}>
            <ListItemIcon><AttachFileIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{menuDoc.storageKey ? 'Substituir arquivo' : 'Anexar versão assinada'}</ListItemText>
          </MenuItem>
        )}
        {menuDoc && canEdit && <Divider />}
        {menuDoc &&
          canEdit &&
          DOCUMENT_STATUSES.filter((s) => s.value !== menuDoc.status).map((s) => (
            <MenuItem
              key={s.value}
              onClick={menuAction((d) => statusMutation.mutate({ id: d.id, status: s.value }))}
            >
              <ListItemIcon>
                <FiberManualRecordIcon sx={{ fontSize: 12, color: theme.palette[s.tone].main }} />
              </ListItemIcon>
              <ListItemText>Marcar como {s.label.toLowerCase()}</ListItemText>
            </MenuItem>
          ))}
        {menuDoc && canEdit && <Divider />}
        {menuDoc && canEdit && (
          <MenuItem
            onClick={menuAction((d) => {
              setEditing(d);
              setFormOpen(true);
            })}
          >
            <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {menuDoc && canDelete && (
          <MenuItem onClick={menuAction((d) => void handleDelete(d))} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <input
        ref={attachInputRef}
        type="file"
        hidden
        accept={UPLOAD_ACCEPT}
        onChange={(e) => {
          handleAttachSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <DocumentFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSaved={handleSaved}
      />
      <DocumentViewerDialog
        doc={viewing}
        onClose={() => setViewing(null)}
        onAttach={canEdit ? startAttach : undefined}
      />
      <DocumentTemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Document"
        title="Documentos"
      />
    </Stack>
  );
}

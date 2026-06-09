import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { DialogHeader } from '../components/DialogCloseButton';
import { AppGrid } from '../components/AppGrid';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { DocumentCard } from '../components/documents/DocumentCard';
import {
  DOCUMENT_CATEGORIES,
  documentFileIcon,
  fmtFileSize,
  fmtStorageTotal,
  sumDocumentBytes,
} from '../components/documents/documentUtils';
import { documentsApi } from '../api/documents';
import { patientsApi } from '../api/patients';
import { equipmentApi } from '../api/equipment';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import { matchFields } from '../utils/listFilters';
import type { DocumentFile } from '../types';

const uploadCategories = [{ value: '', label: '—' }, ...DOCUMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))];

const UPLOAD_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/*,text/plain,text/csv';

type LinkFilter = 'ALL' | 'PATIENT' | 'EQUIPMENT' | 'NONE';

function prependDocument(list: DocumentFile[] | undefined, created: DocumentFile): DocumentFile[] {
  const prev = list ?? [];
  if (prev.some((d) => d.id === created.id)) return prev;
  return [created, ...prev];
}

function UploadHeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function UploadFormSection({
  title,
  subtitle,
  icon,
  action,
  children,
  fill,
  sx,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  fill?: boolean;
  sx?: object;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: 2,
        ...(fill
          ? { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }
          : {}),
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <UploadHeaderIcon>{icon}</UploadHeaderIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {action}
      </Stack>
      <Box sx={fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined}>
        {children}
      </Box>
    </Paper>
  );
}

function UploadDialog({
  file,
  open,
  onClose,
  onChangeFile,
  onDocumentCreated,
}: {
  file: File;
  open: boolean;
  onClose: () => void;
  onChangeFile: () => void;
  onDocumentCreated: (doc: DocumentFile) => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const { Icon, color } = documentFileIcon(file.type);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => patientsApi.list(),
    enabled: open,
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list(),
    enabled: open,
  });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (open) {
      setName(file.name);
      setCategory('');
      setPatientId(null);
      setEquipmentId(null);
    }
  }, [open, file]);

  const mutation = useMutation({
    mutationFn: () =>
      documentsApi.upload(file, {
        name: name.trim() || file.name,
        category: category || undefined,
        patientId: patientId || undefined,
        equipmentId: equipmentId || undefined,
      }),
    onSuccess: (created) => {
      onDocumentCreated(created);
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { height: 800, maxHeight: '94vh' }),
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title="Enviar documento"
          subtitle={file.name}
          subtitleTitle={file.name}
          icon={<UploadFileIcon fontSize="small" />}
          trailing={
            <Chip size="small" label={fmtFileSize(file.size)} variant="outlined" sx={{ flexShrink: 0 }} />
          }
        />

        <DialogContent
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            p: 2,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
            display: 'flex',
            flexDirection: 'column',
            '&.MuiDialogContent-root': { paddingTop: 2 },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', minHeight: { xs: 320, md: 0 }, height: { md: '100%' }, minWidth: 0 }}>
              <UploadFormSection
                fill
                title="Pré-visualização"
                subtitle="Confira o arquivo antes de enviar"
                icon={<VisibilityOutlinedIcon fontSize="small" />}
                action={
                  <Button size="small" variant="outlined" onClick={onChangeFile}>
                    Trocar
                  </Button>
                }
              >
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {previewUrl && isImage ? (
                    <Box
                      component="img"
                      src={previewUrl}
                      alt={file.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : previewUrl && isPdf ? (
                    <Box
                      component="iframe"
                      src={previewUrl}
                      title="Pré-visualização do PDF"
                      sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(color, 0.12),
                          color,
                        }}
                      >
                        <Icon sx={{ fontSize: 28 }} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} textAlign="center" noWrap title={file.name}>
                        {file.name}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </UploadFormSection>
            </Box>

            <Box sx={{ minHeight: 0, minWidth: 0, overflow: 'auto' }}>
              <Stack spacing={2}>
                <UploadFormSection
                  title="Identificação"
                  subtitle="Nome e categoria do documento"
                  icon={<DriveFileRenameOutlineIcon fontSize="small" />}
                >
                  <Stack spacing={1.5}>
                    <TextField
                      label="Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      size="small"
                      helperText="Preenchido com o nome do arquivo; você pode editar"
                    />
                    <TextField
                      select
                      label="Categoria"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      {uploadCategories.map((c) => (
                        <MenuItem key={c.value || 'none'} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </UploadFormSection>

                <UploadFormSection
                  title="Vínculo"
                  subtitle="Opcional — associe a um paciente ou equipamento"
                  icon={<LinkOutlinedIcon fontSize="small" />}
                >
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={patients}
                        getOptionLabel={(p) => p.name}
                        value={patients.find((p) => p.id === patientId) ?? null}
                        onChange={(_, v) => setPatientId(v?.id ?? null)}
                        renderInput={(params) => (
                          <TextField {...params} label="Paciente" size="small" placeholder="Nenhum" />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        options={equipment}
                        getOptionLabel={(e) => e.name}
                        value={equipment.find((e) => e.id === equipmentId) ?? null}
                        onChange={(_, v) => setEquipmentId(v?.id ?? null)}
                        renderInput={(params) => (
                          <TextField {...params} label="Equipamento" size="small" placeholder="Nenhum" />
                        )}
                      />
                    </Grid>
                  </Grid>
                </UploadFormSection>

                {mutation.isError && (
                  <Alert severity="error">
                    {(mutation.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
                      (mutation.error as Error)?.message ??
                      'Erro no upload'}
                  </Alert>
                )}
              </Stack>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderTop: 1,
            borderColor: 'divider',
            flexShrink: 0,
            gap: 1,
          }}
        >
          {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
          <Button
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            fullWidth={isMobile}
          >
            {mutation.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function StatMiniCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderLeft: '3px solid',
        borderLeftColor: color,
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.1),
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function Documents() {
  const queryClient = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('documents:create');
  const canDelete = has('documents:delete');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (selected) {
      setUploadFile(selected);
      setUploadOpen(true);
    }
  }, []);

  const handleUploadClose = useCallback(() => {
    setUploadOpen(false);
    setUploadFile(null);
  }, []);

  const { data: docs = [], isLoading, isFetching } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const handleDocumentCreated = useCallback(
    (created: DocumentFile) => {
      queryClient.setQueryData<DocumentFile[]>(['documents'], (old) => prependDocument(old, created));
      setCategoryFilter('ALL');
      setLinkFilter('ALL');
      setSearch('');
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    [queryClient],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const stats = useMemo(() => {
    let patients = 0;
    let equipment = 0;
    let unlinked = 0;
    const byCategory: Record<string, number> = {};

    for (const d of docs) {
      if (d.patientId) patients += 1;
      else if (d.equipmentId) equipment += 1;
      else unlinked += 1;

      const key = d.category || '__none__';
      byCategory[key] = (byCategory[key] ?? 0) + 1;
    }

    return {
      total: docs.length,
      patients,
      equipment,
      unlinked,
      byCategory,
      totalBytes: sumDocumentBytes(docs),
    };
  }, [docs]);

  const filteredDocs = useMemo(
    () =>
      docs.filter((d) => {
        if (categoryFilter !== 'ALL') {
          if (categoryFilter === '__none__' && d.category) return false;
          if (categoryFilter !== '__none__' && (d.category ?? '') !== categoryFilter) return false;
        }
        if (linkFilter === 'PATIENT' && !d.patientId) return false;
        if (linkFilter === 'EQUIPMENT' && !d.equipmentId) return false;
        if (linkFilter === 'NONE' && (d.patientId || d.equipmentId)) return false;
        return matchFields(search, d.name, d.category, d.patient?.name, d.equipment?.name, d.notes);
      }),
    [docs, search, categoryFilter, linkFilter],
  );

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

  const linkFilters: { value: LinkFilter; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'ALL', label: 'Todos', icon: <FolderOpenOutlinedIcon fontSize="small" />, count: stats.total },
    { value: 'PATIENT', label: 'Pacientes', icon: <PersonOutlineIcon fontSize="small" />, count: stats.patients },
    { value: 'EQUIPMENT', label: 'Equipamentos', icon: <BuildOutlinedIcon fontSize="small" />, count: stats.equipment },
    { value: 'NONE', label: 'Sem vínculo', icon: <LinkOffOutlinedIcon fontSize="small" />, count: stats.unlinked },
  ];

  const filterCardSx = { borderRadius: 2 } as const;

  const categoryFiltersCard = (
    <Card variant="outlined" sx={filterCardSx}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
          Categorias
        </Typography>
        <List dense disablePadding sx={{ mt: 0.5 }}>
          <ListItemButton
            selected={categoryFilter === 'ALL'}
            onClick={() => setCategoryFilter('ALL')}
            sx={{ borderRadius: 1.5, mb: 0.25 }}
          >
            <ListItemText primary="Todas" />
            <Chip label={stats.total} size="small" variant="outlined" />
          </ListItemButton>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <ListItemButton
              key={cat.value}
              selected={categoryFilter === cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              sx={{ borderRadius: 1.5, mb: 0.25 }}
            >
              <ListItemText primary={cat.label} />
              <Chip
                label={stats.byCategory[cat.value] ?? 0}
                size="small"
                variant="outlined"
                sx={{ color: cat.color, borderColor: alpha(cat.color, 0.35) }}
              />
            </ListItemButton>
          ))}
          <ListItemButton
            selected={categoryFilter === '__none__'}
            onClick={() => setCategoryFilter('__none__')}
            sx={{ borderRadius: 1.5 }}
          >
            <ListItemText primary="Sem categoria" />
            <Chip label={stats.byCategory.__none__ ?? 0} size="small" variant="outlined" />
          </ListItemButton>
        </List>
      </CardContent>
    </Card>
  );

  const linkFiltersCard = (
    <Card variant="outlined" sx={filterCardSx}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
          Vínculo
        </Typography>
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {linkFilters.map((item) => (
            <ListItemButton
              key={item.value}
              selected={linkFilter === item.value}
              onClick={() => setLinkFilter(item.value)}
              sx={{ borderRadius: 1.5, mb: 0.25 }}
            >
              <Box sx={{ mr: 1.25, display: 'flex', color: 'text.secondary' }}>{item.icon}</Box>
              <ListItemText primary={item.label} />
              <Chip label={item.count} size="small" variant="outlined" />
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept={UPLOAD_ACCEPT}
        onChange={handleFileInputChange}
      />

      <PageHeader
        title="Documentos"
        subtitle="Contratos, certificados e arquivos da clínica"
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
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={triggerFilePicker}>
                Enviar arquivo
              </Button>
            )}
          </Stack>
        }
      />

      <AppGrid columns={{ xs: 2, md: 4 }} gap={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <StatMiniCard
          label="Armazenamento total"
          value={fmtStorageTotal(stats.totalBytes)}
          icon={<StorageOutlinedIcon fontSize="small" />}
          color="#00897B"
        />
        <StatMiniCard
          label="Total de documentos"
          value={stats.total}
          icon={<DescriptionOutlinedIcon fontSize="small" />}
          color="#0ABAB5"
        />
        <StatMiniCard
          label="Vinculados a pacientes"
          value={stats.patients}
          icon={<PersonOutlineIcon fontSize="small" />}
          color="#5C6BC0"
        />
        <StatMiniCard
          label="Vinculados a equipamentos"
          value={stats.equipment}
          icon={<BuildOutlinedIcon fontSize="small" />}
          color="#F57C00"
        />
      </AppGrid>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5, mb: 1 }}>
          {linkFilters.map((item) => (
            <Chip
              key={item.value}
              label={`${item.label} (${item.count})`}
              onClick={() => setLinkFilter(item.value)}
              color={linkFilter === item.value ? 'primary' : 'default'}
              variant={linkFilter === item.value ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          <Chip
            label="Todas"
            onClick={() => setCategoryFilter('ALL')}
            color={categoryFilter === 'ALL' ? 'primary' : 'default'}
            variant={categoryFilter === 'ALL' ? 'filled' : 'outlined'}
            sx={{ flexShrink: 0 }}
          />
          {DOCUMENT_CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              label={cat.label}
              onClick={() => setCategoryFilter(cat.value)}
              color={categoryFilter === cat.value ? 'primary' : 'default'}
              variant={categoryFilter === cat.value ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' },
          gap: { xs: 2, sm: 3 },
          alignItems: 'start',
        }}
      >
        <Stack spacing={2} sx={{ display: { xs: 'none', lg: 'flex' } }}>
          {categoryFiltersCard}
          {linkFiltersCard}
        </Stack>

        <Card sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, minWidth: 0 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <TextField
                size="small"
                placeholder="Buscar por nome, categoria, vínculo ou observação"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: '100%', sm: 360, md: 420 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {filteredDocs.length} de {docs.length}{' '}
                {filteredDocs.length === 1 ? 'documento' : 'documentos'}
              </Typography>
            </Stack>

            {isLoading || (isFetching && docs.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                Carregando documentos…
              </Typography>
            ) : filteredDocs.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                }}
              >
                <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {docs.length === 0 ? 'Nenhum documento cadastrado' : 'Nenhum documento encontrado'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: canCreate ? 2 : 0 }}>
                  {docs.length === 0
                    ? 'Envie arquivos para organizar os documentos da clínica.'
                    : 'Ajuste os filtros ou a busca para ver outros resultados.'}
                </Typography>
                {canCreate && docs.length === 0 && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={triggerFilePicker}>
                    Enviar arquivo
                  </Button>
                )}
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                    xl: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1.5,
                }}
              >
                {filteredDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    canDelete={canDelete}
                    onOpen={() => void handleOpenDocument(doc)}
                    onDelete={() => handleDelete(doc)}
                  />
                ))}
              </Box>
            )}
        </Card>
      </Box>

      {uploadFile && (
        <UploadDialog
          file={uploadFile}
          open={uploadOpen}
          onClose={handleUploadClose}
          onChangeFile={triggerFilePicker}
          onDocumentCreated={handleDocumentCreated}
        />
      )}
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Document"
        title="Documentos"
      />
    </Box>
  );
}

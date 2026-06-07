import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields } from '../utils/listFilters';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { documentsApi } from '../api/documents';
import { patientsApi } from '../api/patients';
import { equipmentApi } from '../api/equipment';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { DocumentFile } from '../types';

const categories = [
  { value: '', label: '—' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'vigilancia', label: 'Vigilância sanitária' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'livre', label: 'Outro' },
];

function fmtSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Dialog de Upload ───
function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);

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

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Selecione um arquivo.');
      return documentsApi.upload(file, {
        name: name || file.name,
        category: category || undefined,
        notes: notes || undefined,
        patientId: patientId || undefined,
        equipmentId: equipmentId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setFile(null);
      setName('');
      setCategory('');
      setNotes('');
      setPatientId(null);
      setEquipmentId(null);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Enviar documento
        {isMobile && (
          <IconButton onClick={onClose} edge="end"><CloseIcon /></IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileRef.current?.click()}
              fullWidth
            >
              {file ? file.name : 'Selecionar arquivo (máx 25MB)'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={7}>
            <TextField
              label="Nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              placeholder={file?.name}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              select
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
              size="small"
            >
              {categories.map((c) => (
                <MenuItem key={c.value || 'none'} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={patients}
              getOptionLabel={(p) => p.name}
              value={patients.find((p) => p.id === patientId) ?? null}
              onChange={(_, v) => setPatientId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Vincular a paciente" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={equipment}
              getOptionLabel={(e) => e.name}
              value={equipment.find((e) => e.id === equipmentId) ?? null}
              onChange={(_, v) => setEquipmentId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Vincular a equipamento" size="small" />}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observações"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Grid>
          {mutation.isError && (
            <Grid item xs={12}>
              <Alert severity="error">
                {(mutation.error as any)?.response?.data?.message ??
                  (mutation.error as any)?.message ??
                  'Erro no upload'}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5 }}>
        {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
        <Button
          variant="contained"
          disabled={!file || mutation.isPending}
          onClick={() => mutation.mutate()}
          fullWidth={isMobile}
        >
          {mutation.isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Dialog para vincular URL externa ───
function LinkUrlDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);

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

  const mutation = useMutation({
    mutationFn: () => {
      const url = fileUrl.trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('Informe uma URL válida (http ou https).');
      }
      if (!name.trim()) throw new Error('Nome é obrigatório.');
      return documentsApi.linkExternalFile({
        name: name.trim(),
        fileUrl: url,
        category: category || undefined,
        notes: notes || undefined,
        patientId: patientId || undefined,
        equipmentId: equipmentId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setName('');
      setFileUrl('');
      setCategory('');
      setNotes('');
      setPatientId(null);
      setEquipmentId(null);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Vincular URL externa
        {isMobile && (
          <IconButton onClick={onClose} edge="end"><CloseIcon /></IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              label="URL do arquivo"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://..."
              helperText="Cole o link público do documento"
            />
          </Grid>
          <Grid item xs={12} sm={7}>
            <TextField
              label="Nome do documento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              required
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              select
              label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
              size="small"
            >
              {categories.map((c) => (
                <MenuItem key={c.value || 'none'} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={patients}
              getOptionLabel={(p) => p.name}
              value={patients.find((p) => p.id === patientId) ?? null}
              onChange={(_, v) => setPatientId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Vincular a paciente" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={equipment}
              getOptionLabel={(e) => e.name}
              value={equipment.find((e) => e.id === equipmentId) ?? null}
              onChange={(_, v) => setEquipmentId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Vincular a equipamento" size="small" />}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observações"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Grid>
          {mutation.isError && (
            <Grid item xs={12}>
              <Alert severity="error">
                {(mutation.error as any)?.response?.data?.message ??
                  (mutation.error as any)?.message ??
                  'Erro ao vincular'}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5 }}>
        {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
        <Button
          variant="contained"
          disabled={!name.trim() || !fileUrl.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          fullWidth={isMobile}
        >
          {mutation.isPending ? 'Vinculando...' : 'Vincular'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Página principal ───
export function Documents() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('documents:create');
  const canDelete = has('documents:delete');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [linkFilter, setLinkFilter] = useState<'ALL' | 'PATIENT' | 'EQUIPMENT' | 'NONE'>('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const filteredDocs = useMemo(
    () =>
      docs.filter((d) => {
        if (categoryFilter !== 'ALL' && (d.category ?? '') !== categoryFilter) return false;
        if (linkFilter === 'PATIENT' && !d.patientId) return false;
        if (linkFilter === 'EQUIPMENT' && !d.equipmentId) return false;
        if (linkFilter === 'NONE' && (d.patientId || d.equipmentId)) return false;
        return matchFields(
          search,
          d.name,
          d.category,
          d.patient?.name,
          d.equipment?.name,
        );
      }),
    [docs, search, categoryFilter, linkFilter],
  );

  const columns: GridColDef<DocumentFile>[] = [
    { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
    {
      field: 'category',
      headerName: 'Categoria',
      flex: 0.6,
      minWidth: 130,
      renderCell: (p) =>
        p.row.category ? (
          <Chip size="small" label={p.row.category} variant="outlined" />
        ) : (
          <span>—</span>
        ),
    },
    {
      field: 'patient',
      headerName: 'Vínculo',
      flex: 0.9,
      minWidth: 160,
      valueGetter: (p) =>
        p.row.patient?.name ?? p.row.equipment?.name ?? '—',
    },
    {
      field: 'size',
      headerName: 'Tamanho',
      flex: 0.4,
      minWidth: 90,
      valueGetter: (p) => fmtSize(p.row.size),
    },
    {
      field: 'createdAt',
      headerName: 'Enviado em',
      flex: 0.5,
      minWidth: 130,
      valueGetter: (p) => dayjs(p.row.createdAt).format('DD/MM/YYYY HH:mm'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Ações',
      width: 150,
      getActions: (p) => {
        const actions = [];
        if (p.row.fileUrl) {
          actions.push(
            <GridActionsCellItem
              key="open"
              icon={
                <Tooltip title="Abrir arquivo">
                  <OpenInNewIcon fontSize="small" />
                </Tooltip>
              }
              label="Abrir"
              onClick={() => window.open(p.row.fileUrl, '_blank')}
            />,
          );
        }
        if (isAdmin) {
          actions.push(
            <GridActionsCellItem
              key="history"
              icon={
                <Tooltip title="Histórico de alterações">
                  <HistoryIcon fontSize="small" />
                </Tooltip>
              }
              label="Histórico"
              onClick={() => setAuditTarget({ id: p.row.id, name: p.row.name ?? '' })}
            />,
          );
        }
        if (canDelete) {
          actions.push(
            <GridActionsCellItem
              key="del"
              icon={
                <Tooltip title="Excluir">
                  <DeleteIcon fontSize="small" />
                </Tooltip>
              }
              label="Excluir"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Excluir documento',
                  message: `Excluir ${p.row.name}?`,
                  confirmLabel: 'Excluir',
                  confirmColor: 'error',
                });
                if (ok) deleteMutation.mutate(p.row.id);
              }}
            />,
          );
        }
        return actions;
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Documentos"
        subtitle="Contratos, certificados e arquivos"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canCreate && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={() => setLinkOpen(true)}
                >
                  Vincular URL
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => setUploadOpen(true)}
                >
                  Upload
                </Button>
              </>
            )}
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome, categoria ou vínculo"
          filteredCount={filteredDocs.length}
          totalCount={docs.length}
          countLabel={filteredDocs.length === 1 ? 'documento' : 'documentos'}
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
            {categories
              .filter((c) => c.value)
              .map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Vínculo"
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value as typeof linkFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="PATIENT">Paciente</MenuItem>
            <MenuItem value="EQUIPMENT">Equipamento</MenuItem>
            <MenuItem value="NONE">Sem vínculo</MenuItem>
          </TextField>
        </ListFiltersBar>
        <AppDataGrid
          rows={filteredDocs}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              docs.length === 0
                ? 'Nenhum documento cadastrado'
                : 'Nenhum documento encontrado com os filtros',
          }}
        />
      </Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <LinkUrlDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
      {auditTarget && (
        <AuditHistoryDialog
          open={!!auditTarget}
          onClose={() => setAuditTarget(null)}
          entity="Document"
          entityId={auditTarget.id}
          title={auditTarget.name}
        />
      )}
    </Box>
  );
}

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useMutation, useQuery } from '@tanstack/react-query';

import { documentsApi } from '../../api/documents';
import { documentTemplatesApi } from '../../api/documentTemplates';
import { patientsApi } from '../../api/patients';
import { equipmentApi } from '../../api/equipment';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { LabeledField } from '../LabeledField';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, documentFileIcon, fmtFileSize } from './documentUtils';
import type { DocumentFile, DocumentStatus } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

export const UPLOAD_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/*,text/plain,text/csv';

/** Mesmo limite do FileInterceptor em documents.controller.ts */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const DIALOG_MAX_WIDTH = 660;
const BLANK = '';

const GRID_2_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1.75,
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Documento em edição; ausente = novo documento */
  editing?: DocumentFile | null;
  onSaved: (doc: DocumentFile, created: boolean) => void;
}

export function DocumentFormDialog({ open, onClose, editing, onSaved }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editing;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [templateId, setTemplateId] = useState(BLANK);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<DocumentStatus>('SIGNED');
  const [notes, setNotes] = useState('');

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
  const { data: templates = [] } = useQuery({
    queryKey: ['document-templates'],
    queryFn: () => documentTemplatesApi.list(),
    enabled: open && !isEdit,
  });
  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const template = activeTemplates.find((t) => t.id === templateId) ?? null;
  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTemplateId(BLANK);
    setName(editing?.name ?? '');
    setCategory(editing?.category ?? '');
    setPatientId(editing?.patientId ?? null);
    setEquipmentId(editing?.equipmentId ?? null);
    setStatus(editing?.status ?? 'SIGNED');
    setNotes(editing?.notes ?? '');
  }, [open, editing]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const next = activeTemplates.find((t) => t.id === id);
    if (next) {
      setFile(null);
      if (next.category) setCategory(next.category);
      setStatus('PENDING');
    } else {
      setStatus('SIGNED');
    }
  };

  const selectFile = (selected: File | null | undefined) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      toast.error(`O arquivo tem ${fmtFileSize(selected.size)}; o limite é 25 MB.`);
      return;
    }
    // Só sobrescreve o nome se ainda for o nome do arquivo anterior (ou vazio)
    setName((prev) => (!prev.trim() || prev === file?.name ? selected.name : prev));
    setFile(selected);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return documentsApi.update(editing.id, {
          name: name.trim() || editing.name,
          category: category || null,
          notes: notes.trim() || null,
          patientId,
          equipmentId,
          status,
        });
      }
      const meta = {
        name: name.trim() || undefined,
        category: category || undefined,
        notes: notes.trim() || undefined,
        patientId: patientId || undefined,
        equipmentId: equipmentId || undefined,
        status,
      };
      if (template) return documentsApi.createFromTemplate(template.id, meta);
      if (!file) throw new Error('Anexe um arquivo ou escolha um modelo.');
      return documentsApi.upload(file, { ...meta, name: meta.name ?? file.name });
    },
    onSuccess: (saved) => {
      onSaved(saved, !editing);
      toast.success(editing ? 'Documento atualizado.' : 'Documento criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o documento.'));
    },
  });

  const canSubmit = isEdit || !!template || !!file;
  const isImage = !!file?.type.startsWith('image/');
  const { Icon, color } = documentFileIcon(file?.type);

  const nameField = (
    <LabeledField label="Nome do documento">
      <TextField
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={
          template
            ? `${template.name}${selectedPatient ? ` — ${selectedPatient.name}` : ''}`
            : 'Preenchido com o nome do arquivo'
        }
        fullWidth
      />
    </LabeledField>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...dialogPaperSx(isMobile),
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh', overflow: 'hidden' }),
        },
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept={UPLOAD_ACCEPT}
        onChange={(e) => {
          selectFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title={isEdit ? 'Editar documento' : 'Novo documento'}
        subtitle={isEdit ? editing.name : 'Gere a partir de um modelo ou anexe um arquivo'}
        subtitleTitle={isEdit ? editing.name : undefined}
        icon={isEdit ? <EditOutlinedIcon fontSize="small" /> : <UploadFileIcon fontSize="small" />}
      />

      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          '&.MuiDialogContent-root': { pt: { xs: 2.5, sm: 3 } },
        }}
      >
        <Stack spacing={2}>
          <Box sx={GRID_2_SX}>
            <LabeledField label="Tipo de documento">
              <TextField
                select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    Sem categoria
                  </Box>
                </MenuItem>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
            <LabeledField label="Paciente">
              <Autocomplete
                options={patients}
                getOptionLabel={(p) => p.name}
                value={selectedPatient}
                onChange={(_, v) => setPatientId(v?.id ?? null)}
                renderInput={(params) => <TextField {...params} placeholder="Buscar paciente..." />}
              />
            </LabeledField>
          </Box>

          {!isEdit && (
            <LabeledField label="Modelo">
              <TextField
                select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                fullWidth
                SelectProps={{ displayEmpty: true }}
                helperText={
                  template
                    ? 'O texto é gerado com os dados do paciente; depois de assinado, anexe a versão final na lista.'
                    : activeTemplates.length === 0
                      ? 'Nenhum modelo ativo — cadastre em “Modelos” na tela de documentos.'
                      : undefined
                }
              >
                <MenuItem value={BLANK}>Documento em branco — anexar arquivo</MenuItem>
                {activeTemplates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
          )}

          {!isEdit && template && (
            <Box
              sx={{
                p: 1.75,
                maxHeight: 180,
                overflow: 'auto',
                borderRadius: '14px',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
                fontSize: fontSizes.xs,
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}
            >
              {template.content}
            </Box>
          )}

          {!isEdit && !template && (file ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                p: 1.5,
                borderRadius: '14px',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
                minWidth: 0,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {isImage && previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  alt={file.name}
                  sx={{ width: 48, height: 48, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '10px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(color, 0.12),
                    color,
                  }}
                >
                  <Icon />
                </Box>
              )}
              <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                <Typography noWrap title={file.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
                  {file.name}
                </Typography>
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled' }}>
                  {fmtFileSize(file.size)}
                </Typography>
              </Box>
              {previewUrl && (
                <Tooltip title="Visualizar arquivo">
                  <IconButton
                    size="small"
                    component="a"
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'text.secondary' }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()} sx={{ flexShrink: 0 }}>
                Trocar
              </Button>
              <Tooltip title="Remover arquivo">
                <IconButton size="small" onClick={() => setFile(null)} sx={{ color: 'text.secondary' }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Box
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              sx={{
                border: '1.5px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: '14px',
                p: 3.25,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: (t) => (dragOver ? alpha(t.palette.primary.main, 0.06) : t.palette.grey[50]),
                transition: 'border-color .15s, background-color .15s',
                '&:hover, &:focus-visible': { borderColor: 'primary.main', outline: 'none' },
              }}
            >
              <FileUploadOutlinedIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.75 }} />
              <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>Anexar arquivo</Typography>
              <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', mt: 0.25 }}>
                Clique ou arraste · PDF, DOC, planilha ou imagem · até 25 MB
              </Typography>
            </Box>
          ))}

          {nameField}

          <Box sx={GRID_2_SX}>
            <LabeledField label="Equipamento">
              <Autocomplete
                options={equipment}
                getOptionLabel={(e) => e.name}
                value={equipment.find((e) => e.id === equipmentId) ?? null}
                onChange={(_, v) => setEquipmentId(v?.id ?? null)}
                renderInput={(params) => <TextField {...params} placeholder="Opcional" />}
              />
            </LabeledField>
            <LabeledField label="Status">
              <TextField
                select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                fullWidth
              >
                {DOCUMENT_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
          </Box>

          <LabeledField label="Observações">
            <TextField
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas (opcional)"
              multiline
              minRows={3}
              fullWidth
            />
          </LabeledField>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0, gap: 1 }}>
        {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
        <Button
          variant="contained"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
          fullWidth={isMobile}
        >
          {mutation.isPending
            ? 'Salvando...'
            : isEdit
              ? 'Salvar'
              : template
                ? 'Gerar documento'
                : 'Enviar documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

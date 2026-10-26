import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { patientsApi } from '../../api/patients';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { LabeledField } from '../LabeledField';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import type { PatientPhoto } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

interface Props {
  patientId: string;
  canEdit?: boolean;
  /** Somente leitura: esconde exclusão e usa onAddClick para "Adicionar". */
  readOnly?: boolean;
  /** Se definido, o botão "Adicionar" chama isto em vez de abrir a modal (ex.: ir à ficha estendida). */
  onAddClick?: () => void;
  /** Exibe o título "Fotos · antes e depois" (padrão true). */
  showTitle?: boolean;
}

interface PhotoGroup {
  key: string;
  label: string | null;
  takenAt: string;
  before?: PatientPhoto;
  after?: PatientPhoto;
}

interface PhotoPair {
  before: File | null;
  after: File | null;
}

const KIND_LABEL: Record<string, string> = {
  EVALUATION: 'Avaliação',
  PROCEDURE: 'Procedimento',
  RETURN: 'Retorno',
};

function PhotoSlot({
  photo,
  badge,
  tone,
  onDelete,
  canEdit,
}: {
  photo?: PatientPhoto;
  badge: string;
  tone: string;
  onDelete?: () => void;
  canEdit?: boolean;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(tone, 0.08),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover .photo-del, &:focus-within .photo-del': { opacity: 1 },
      }}
    >
      {photo?.url ? (
        <Box
          component="img"
          src={photo.url}
          alt={badge}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <ImageOutlinedIcon sx={{ fontSize: 40, color: tone, opacity: 0.5 }} />
      )}
      <Box
        component="span"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          fontSize: fontSizes['3xs'],
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#fff',
          bgcolor: 'rgba(15,28,26,0.65)',
          px: 1,
          py: 0.3,
          borderRadius: '7px',
        }}
      >
        {badge}
      </Box>
      {canEdit && photo && onDelete && (
        <IconButton
          className="photo-del"
          size="small"
          aria-label={`Excluir foto ${badge}`}
          onClick={onDelete}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            bgcolor: 'rgba(255,255,255,0.9)',
            color: 'error.main',
            opacity: 0,
            transition: 'opacity 0.12s',
            '&:hover': { bgcolor: '#fff' },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
}

export function PatientPhotosGallery({
  patientId,
  canEdit,
  readOnly,
  onAddClick,
  showTitle = true,
}: Props) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState('');
  const [pairs, setPairs] = useState<PhotoPair[]>([{ before: null, after: null }]);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['patient-photos', patientId],
    queryFn: () => patientsApi.listPhotos(patientId),
    enabled: !!patientId,
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.findOne(patientId),
    enabled: !!patientId && addOpen,
  });
  const appointments = patient?.appointments ?? [];

  const groups = useMemo<PhotoGroup[]>(() => {
    const map = new Map<string, PhotoGroup>();
    for (const p of photos) {
      const key = p.appointmentId || p.pairId || p.id;
      const proc =
        p.appointment?.procedure?.name ??
        (p.appointment?.kind ? KIND_LABEL[p.appointment.kind] : null) ??
        p.label ??
        'Atendimento';
      const when = p.appointment?.startAt ?? p.takenAt;
      const g = map.get(key) ?? { key, label: proc, takenAt: when, before: undefined, after: undefined };
      if (p.phase === 'BEFORE') g.before = p;
      else g.after = p;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => dayjs(b.takenAt).valueOf() - dayjs(a.takenAt).valueOf());
  }, [photos]);

  const resetForm = () => {
    setSelectedApptId('');
    setPairs([{ before: null, after: null }]);
  };

  const setPairFile = (index: number, phase: 'before' | 'after', file: File | null) => {
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [phase]: file } : p)));
  };
  const addPair = () => setPairs((prev) => [...prev, { before: null, after: null }]);
  const removePair = (index: number) =>
    setPairs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const hasAnyFile = pairs.some((p) => p.before || p.after);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const genId = () =>
        (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
        `${Date.now()}-${Math.random()}`;
      for (const pair of pairs) {
        if (!pair.before && !pair.after) continue;
        const meta = { appointmentId: selectedApptId, pairId: genId() };
        if (pair.before) await patientsApi.addPhoto(patientId, pair.before, { phase: 'BEFORE', ...meta });
        if (pair.after) await patientsApi.addPhoto(patientId, pair.after, { phase: 'AFTER', ...meta });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-photos', patientId] });
      toast.success('Fotos adicionadas.');
      setAddOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível enviar as fotos.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => patientsApi.removePhoto2(patientId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-photos', patientId] });
      toast.success('Foto removida.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível remover a foto.')),
  });

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={showTitle ? 'space-between' : 'flex-end'}
        sx={{ mb: 2 }}
      >
        {showTitle && (
          <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>Fotos · antes e depois</Typography>
        )}
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => (onAddClick ? onAddClick() : setAddOpen(true))}
            sx={{
              borderRadius: '10px',
              bgcolor: 'background.paper',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' },
            }}
          >
            Adicionar
          </Button>
        )}
      </Stack>

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={26} />
        </Stack>
      ) : groups.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: 'center' }}>
          <PhotoCameraOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary' }}>
            Nenhuma foto registrada ainda.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {groups.map((g) => (
            <Box key={g.key}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>
                  {g.label || 'Registro'}
                </Typography>
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                  {dayjs(g.takenAt).format('DD/MM/YYYY')}
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <PhotoSlot
                  photo={g.before}
                  badge="ANTES"
                  tone="#5BA8DE"
                  canEdit={canEdit && !readOnly}
                  onDelete={g.before ? () => deleteMutation.mutate(g.before!.id) : undefined}
                />
                <PhotoSlot
                  photo={g.after}
                  badge="DEPOIS"
                  tone="#15998B"
                  canEdit={canEdit && !readOnly}
                  onDelete={g.after ? () => deleteMutation.mutate(g.after!.id) : undefined}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: (t) => t.zIndex.modal + 2 }}
        PaperProps={{ sx: dialogPaperSx(false) }}
      >
        <DialogHeader
          onClose={() => setAddOpen(false)}
          title="Adicionar fotos"
          subtitle="Registre o antes e o depois do procedimento"
          subtitleWrap
          icon={<PhotoCameraOutlinedIcon fontSize="small" />}
        />
        <DialogContent sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <LabeledField label="Atendimento" required>
              <TextField
                select
                value={selectedApptId}
                onChange={(e) => setSelectedApptId(e.target.value)}
                fullWidth
                size="small"
                SelectProps={{
                  displayEmpty: true,
                  MenuProps: { sx: { zIndex: (t) => t.zIndex.modal + 3 } },
                  renderValue: (val) => {
                    const a = appointments.find((ap) => ap.id === val);
                    return a ? (
                      `${dayjs(a.startAt).format('DD/MM/YYYY')} · ${a.procedure?.name ?? 'Atendimento'}`
                    ) : (
                      <Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>
                        Selecione o atendimento
                      </Typography>
                    );
                  },
                }}
              >
                {appointments.length === 0 ? (
                  <MenuItem value="" disabled>
                    Nenhum atendimento registrado
                  </MenuItem>
                ) : (
                  appointments.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {dayjs(a.startAt).format('DD/MM/YYYY')} · {a.procedure?.name ?? 'Atendimento'}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </LabeledField>
            {pairs.map((pair, index) => (
              <Box key={index}>
                {pairs.length > 1 && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.secondary' }}>
                      Par {index + 1}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                      onClick={() => removePair(index)}
                      sx={{ fontSize: fontSizes.xs, color: 'text.secondary', minWidth: 0 }}
                    >
                      Remover
                    </Button>
                  </Stack>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {(
                    [
                      { phase: 'before', label: 'ANTES', placeholder: 'Foto de antes', tone: '#5BA8DE', file: pair.before },
                      { phase: 'after', label: 'DEPOIS', placeholder: 'Foto de depois', tone: '#15998B', file: pair.after },
                    ] as const
                  ).map((z) => (
                    <Box key={z.phase}>
                      <Typography
                        sx={{ fontSize: fontSizes['2xs'], fontWeight: 800, letterSpacing: '0.04em', color: z.tone, mb: 0.75 }}
                      >
                        {z.label}
                      </Typography>
                      <Box
                        component="label"
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          aspectRatio: '4 / 3',
                          borderRadius: '12px',
                          border: '1.5px dashed',
                          borderColor: z.file ? z.tone : 'divider',
                          bgcolor: (t) => alpha(z.tone, z.file ? 0.08 : 0.03),
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textAlign: 'center',
                          px: 1,
                        }}
                      >
                        <input
                          type="file"
                          hidden
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            setPairFile(index, z.phase, f);
                          }}
                        />
                        {z.file ? (
                          <>
                            <Box
                              component="img"
                              src={URL.createObjectURL(z.file)}
                              alt={z.label}
                              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <IconButton
                              size="small"
                              aria-label={`Remover foto ${z.label}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPairFile(index, z.phase, null);
                              }}
                              sx={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 24,
                                height: 24,
                                bgcolor: 'rgba(255,255,255,0.92)',
                                color: 'error.main',
                                '&:hover': { bgcolor: '#fff' },
                              }}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <ImageOutlinedIcon sx={{ fontSize: 30, color: z.tone, opacity: 0.75 }} />
                            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.secondary' }}>
                              {z.placeholder}
                            </Typography>
                            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled' }}>
                              ou{' '}
                              <Box component="span" sx={{ color: z.tone, textDecoration: 'underline' }}>
                                procurar arquivos
                              </Box>
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}

            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={addPair}
              sx={{
                borderRadius: '12px',
                border: '1.5px dashed',
                borderColor: 'divider',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                color: 'primary.main',
                fontWeight: 700,
                py: 1.25,
                '&:hover': {
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                  borderColor: 'primary.main',
                },
              }}
            >
              Adicionar par de fotos
            </Button>

            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 1.5 }}>
              Cada par antes/depois fica vinculado ao mesmo ponto do procedimento e visível junto na aba
              Fotos da ficha.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsBorderSx}>
          <Button
            variant="outlined"
            onClick={() => setAddOpen(false)}
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!selectedApptId || !hasAnyFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
            sx={{ boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
          >
            {uploadMutation.isPending ? 'Enviando…' : 'Salvar fotos'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

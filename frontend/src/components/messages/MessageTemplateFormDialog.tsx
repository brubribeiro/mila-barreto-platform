import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
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
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { messagesApi, MessageTemplatePayload } from '../../api/messages';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { categoryOptions, TEMPLATE_VARIABLES } from './messageTemplateConstants';
import { WHATSAPP_EMOJI_GROUPS } from './whatsappTemplateEmojis';
import { WhatsAppPreview } from './WhatsAppPreview';
import type { MessageTemplate, Procedure } from '../../types';

interface MessageTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  template?: MessageTemplate | null;
  procedures: Procedure[];
}

interface FormValues {
  name: string;
  category: string;
  content: string;
  procedureId: string;
}

const empty: FormValues = { name: '', category: '', content: '', procedureId: '' };

const DIALOG_MAX_WIDTH = 980;
const DIALOG_HEIGHT_DESKTOP = 800;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
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

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <SectionIcon>{icon}</SectionIcon>
      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
        {title}
      </Typography>
    </Stack>
  );
}

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ width: 320, p: 1 }}>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, overflowX: 'auto' }}>
        {WHATSAPP_EMOJI_GROUPS.map((group, index) => (
          <Chip
            key={group.label}
            label={group.label}
            size="small"
            variant={tab === index ? 'filled' : 'outlined'}
            onClick={() => setTab(index)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, maxHeight: 200, overflowY: 'auto' }}>
        {WHATSAPP_EMOJI_GROUPS[tab].emojis.map((emoji) => (
          <Box
            key={emoji}
            onClick={() => onSelect(emoji)}
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
            {emoji}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function MessageTemplateFormDialog({
  open,
  onClose,
  template,
  procedures,
}: MessageTemplateFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm<FormValues>({
    defaultValues: empty,
  });

  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  const category = watch('category');
  const content = watch('content');
  const procedureId = watch('procedureId');
  const selectedProcedure = procedures.find((p) => p.id === procedureId) ?? null;
  const categoryLabel =
    categoryOptions.find((option) => option.value === category)?.label ?? undefined;

  useEffect(() => {
    if (!open) return;
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
  }, [open, template, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: MessageTemplatePayload = {
        name: values.name.trim(),
        content: values.content.trim(),
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
      setValue('content', next, { shouldDirty: true });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + text.length, start + text.length);
      });
    } else {
      setValue('content', current + text, { shouldDirty: true });
    }
  };

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
            : {
                maxWidth: DIALOG_MAX_WIDTH,
                height: DIALOG_HEIGHT_DESKTOP,
                maxHeight: '94vh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          ...(isMobile ? { height: '100%' } : {}),
        }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={template ? 'Editar template' : 'Novo template de mensagem'}
          subtitle={
            template
              ? `${template.name}${categoryLabel ? ` · ${categoryLabel}` : ''}`
              : 'Nome, categoria e conteúdo da mensagem'
          }
          icon={
            template ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <NoteAddOutlinedIcon fontSize="small" />
            )
          }
        />

        <DialogContent
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação" />
                <Stack spacing={2}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Nome é obrigatório' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Nome do template"
                        fullWidth
                        required
                        autoFocus={!template}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Categoria" fullWidth>
                        {categoryOptions.map((option) => (
                          <MenuItem key={option.value || 'none'} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  {category === 'promocao' && (
                    <Controller
                      name="procedureId"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="Procedimento vinculado" fullWidth>
                          <MenuItem value="">Nenhum</MenuItem>
                          {procedures.map((procedure) => (
                            <MenuItem key={procedure.id} value={procedure.id}>
                              {procedure.name} — {brl.format(Number(procedure.price))}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    A categoria ajuda a filtrar e sugerir o template certo ao enviar mensagens pelo
                    WhatsApp.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<ChatOutlinedIcon fontSize="small" />} title="Conteúdo" />
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Variáveis disponíveis · emojis compatíveis com WhatsApp
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <Chip
                          key={variable}
                          label={variable}
                          size="small"
                          variant="outlined"
                          onClick={() => insertAtCursor(variable)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                      <Tooltip title="Inserir emoji compatível com WhatsApp">
                        <IconButton size="small" onClick={(event) => setEmojiAnchor(event.currentTarget)}>
                          <EmojiEmotionsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
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
                    rules={{ required: 'Conteúdo é obrigatório' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        inputRef={contentRef}
                        label="Conteúdo da mensagem"
                        fullWidth
                        multiline
                        minRows={6}
                        maxRows={12}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ??
                          'Clique nas variáveis acima para inserir no texto'
                        }
                      />
                    )}
                  />
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ ...FORM_CARD_SX, height: 'auto' }}>
                <SectionTitle icon={<VisibilityOutlinedIcon fontSize="small" />} title="Preview" />
                <WhatsAppPreview
                  content={content}
                  category={category || undefined}
                  procedure={selectedProcedure}
                />
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar template'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : template ? 'Salvar' : 'Criar template'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

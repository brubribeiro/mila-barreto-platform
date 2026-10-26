import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { messagesApi, MessageTemplatePayload } from '../../api/messages';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { LabeledField } from '../LabeledField';
import {
  messageCategoryOptions,
  messageTriggerOptions,
  TEMPLATE_VARIABLES,
} from './messageTemplateConstants';
import { usePlatformCatalog } from '../../hooks/usePlatformCatalog';
import { WHATSAPP_EMOJI_GROUPS } from './whatsappTemplateEmojis';
import { VariableChip } from './VariableChip';
import type { MessageTemplate, MessageTrigger, Procedure } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { clickableProps } from '../../utils/a11y';

interface MessageTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  template?: MessageTemplate | null;
  procedures: Procedure[];
  onSaved?: (template: MessageTemplate) => void;
}

interface FormValues {
  name: string;
  trigger: MessageTrigger;
  content: string;
  category: string;
  procedureId: string;
  active: boolean;
}

const empty: FormValues = {
  name: '',
  trigger: 'ON_BOOKING',
  content: '',
  category: '',
  procedureId: '',
  active: true,
};

const DIALOG_MAX_WIDTH = 580;

const TWO_COLUMNS_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1.75,
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
            aria-pressed={tab === index}
            onClick={() => setTab(index)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, maxHeight: 200, overflowY: 'auto' }}>
        {WHATSAPP_EMOJI_GROUPS[tab].emojis.map((emoji) => (
          <Box
            key={emoji}
            {...clickableProps(() => onSelect(emoji))}
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
  onSaved,
}: MessageTemplateFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  usePlatformCatalog('message_category');
  usePlatformCatalog('message_trigger');
  const categoryOptions = messageCategoryOptions();
  const triggerOptions = messageTriggerOptions();
  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm<FormValues>({
    defaultValues: empty,
  });

  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  const category = watch('category');

  useEffect(() => {
    if (!open) return;
    reset(
      template
        ? {
            name: template.name,
            trigger: template.trigger,
            content: template.content,
            category: template.category ?? '',
            procedureId: template.procedureId ?? '',
            active: template.active,
          }
        : empty,
    );
  }, [open, template, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: MessageTemplatePayload = {
        name: values.name.trim(),
        trigger: values.trigger,
        content: values.content.trim(),
        category: values.category || null,
        procedureId: values.category === 'promocao' && values.procedureId ? values.procedureId : null,
        active: values.active,
      };
      return template ? messagesApi.update(template.id, payload) : messagesApi.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success(template ? 'Modelo atualizado.' : 'Modelo criado.');
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o modelo.'));
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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh' }),
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={template ? 'Editar modelo de mensagem' : 'Novo modelo de mensagem'}
          subtitle={template ? template.name : 'Personalize uma mensagem do WhatsApp'}
          icon={template ? <EditOutlinedIcon fontSize="small" /> : <WhatsAppIcon fontSize="small" />}
        />

        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: 'background.paper',
            '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
          }}
        >
          <Stack spacing={2}>
            <Box sx={TWO_COLUMNS_SX}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Título é obrigatório' }}
                render={({ field, fieldState }) => (
                  <LabeledField label="Título do modelo" required>
                    <TextField
                      {...field}
                      fullWidth
                      autoFocus={!template}
                      placeholder="Ex.: Lembrete 24h"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  </LabeledField>
                )}
              />
              <Controller
                name="trigger"
                control={control}
                render={({ field }) => (
                  <LabeledField label="Gatilho de envio">
                    <TextField {...field} select fullWidth>
                      {triggerOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </LabeledField>
                )}
              />
            </Box>

            <Controller
              name="content"
              control={control}
              rules={{ required: 'Mensagem é obrigatória' }}
              render={({ field, fieldState }) => (
                <LabeledField
                  label="Mensagem"
                  required
                  action={
                    <Tooltip title="Inserir emoji compatível com WhatsApp">
                      <IconButton
                        aria-label="Inserir emoji"
                        size="small"
                        onClick={(event) => setEmojiAnchor(event.currentTarget)}
                        sx={{ p: 0.25, color: 'text.secondary' }}
                      >
                        <EmojiEmotionsOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <TextField
                    {...field}
                    inputRef={contentRef}
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={12}
                    placeholder="Escreva a mensagem usando as variáveis abaixo..."
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                </LabeledField>
              )}
            />
            <Popover
              open={!!emojiAnchor}
              anchorEl={emojiAnchor}
              onClose={() => setEmojiAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <EmojiPicker
                onSelect={(emoji) => {
                  insertAtCursor(emoji);
                  setEmojiAnchor(null);
                }}
              />
            </Popover>

            <Box>
              <Typography
                sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.secondary', mb: 1.125 }}
              >
                Inserir variável
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.875 }}>
                {TEMPLATE_VARIABLES.map((variable) => (
                  <VariableChip key={variable} label={variable} onClick={() => insertAtCursor(variable)} />
                ))}
              </Stack>
            </Box>

            <Box sx={TWO_COLUMNS_SX}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <LabeledField label="Categoria">
                    <TextField {...field} select fullWidth>
                      {categoryOptions.map((option) => (
                        <MenuItem key={option.value || 'none'} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </LabeledField>
                )}
              />
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <LabeledField label="Status">
                    <TextField
                      select
                      fullWidth
                      value={field.value ? 'active' : 'inactive'}
                      onChange={(e) => field.onChange(e.target.value === 'active')}
                    >
                      <MenuItem value="active">Ativa</MenuItem>
                      <MenuItem value="inactive">Inativa</MenuItem>
                    </TextField>
                  </LabeledField>
                )}
              />
            </Box>

            {category === 'promocao' && (
              <Controller
                name="procedureId"
                control={control}
                render={({ field }) => (
                  <LabeledField label="Procedimento vinculado">
                    <TextField {...field} select fullWidth>
                      <MenuItem value="">Nenhum</MenuItem>
                      {procedures.map((procedure) => (
                        <MenuItem key={procedure.id} value={procedure.id}>
                          {procedure.name} — {brl.format(Number(procedure.price))}
                        </MenuItem>
                      ))}
                    </TextField>
                  </LabeledField>
                )}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar modelo'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

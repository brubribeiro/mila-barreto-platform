import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';

import { assistantApi, type AssistantAnswer } from '../../api/assistant';
import { getApiErrorMessage } from '../../utils/apiError';
import { AuroraIcon } from '../AuroraIcon';
import { DialogCloseButton, DialogHeaderIcon } from '../DialogCloseButton';
import { FeedbackReportDialog } from '../feedback/FeedbackReportDialog';

const DRAWER_WIDTH = 440;

type ChatEntry =
  | { role: 'user'; text: string }
  | { role: 'assistant'; reply: AssistantAnswer }
  | { role: 'error'; text: string };
type ChatMessage = ChatEntry & { id: number };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Perguntas de exemplo exibidas antes da primeira pergunta. */
  suggestions: string[];
  /** Painel da clínica: oferece o Feedback quando a documentação não cobre a dúvida. */
  canSendFeedback?: boolean;
}

/** Chat de ajuda que responde só com trechos da documentação da plataforma, citando a fonte. */
export function AssistantDrawer({ open, onClose, suggestions, canSendFeedback = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const nextId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const push = (entry: ChatEntry) => setMessages((prev) => [...prev, { ...entry, id: nextId.current++ }]);

  const ask = useMutation({
    mutationFn: assistantApi.ask,
    onSuccess: (reply) => push({ role: 'assistant', reply }),
    onError: (err) => push({ role: 'error', text: getApiErrorMessage(err, 'Não foi possível consultar o assistente.') }),
  });

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, ask.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || ask.isPending) return;
    push({ role: 'user', text: trimmed });
    setQuestion('');
    ask.mutate(trimmed);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(question);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          role: 'dialog',
          'aria-label': 'Assistente',
          sx: { width: { xs: '100%', sm: DRAWER_WIDTH }, display: 'flex', flexDirection: 'column' },
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <DialogHeaderIcon>
            <AuroraIcon name="assistant" size={20} strokeWidth={1.8} />
          </DialogHeaderIcon>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" fontWeight={800} sx={{ fontSize: '1.0625rem', letterSpacing: '-0.3px' }}>
              Assistente
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Responde com base na documentação da plataforma
            </Typography>
          </Box>
          <DialogCloseButton onClose={onClose} aria-label="Fechar assistente" />
        </Stack>

        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }} aria-live="polite">
          {messages.length === 0 && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Pergunte sobre as telas e funcionalidades da plataforma. As respostas vêm só da documentação, com a
                fonte de cada trecho — sem acesso a dados de pacientes ou da agenda.
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {suggestions.map((s) => (
                  <Chip key={s} label={s} variant="outlined" onClick={() => send(s)} sx={{ fontWeight: 600 }} />
                ))}
              </Stack>
            </Stack>
          )}

          <Stack spacing={1.5}>
            {messages.map((m) => {
              if (m.role === 'user') {
                return (
                  <Box
                    key={m.id}
                    sx={{
                      alignSelf: 'flex-end',
                      maxWidth: '85%',
                      px: 1.75,
                      py: 1,
                      borderRadius: '14px 14px 4px 14px',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.text}
                    </Typography>
                  </Box>
                );
              }
              if (m.role === 'error') {
                return (
                  <Typography key={m.id} variant="body2" color="error.main">
                    {m.text}
                  </Typography>
                );
              }
              return (
                <AssistantReply
                  key={m.id}
                  reply={m.reply}
                  onOpenFeedback={canSendFeedback ? () => setFeedbackOpen(true) : undefined}
                />
              );
            })}
            {ask.isPending && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Procurando na documentação…</Typography>
              </Stack>
            )}
          </Stack>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}
        >
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={4}
            placeholder="Ex.: como ativo o modo escuro?"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(question);
              }
            }}
            inputProps={{ 'aria-label': 'Pergunta para o assistente' }}
          />
          <IconButton
            type="submit"
            aria-label="Enviar pergunta"
            disabled={question.trim().length < 2 || ask.isPending}
            sx={{
              alignSelf: 'flex-end',
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <AuroraIcon name="chevronRight" size={20} strokeWidth={2.2} />
          </IconButton>
        </Box>
      </Drawer>

      {canSendFeedback && <FeedbackReportDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}

function AssistantReply({ reply, onOpenFeedback }: { reply: AssistantAnswer; onOpenFeedback?: () => void }) {
  return (
    <Stack spacing={1} sx={{ alignSelf: 'flex-start', width: '100%' }}>
      <Typography variant="body2" fontWeight={600}>
        {reply.answer}
      </Typography>
      {reply.sources.map((source, i) => (
        <Box
          key={i}
          sx={{
            p: 1.5,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {source.excerpt}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>
            Fonte: {source.file}
            {source.section ? ` › ${source.section}` : ''}
          </Typography>
        </Box>
      ))}
      {!reply.covered && onOpenFeedback && (
        <Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AuroraIcon name="feedback" size={16} />}
            onClick={onOpenFeedback}
          >
            Enviar feedback
          </Button>
        </Box>
      )}
    </Stack>
  );
}

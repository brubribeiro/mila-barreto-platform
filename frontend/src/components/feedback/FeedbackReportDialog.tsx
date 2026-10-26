import { useEffect, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { feedbackApi } from '../../api/feedback';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { FeedbackType } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'type' | 'form';

const TYPE_OPTIONS: {
  type: FeedbackType;
  title: string;
  description: string;
  icon: typeof BugReportOutlinedIcon;
  tone: 'error' | 'primary';
}[] = [
  {
    type: 'SUGGESTION',
    title: 'Sugestão de melhoria',
    description: 'Ideia para deixar o painel melhor ou mais fácil de usar',
    icon: LightbulbOutlinedIcon,
    tone: 'primary',
  },
  {
    type: 'BUG',
    title: 'Bug',
    description: 'Algo não funcionou como esperado ou quebrou na tela',
    icon: BugReportOutlinedIcon,
    tone: 'error',
  },
];

export function FeedbackReportDialog({ open, onClose }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const toast = useAppToast();

  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('type');
    setType(null);
    setTitle('');
    setDescription('');
    setTitleError('');
    setDescriptionError('');
  }, [open]);

  const createMutation = useMutation({
    mutationFn: feedbackApi.create,
    onSuccess: () => {
      toast.success('Obrigada! Seu feedback foi enviado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível enviar o feedback.'));
    },
  });

  const selectedOption = TYPE_OPTIONS.find((o) => o.type === type);

  const handleSelectType = (next: FeedbackType) => {
    setType(next);
    setStep('form');
  };

  const handleBack = () => {
    setStep('type');
    setTitleError('');
    setDescriptionError('');
  };

  const handleSubmit = () => {
    let valid = true;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3) {
      setTitleError('Informe um título com pelo menos 3 caracteres');
      valid = false;
    } else {
      setTitleError('');
    }

    if (trimmedDescription.length < 10) {
      setDescriptionError('Descreva com pelo menos 10 caracteres');
      valid = false;
    } else {
      setDescriptionError('');
    }

    if (!valid || !type) return;

    createMutation.mutate({
      type,
      title: trimmedTitle,
      description: trimmedDescription,
      pageUrl: `${location.pathname}${location.search}`,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={createMutation.isPending ? undefined : onClose}
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
                maxWidth: 560,
                maxHeight: '94dvh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title={step === 'type' ? 'Enviar feedback' : selectedOption?.title ?? 'Enviar feedback'}
        subtitle={
          step === 'type'
            ? 'Escolha o tipo de report para continuar'
            : 'Conte o que aconteceu ou o que você gostaria de ver'
        }
        icon={<FeedbackOutlinedIcon fontSize="small" />}
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
        {step === 'type' ? (
          <Stack spacing={1.5}>
            {TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const paletteKey = option.tone === 'error' ? 'error' : 'primary';
              return (
                <Box
                  key={option.type}
                  component="button"
                  type="button"
                  onClick={() => handleSelectType(option.type)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    width: '100%',
                    textAlign: 'left',
                    p: 2,
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    transition: 'border-color .15s, box-shadow .15s, background-color .15s',
                    '&:hover': {
                      borderColor: `${paletteKey}.main`,
                      bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.04),
                      boxShadow: '0 4px 14px rgba(15, 40, 36, 0.06)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: (t) => alpha(t.palette[paletteKey].main, 0.12),
                      color: `${paletteKey}.main`,
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box sx={{ minWidth: 0, pt: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: fontSizes.md, lineHeight: 1.25 }}>
                      {option.title}
                    </Typography>
                    <Typography
                      sx={{ mt: 0.5, fontSize: fontSizes.sm, color: 'text.secondary', lineHeight: 1.4 }}
                    >
                      {option.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!titleError}
              helperText={titleError || 'Resumo curto do problema ou da ideia'}
              fullWidth
              required
              autoFocus
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!descriptionError}
              helperText={
                descriptionError ||
                'Detalhe o contexto, os passos e o que você esperava. A página atual será anexada automaticamente.'
              }
              fullWidth
              required
              multiline
              minRows={isMobile ? 5 : 6}
              inputProps={{ maxLength: 5000 }}
            />
            <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
              Página atual: {location.pathname}
              {location.search}
            </Alert>
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          ...dialogActionsBorderSx,
          flexShrink: 0,
          justifyContent: step === 'form' ? 'space-between' : 'flex-end',
        }}
      >
        {step === 'form' ? (
          <>
            <Button
              type="button"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              disabled={createMutation.isPending}
            >
              Voltar
            </Button>
            <Stack direction="row" spacing={1}>
              <Button type="button" onClick={onClose} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </Stack>
          </>
        ) : (
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

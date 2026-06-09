import { Box, Paper, Stack, Typography } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import dayjs from 'dayjs';

import type { Procedure } from '../../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface WhatsAppPreviewProps {
  content: string;
  category?: string;
  procedure?: Procedure | null;
}

export function WhatsAppPreview({ content, category, procedure }: WhatsAppPreviewProps) {
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
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23c7bfb5\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E")',
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

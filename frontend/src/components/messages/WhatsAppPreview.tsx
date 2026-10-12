import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';

import type { MessageTemplate } from '../../types';
import { fontSizes } from '../../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface WhatsAppPreviewProps {
  content: string;
  category?: string | null;
  procedure?: MessageTemplate['procedure'];
}

/** Balão de conversa do WhatsApp; as variáveis ({nome}, {data}...) ficam destacadas. */
export function WhatsAppPreview({ content, category, procedure }: WhatsAppPreviewProps) {
  const parts = content.split(/(\{\w+\})/g);

  return (
    <Box
      sx={{
        borderRadius: '16px',
        px: 2.25,
        py: 2.75,
        bgcolor: '#E5DDD3',
        backgroundImage: 'radial-gradient(rgba(0,0,0,.04) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        minHeight: 170,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <Box
        sx={{
          alignSelf: 'flex-start',
          maxWidth: '88%',
          bgcolor: '#fff',
          borderRadius: '3px 14px 14px 14px',
          px: 1.875,
          py: 1.5,
          boxShadow: '0 1px 1px rgba(0,0,0,.14)',
        }}
      >
        {category === 'promocao' && procedure && (
          <Box
            sx={{
              bgcolor: 'rgba(37,211,102,.13)',
              borderRadius: '8px',
              px: 1,
              py: 0.5,
              mb: 1,
              display: 'inline-block',
            }}
          >
            <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: '#1DAE53' }}>
              ✨ PROMOÇÃO — {procedure.name} · {brl.format(Number(procedure.price))}
            </Typography>
          </Box>
        )}
        <Typography
          component="div"
          sx={{
            fontSize: fontSizes.md,
            lineHeight: 1.5,
            color: '#0F1C1A',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content.trim() ? (
            parts.map((part, i) =>
              /^\{\w+\}$/.test(part) ? (
                <Box key={i} component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {part}
                </Box>
              ) : (
                part
              ),
            )
          ) : (
            <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
              Escreva a mensagem para ver a prévia...
            </Box>
          )}
        </Typography>
        <Typography sx={{ textAlign: 'right', fontSize: fontSizes['3xs'], color: '#9AA8A4', mt: 0.625 }}>
          {dayjs().format('HH:mm')} ✓✓
        </Typography>
      </Box>
    </Box>
  );
}

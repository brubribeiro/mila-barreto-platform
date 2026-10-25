import { IconButton, Tooltip } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { onlyDigits } from '../../utils/masks';

type ButtonSx = { borderRadius: string; flexShrink?: number; bgcolor?: string };

export function PatientWhatsAppButton({ phone, name, sx }: { phone: string; name: string; sx: ButtonSx }) {
  return (
    <Tooltip title="WhatsApp">
      <IconButton
        aria-label={`Abrir WhatsApp de ${name}`}
        onClick={() => window.open(`https://wa.me/55${onlyDigits(phone)}`, '_blank', 'noopener')}
        sx={{
          width: 38,
          height: 38,
          border: 1,
          borderColor: 'divider',
          color: '#1DAE53',
          ...sx,
        }}
      >
        <WhatsAppIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

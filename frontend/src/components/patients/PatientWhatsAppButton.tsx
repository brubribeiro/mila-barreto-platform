import { IconButton, Tooltip } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { onlyDigits } from '../../utils/masks';

type ButtonSx = { borderRadius: string; flexShrink?: number; bgcolor?: string };

export function PatientWhatsAppButton({ phone, sx }: { phone: string; sx: ButtonSx }) {
  return (
    <Tooltip title="WhatsApp">
      <IconButton
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

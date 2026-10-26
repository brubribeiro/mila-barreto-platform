import { Box, ButtonBase, Stack, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import { ICON as SKIN_ICON, Svg as SkinSvg } from '../skincare/skincareUi';

/** Atalho para a anamnese de pele (rotina de skincare) da paciente do agendamento. */
export function SkinAnamnesisShortcut({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.25,
        px: 1.9,
        py: 1.6,
        borderRadius: '13px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        width: '100%',
        textAlign: 'left',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.4} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            bgcolor: 'grey.50',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SkinSvg d={SKIN_ICON.drop} size={18} stroke={1.8} />
        </Box>
        <Box sx={{ lineHeight: 1.25, minWidth: 0 }}>
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800 }}>Anamnese de pele</Typography>
          <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary' }}>
            Gerar rotina de skincare personalizada
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>
        <SkinSvg d={SKIN_ICON.next} size={18} stroke={2.2} />
      </Box>
    </ButtonBase>
  );
}

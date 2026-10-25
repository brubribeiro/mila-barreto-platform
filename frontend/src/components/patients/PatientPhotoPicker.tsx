import { useRef, type ChangeEvent } from 'react';
import { Avatar, Box, IconButton, Stack, Tooltip, Typography, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';

import { fontSizes } from '../../theme/fontSizes';
import { PATIENT_PHOTO_ACCEPT, patientInitials } from '../../utils/patientPhoto';

/** Avatar clicável do formulário de paciente: escolher, trocar ou remover a foto. */
export function PatientPhotoPicker({
  src,
  name,
  error,
  disabled,
  onSelect,
  onRemove,
}: {
  src?: string;
  name: string;
  error: string | null;
  disabled: boolean;
  onSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <Stack alignItems="center" spacing={0.75}>
      <input
        ref={photoInputRef}
        type="file"
        hidden
        accept={PATIENT_PHOTO_ACCEPT}
        onChange={onSelect}
      />
      <Box sx={{ position: 'relative', lineHeight: 0 }}>
        <Tooltip
          title={
            <Typography variant="caption" display="block" sx={{ maxWidth: 200 }}>
              {src ? 'Alterar foto' : 'Adicionar foto'}
              <br />
              JPEG, PNG ou WebP — máx. 5 MB
            </Typography>
          }
          arrow
          placement="top"
        >
          <Box
            component="button"
            type="button"
            disabled={disabled}
            aria-label={src ? 'Alterar foto do paciente' : 'Adicionar foto do paciente'}
            onClick={() => photoInputRef.current?.click()}
            sx={{
              position: 'relative',
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              borderRadius: '50%',
              cursor: disabled ? 'default' : 'pointer',
              lineHeight: 0,
              '&:hover .patient-photo-overlay': { opacity: 1 },
              '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            <Avatar
              src={src}
              alt={name || 'Paciente'}
              sx={{
                width: 72,
                height: 72,
                fontSize: fontSizes['3xl'],
                fontWeight: 700,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: 'primary.dark',
                border: 1,
                borderColor: 'divider',
              }}
            >
              {patientInitials(name || '?')}
            </Avatar>
            <Box
              className="patient-photo-overlay"
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => alpha(t.palette.common.black, 0.45),
                color: 'common.white',
                opacity: src ? 0 : 0.85,
                transition: 'opacity 0.2s ease',
              }}
            >
              <PhotoCameraOutlinedIcon sx={{ fontSize: 26 }} />
            </Box>
          </Box>
        </Tooltip>
        {src && (
          <IconButton
            size="small"
            aria-label="Remover foto do paciente"
            disabled={disabled}
            onClick={onRemove}
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: 1,
              '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
      {error && (
        <Typography variant="caption" color="error" textAlign="center">
          {error}
        </Typography>
      )}
    </Stack>
  );
}

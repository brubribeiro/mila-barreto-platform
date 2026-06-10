import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
  type IconButtonProps,
  type SxProps,
  type Theme,
} from '@mui/material';
import type { ReactNode } from 'react';

type DialogCloseButtonProps = {
  onClose: () => void;
  'aria-label'?: string;
} & Omit<IconButtonProps, 'onClick' | 'children'>;

/** @deprecated Prefer DialogHeader */
export const dialogTitleCloseSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 1,
  pr: 1.5,
};

export const dialogHeaderTitleSx: SxProps<Theme> = {
  px: { xs: 2, sm: 3 },
  pt: { xs: 1.5, sm: 2 },
  pb: { xs: 1.5, sm: 2 },
  borderBottom: 1,
  borderColor: 'divider',
  flexShrink: 0,
};

export const dialogPaperSx = (isMobile: boolean): SxProps<Theme> => ({
  borderRadius: isMobile ? 0 : 3,
  overflow: 'hidden',
});

/** Scrollable body for flex-column dialogs on short viewports. */
export const dialogContentScrollSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

export const dialogFormLayoutSx = (isMobile: boolean): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  ...(isMobile ? { height: '100%' } : {}),
});

export const dialogActionsBorderSx: SxProps<Theme> = {
  px: { xs: 2, sm: 3 },
  py: { xs: 1.5, sm: 2 },
  borderTop: 1,
  borderColor: 'divider',
};

export function DialogCloseButton({
  onClose,
  'aria-label': ariaLabel = 'Fechar',
  size = 'small',
  sx,
  ...props
}: DialogCloseButtonProps) {
  return (
    <IconButton
      onClick={onClose}
      aria-label={ariaLabel}
      size={size}
      sx={{
        flexShrink: 0,
        color: 'text.secondary',
        mt: -0.25,
        mr: -0.5,
        '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        ...sx,
      }}
      {...props}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
}

export function DialogHeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
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

export type DialogHeaderProps = {
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  bottom?: ReactNode;
  isMobile?: boolean;
  subtitleTitle?: string;
  sx?: SxProps<Theme>;
};

export function DialogHeader({
  onClose,
  title,
  subtitle,
  icon,
  trailing,
  bottom,
  isMobile = false,
  subtitleTitle,
  sx,
}: DialogHeaderProps) {
  const titleSx = (sx ? [dialogHeaderTitleSx, sx] : dialogHeaderTitleSx) as SxProps<Theme>;

  return (
    <DialogTitle sx={titleSx}>
      <Stack spacing={bottom ? (isMobile ? 1.5 : 0) : 0}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          {icon && !isMobile && <DialogHeaderIcon>{icon}</DialogHeaderIcon>}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                title={subtitleTitle ?? subtitle}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {trailing}
          <DialogCloseButton onClose={onClose} />
        </Stack>
        {bottom}
      </Stack>
    </DialogTitle>
  );
}

import type { ReactNode } from 'react';
import { Box, ButtonBase, Collapse, Paper, Stack, Typography, alpha } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';

import { fontSizes } from '../../theme/fontSizes';

export function LabeledField({
  label,
  required,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.5,
          minHeight: 20,
        }}
      >
        <Typography
          component="label"
          sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.secondary' }}
        >
          {label}
          {required ? ' *' : ''}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '11px',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

export type SectionState = 'complete' | 'error' | 'pending';

/** Bloco numerado e colapsável do formulário; mostra um resumo quando fechado. */
export function AppointmentFormSection({
  step,
  title,
  summary,
  state = 'pending',
  expanded,
  onToggle,
  action,
  children,
}: {
  step: number;
  title: string;
  summary?: ReactNode;
  state?: SectionState;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const bodyId = `appointment-section-${step}`;
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '14px',
        borderColor: state === 'error' ? 'error.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 1.25 }}>
        <ButtonBase
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          sx={{
            flex: 1,
            minWidth: 0,
            justifyContent: 'flex-start',
            textAlign: 'left',
            gap: 1.25,
            px: 1.75,
            py: 1.25,
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: fontSizes.xs,
              fontWeight: 800,
              color:
                state === 'complete' ? '#fff' : state === 'error' ? 'error.main' : 'primary.main',
              bgcolor: (t) =>
                state === 'complete'
                  ? t.palette.primary.main
                  : state === 'error'
                    ? alpha(t.palette.error.main, 0.12)
                    : alpha(t.palette.primary.main, 0.12),
            }}
          >
            {state === 'complete' ? (
              <CheckRoundedIcon sx={{ fontSize: 16 }} />
            ) : state === 'error' ? (
              <PriorityHighRoundedIcon sx={{ fontSize: 16 }} />
            ) : (
              step
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: fontSizes.xs,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {title}
            </Typography>
            {!expanded && summary && (
              <Typography
                noWrap
                sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.primary', mt: 0.25 }}
              >
                {summary}
              </Typography>
            )}
          </Box>
          <ExpandMoreRoundedIcon
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              transition: 'transform 150ms',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        </ButtonBase>
        {expanded && action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      <Collapse in={expanded} timeout={150} unmountOnExit={false}>
        <Box id={bodyId} sx={{ px: 1.75, pb: 1.75, pt: 0.5 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}

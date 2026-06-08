import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Box, Grid, Paper, Stack, Typography, alpha } from '@mui/material';
import type { ReactNode } from 'react';

import { ANAMNESIS_SECTIONS, hasAnamnesisData } from './anamnesisFields';

const SECTION_ICONS: Record<string, ReactNode> = {
  'Saúde geral': <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
  'Pele e estética': <PersonOutlineIcon sx={{ fontSize: 18 }} />,
  'Queixas e expectativas': <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />,
};

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 1.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
        <HeaderIcon>{icon}</HeaderIcon>
        <Typography variant="subtitle2" fontWeight={700} letterSpacing="-0.01em">
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 108, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function BooleanRow({ label, value }: { label: string; value: boolean }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        px: 1.5,
        py: 1,
        minHeight: 40,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value ? 'Sim' : 'Não'}
      </Typography>
    </Stack>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <Box
      sx={{
        py: 4,
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function hasAnamnesisValue(value: unknown) {
  return value !== '' && value !== false && value != null;
}

function formatAnamnesisValue(type: string | undefined, value: unknown) {
  if (type === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  return String(value);
}

interface AnamnesisViewProps {
  anamnesis?: Record<string, unknown> | null;
}

export function AnamnesisView({ anamnesis }: AnamnesisViewProps) {
  if (!hasAnamnesisData(anamnesis)) {
    return <EmptyBlock message="Nenhuma anamnese registrada." />;
  }

  return (
    <Stack spacing={2}>
      {ANAMNESIS_SECTIONS.map((section) => {
        const filledFields = section.fields.filter((field) => hasAnamnesisValue(anamnesis![field.key]));
        if (filledFields.length === 0) return null;

        const booleanFields = filledFields.filter((field) => field.type === 'boolean');
        const textFields = filledFields.filter((field) => field.type !== 'boolean');

        return (
          <SectionCard
            key={section.title}
            title={section.title}
            icon={SECTION_ICONS[section.title]}
          >
            <Stack spacing={2}>
              {textFields.length > 0 && (
                <Grid container spacing={2}>
                  {textFields.map((field) => (
                    <Grid item key={field.key} xs={12} sm={field.fullWidth ? 12 : 6}>
                      <InfoRow
                        label={field.label}
                        value={formatAnamnesisValue(field.type, anamnesis![field.key])}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

              {booleanFields.length > 0 && (
                <Grid container spacing={1.5}>
                  {booleanFields.map((field) => (
                    <Grid item key={field.key} xs={12} sm={6}>
                      <BooleanRow label={field.label} value={!!anamnesis![field.key]} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </SectionCard>
        );
      })}
    </Stack>
  );
}

export { hasAnamnesisData };

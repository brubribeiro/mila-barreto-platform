import { useState } from 'react';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { skincareApi } from '../../api/skincare';
import { usePermissions } from '../../contexts/usePermissions';
import { fontSizes } from '../../theme/fontSizes';
import type { SkincareRoutine } from '../../types';
import { SkinAnamnesisDialog } from './SkinAnamnesisDialog';
import type { SkinPatient } from './SkinAnamnesisWizard';
import { AGE_RANGES, SKIN_TYPES, conditionsText, formatDateBR, optionLabel } from './skincareUtils';
import { BORDER_SOFT, ICON, PANEL_SX, Svg, TEXT_SOFT, tint } from './skincareUi';

/** Card "Anamnese de pele" da ficha: histórico de rotinas e atalho para uma nova anamnese. */
export function PatientSkinRoutinesCard({ patient }: { patient: SkinPatient }) {
  const { has } = usePermissions();
  const [dialog, setDialog] = useState<{ open: boolean; routine: SkincareRoutine | null }>({ open: false, routine: null });

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['skincare', 'routines', patient.id],
    queryFn: () => skincareApi.listRoutines(patient.id),
  });

  return (
    <Box sx={{ ...PANEL_SX, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
          px: { xs: 2, sm: 2.75 },
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>
          Anamnese de pele
        </Typography>
        {has('routines:create') && (
          <Button
            variant="contained"
            onClick={() => setDialog({ open: true, routine: null })}
            sx={{ height: 36, px: 1.75, borderRadius: '10px', fontSize: fontSizes.xs, fontWeight: 700, gap: 0.9 }}
          >
            <Svg d={ICON.plus} stroke={2.2} />
            Nova anamnese de pele
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ px: 2.75, py: 2 }}>
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </Box>
      ) : routines.length === 0 ? (
        <Typography sx={{ px: { xs: 2, sm: 2.75 }, py: 2.25, fontSize: fontSizes.xs, color: TEXT_SOFT, fontWeight: 600 }}>
          Nenhuma rotina de skincare gerada para esta paciente.
        </Typography>
      ) : (
        routines.map((r) => {
          const line = [`Pele ${(optionLabel(SKIN_TYPES, r.answers.pele) || '—').toLowerCase()}`, conditionsText(r.answers), optionLabel(AGE_RANGES, r.answers.idade)]
            .filter(Boolean)
            .join(' · ');
          const meta = [`${r.items.length} ${r.items.length === 1 ? 'produto' : 'produtos'}`, r.createdByName].filter(Boolean).join(' · ');
          return (
            <Box
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setDialog({ open: true, routine: r })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDialog({ open: true, routine: r });
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.6,
                px: { xs: 2, sm: 2.75 },
                py: 1.75,
                borderBottom: `1px solid ${BORDER_SOFT}`,
                cursor: 'pointer',
                outline: 'none',
                '&:last-of-type': { borderBottom: 0 },
                '&:hover': { bgcolor: 'grey.50' },
                '&:focus-visible': { boxShadow: (t) => `inset 0 0 0 2px ${t.palette.primary.main}` },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '11px',
                  bgcolor: tint,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Svg d={ICON.drop} size={17} stroke={1.8} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800 }}>Rotina de skincare · {formatDateBR(r.consultDate)}</Typography>
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, textWrap: 'pretty' }}>{line}</Typography>
                <Typography sx={{ fontSize: fontSizes['2xs'], color: TEXT_SOFT, fontWeight: 600 }}>{meta}</Typography>
              </Box>
            </Box>
          );
        })
      )}

      <SkinAnamnesisDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, routine: null })}
        patient={patient}
        routine={dialog.routine}
      />
    </Box>
  );
}

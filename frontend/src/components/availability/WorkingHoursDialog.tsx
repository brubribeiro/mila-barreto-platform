import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { AuroraIcon } from '../AuroraIcon';
import { DialogHeader, dialogActionsBorderSx } from '../DialogCloseButton';
import { LabeledField } from '../LabeledField';
import { fontSizes } from '../../theme/fontSizes';
import {
  AVAILABILITY_DIALOG_CONTENT_SX,
  CARD_ROW_SX,
  DAYS,
  DEFAULT_DAY,
  WEEK_ORDER,
  WEEK_PRESETS,
  availabilityDialogPaperSx,
  type DayScheduleEdit,
  type Professional,
} from './availabilityConfig';
import { apiMessageOf, detectWeekPreset, formatMinutes, toMinutes } from './availabilityUtils';
import { useWorkingHoursForm } from './useWorkingHoursForm';

const TIME_SLOT_MIN_WIDTH = 232;

export function WorkingHoursDialog({
  professional,
  onClose,
}: {
  professional: Professional | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const open = !!professional;
  const { weekSchedule, hoursLoading, saveWeekMutation, updateDay, applyPreset, openDaysCount, weekHasInvalidHours } =
    useWorkingHoursForm(professional, onClose);

  const activePreset = useMemo(() => detectWeekPreset(weekSchedule), [weekSchedule]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: availabilityDialogPaperSx(isMobile) }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title="Horário semanal"
        subtitle={professional ? `Expediente de ${professional.name}` : undefined}
        icon={<AuroraIcon name="clock" size={20} />}
      />
      <DialogContent sx={AVAILABILITY_DIALOG_CONTENT_SX}>
        <Stack spacing={2}>
          <LabeledField label="Atalhos">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={activePreset ?? ''}
              onChange={(_, val) => {
                if (!val || typeof val !== 'string') return;
                const preset = WEEK_PRESETS.find((p) => p.label === val);
                if (preset) applyPreset(preset.days);
              }}
              sx={{
                flexWrap: 'wrap',
                gap: 0.75,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '10px !important',
                  mx: 0,
                  px: 1.75,
                  py: 0.65,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    color: 'primary.dark',
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              {WEEK_PRESETS.map((preset) => (
                <ToggleButton key={preset.label} value={preset.label}>
                  {preset.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </LabeledField>

          <Box
            sx={{
              position: 'relative',
              border: 1,
              borderColor: 'divider',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            {hoursLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
                  zIndex: 5,
                }}
              >
                <CircularProgress size={32} />
              </Box>
            )}
            {WEEK_ORDER.map((day) => (
              <WorkingDayRow
                key={day}
                day={day}
                state={weekSchedule[day] ?? DEFAULT_DAY}
                onChange={(patch) => updateDay(day, patch)}
              />
            ))}
          </Box>

          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
            {openDaysCount} {openDaysCount === 1 ? 'dia' : 'dias'} com atendimento · dias desligados ficam fechados para
            agendamento.
          </Typography>

          {weekHasInvalidHours && (
            <Alert severity="warning">O horário de início deve ser anterior ao de término em cada dia aberto.</Alert>
          )}
          {saveWeekMutation.isError && (
            <Alert severity="error" variant="outlined">
              {apiMessageOf(saveWeekMutation.error, 'Erro ao salvar horário semanal')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
        <Button onClick={onClose} type="button" disabled={saveWeekMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={saveWeekMutation.isPending || weekHasInvalidHours || hoursLoading}
          onClick={() => saveWeekMutation.mutate()}
        >
          {saveWeekMutation.isPending ? 'Salvando...' : 'Salvar horário semanal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function WorkingDayRow({
  day,
  state,
  onChange,
}: {
  day: number;
  state: DayScheduleEdit;
  onChange: (patch: Partial<DayScheduleEdit>) => void;
}) {
  const invalidHours = state.works && state.startTime >= state.endTime;
  return (
    <Box
      sx={{
        ...CARD_ROW_SX,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr) auto',
          sm: `minmax(108px, 140px) 48px minmax(${TIME_SLOT_MIN_WIDTH}px, 1fr)`,
        },
        alignItems: 'center',
        columnGap: 1.5,
        rowGap: 1,
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        bgcolor: state.works ? 'transparent' : 'grey.50',
      }}
    >
      <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Typography
          sx={{
            fontSize: fontSizes.md,
            fontWeight: 700,
            lineHeight: 1.35,
            color: state.works ? 'text.primary' : 'text.secondary',
          }}
        >
          {DAYS[day]}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSizes.xs,
            lineHeight: 1.35,
            color: invalidHours ? 'error.main' : 'text.secondary',
          }}
        >
          {!state.works
            ? 'Sem atendimento'
            : invalidHours
              ? 'Início deve ser antes do término'
              : `${formatMinutes(toMinutes(state.endTime) - toMinutes(state.startTime))} de atendimento`}
        </Typography>
      </Box>

      <Switch
        checked={state.works}
        onChange={(e) => onChange({ works: e.target.checked })}
        inputProps={{ 'aria-label': `Atende ${DAYS[day].toLowerCase()}` }}
        sx={{ justifySelf: { xs: 'end', sm: 'center' } }}
      />

      <Box
        sx={{
          gridColumn: { xs: '1 / -1', sm: 'auto' },
          minHeight: 40,
          minWidth: { sm: TIME_SLOT_MIN_WIDTH },
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'stretch', sm: state.works ? 'flex-start' : 'center' },
          gap: 0.75,
        }}
      >
        {state.works ? (
          <>
            <TextField
              type="time"
              size="small"
              value={state.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              inputProps={{ 'aria-label': `${DAYS[day]} das` }}
              error={invalidHours}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', flexShrink: 0 }}>–</Typography>
            <TextField
              type="time"
              size="small"
              value={state.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              inputProps={{ 'aria-label': `${DAYS[day]} até` }}
              error={invalidHours}
              sx={{ flex: 1, minWidth: 0 }}
            />
          </>
        ) : (
          <Typography
            sx={{
              width: '100%',
              textAlign: 'center',
              fontSize: fontSizes.sm,
              fontWeight: 600,
              color: 'text.disabled',
            }}
          >
            Fechado
          </Typography>
        )}
      </Box>
    </Box>
  );
}

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Switch,
  TextField,
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
import { apiMessageOf, formatMinutes, toMinutes } from './availabilityUtils';
import { useWorkingHoursForm } from './useWorkingHoursForm';

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
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {WEEK_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyPreset(preset.days)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
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
            {openDaysCount} {openDaysCount === 1 ? 'dia' : 'dias'} com atendimento · dias desligados ficam
            fechados para agendamento.
          </Typography>

          {weekHasInvalidHours && (
            <Alert severity="warning">
              O horário de início deve ser anterior ao de término em cada dia aberto.
            </Alert>
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
    <Stack
      direction="row"
      alignItems="center"
      flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
      useFlexGap
      sx={{
        ...CARD_ROW_SX,
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        columnGap: 1.5,
        rowGap: 1,
        bgcolor: state.works ? 'transparent' : 'grey.50',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 72, lineHeight: 1.3 }}>
        <Typography
          sx={{
            fontSize: fontSizes.md,
            fontWeight: 700,
            lineHeight: 'inherit',
            color: state.works ? 'text.primary' : 'text.secondary',
          }}
        >
          {DAYS[day]}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSizes.xs,
            lineHeight: 'inherit',
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
        size="small"
        checked={state.works}
        onChange={(e) => onChange({ works: e.target.checked })}
        inputProps={{ 'aria-label': `Atende ${DAYS[day].toLowerCase()}` }}
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '0 1 272px' }, minWidth: { sm: 210 } }}
      >
        {state.works ? (
          <>
            <TextField
              type="time"
              value={state.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              inputProps={{ 'aria-label': `${DAYS[day]} das` }}
              error={invalidHours}
              fullWidth
            />
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>–</Typography>
            <TextField
              type="time"
              value={state.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              inputProps={{ 'aria-label': `${DAYS[day]} até` }}
              error={invalidHours}
              fullWidth
            />
          </>
        ) : (
          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' },
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
      </Stack>
    </Stack>
  );
}

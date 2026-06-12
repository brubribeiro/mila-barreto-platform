import { useEffect, type ReactNode } from 'react';
import { useForm, Controller, type Control } from 'react-hook-form';
import {
  Alert,
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { equipmentApi, EquipmentPayload } from '../../api/equipment';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { dateInputValueFromApi, dateOnlyToApiIso } from '../../utils/dateOnly';
import type { Equipment } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  equipment?: Equipment | null;
}

type FormValues = {
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseValue: number | '';
  maintenanceValue: number | '';
  maintenanceIntervalMonths: number | '';
  maintenanceNotifyDaysBefore: number | '';
  lastMaintenanceAt: string;
  scheduledMaintenanceAt: string;
  notes: string;
  active: boolean;
};

const empty: FormValues = {
  name: '',
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseValue: '',
  maintenanceValue: '',
  maintenanceIntervalMonths: '',
  maintenanceNotifyDaysBefore: '',
  lastMaintenanceAt: '',
  scheduledMaintenanceAt: '',
  notes: '',
  active: true,
};

const DIALOG_MAX_WIDTH = 1100;
const DIALOG_HEIGHT_DESKTOP = 760;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
} as const;

const SECTION_HINT_SX = {
  display: 'block',
  mt: -0.5,
  mb: 0.5,
} as const;

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
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

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <SectionIcon>{icon}</SectionIcon>
      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
        {title}
      </Typography>
    </Stack>
  );
}

function EquipmentActiveToggle({
  control,
  fullWidth = false,
}: {
  control: Control<FormValues>;
  fullWidth?: boolean;
}) {
  return (
    <Controller
      name="active"
      control={control}
      render={({ field }) => (
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          fullWidth={fullWidth}
          value={field.value ? 'active' : 'inactive'}
          onChange={(_, val) => {
            if (val === 'active') field.onChange(true);
            if (val === 'inactive') field.onChange(false);
          }}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="active" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Ativo
          </ToggleButton>
          <ToggleButton value="inactive" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Inativo
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function EquipmentFormDialog({ open, onClose, equipment }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { control, handleSubmit, reset, watch } = useForm<FormValues>({ defaultValues: empty });
  const isActive = watch('active');

  useEffect(() => {
    if (!open) return;
    reset(
      equipment
        ? {
            name: equipment.name,
            brand: equipment.brand ?? '',
            model: equipment.model ?? '',
            serialNumber: equipment.serialNumber ?? '',
            purchaseDate: dateInputValueFromApi(equipment.purchaseDate),
            purchaseValue: equipment.purchaseValue ?? '',
            maintenanceValue: equipment.maintenanceValue ?? '',
            maintenanceIntervalMonths: equipment.maintenanceIntervalMonths ?? '',
            maintenanceNotifyDaysBefore: equipment.maintenanceNotifyDaysBefore ?? '',
            lastMaintenanceAt: dateInputValueFromApi(equipment.lastMaintenanceAt),
            scheduledMaintenanceAt: dateInputValueFromApi(equipment.scheduledMaintenanceAt),
            notes: equipment.notes ?? '',
            active: equipment.active,
          }
        : empty,
    );
  }, [open, equipment, reset]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload: EquipmentPayload = {
        name: v.name.trim(),
        ...(v.brand.trim() ? { brand: v.brand.trim() } : {}),
        ...(v.model.trim() ? { model: v.model.trim() } : {}),
        ...(v.serialNumber.trim() ? { serialNumber: v.serialNumber.trim() } : {}),
        ...(v.purchaseDate ? { purchaseDate: dateOnlyToApiIso(v.purchaseDate) } : {}),
        ...(v.purchaseValue !== '' ? { purchaseValue: Number(v.purchaseValue) } : {}),
        ...(v.maintenanceValue !== '' ? { maintenanceValue: Number(v.maintenanceValue) } : {}),
        ...(v.maintenanceIntervalMonths
          ? { maintenanceIntervalMonths: Number(v.maintenanceIntervalMonths) }
          : {}),
        ...(v.maintenanceNotifyDaysBefore !== ''
          ? { maintenanceNotifyDaysBefore: Number(v.maintenanceNotifyDaysBefore) }
          : {}),
        ...(v.lastMaintenanceAt
          ? { lastMaintenanceAt: dateOnlyToApiIso(v.lastMaintenanceAt) }
          : {}),
        ...(v.scheduledMaintenanceAt
          ? { scheduledMaintenanceAt: dateOnlyToApiIso(v.scheduledMaintenanceAt) }
          : { scheduledMaintenanceAt: undefined }),
        ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
        active: v.active,
      };
      return equipment ? equipmentApi.update(equipment.id, payload) : equipmentApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(equipment ? 'Equipamento atualizado.' : 'Equipamento criado.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o equipamento.'));
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...dialogPaperSx(isMobile),
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : {
                maxWidth: DIALOG_MAX_WIDTH,
                height: DIALOG_HEIGHT_DESKTOP,
                maxHeight: '94dvh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          ...(isMobile ? { height: '100%' } : {}),
        }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={equipment ? 'Editar equipamento' : 'Novo equipamento'}
          subtitle={
            equipment
              ? `${equipment.name}${equipment.serialNumber ? ` · ${equipment.serialNumber}` : ''}`
              : 'Dados, aquisição e manutenção'
          }
          icon={
            equipment ? (
              <EditOutlinedIcon fontSize="small" />
            ) : (
              <HandymanOutlinedIcon fontSize="small" />
            )
          }
        />

        <DialogContent
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle
                  icon={<HandymanOutlinedIcon fontSize="small" />}
                  title="Identificação"
                />
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12}>
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Nome é obrigatório' }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Nome"
                        fullWidth
                        required
                        autoFocus={!equipment}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="brand"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Marca" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Modelo" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="serialNumber"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Nº de série" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Observações" fullWidth multiline minRows={3} />
                    )}
                  />
                </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />
                <SectionTitle icon={<ToggleOnOutlinedIcon fontSize="small" />} title="Status" />
                <Stack
                  direction={{ xs: 'column', sm: isCompact ? 'column' : 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', sm: isCompact ? 'stretch' : 'center' }}
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {isActive ? 'Equipamento disponível para uso' : 'Equipamento indisponível'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25 }}
                    >
                      Inativos permanecem no cadastro, mas ficam ocultos nas listagens e seleções do
                      dia a dia.
                    </Typography>
                  </Box>
                  <EquipmentActiveToggle control={control} fullWidth={isCompact} />
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={FORM_CARD_SX}>
                <SectionTitle icon={<PaymentsOutlinedIcon fontSize="small" />} title="Aquisição" />
                <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12}>
                  <Controller
                    name="purchaseDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Data de aquisição"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="purchaseValue"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Valor da máquina"
                        fullWidth
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                        inputProps={{ step: '0.01', min: 0 }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="maintenanceValue"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Valor da manutenção"
                        fullWidth
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                        inputProps={{ step: '0.01', min: 0 }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={SECTION_HINT_SX}>
                    O valor da manutenção é usado para gerar despesa automaticamente no financeiro.
                  </Typography>
                </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />
                <SectionTitle icon={<BuildOutlinedIcon fontSize="small" />} title="Manutenção" />
                <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="lastMaintenanceAt"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Última manutenção"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="scheduledMaintenanceAt"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Manutenção agendada para"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={SECTION_HINT_SX}>
                    Ao agendar a próxima manutenção, uma despesa será criada automaticamente.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="maintenanceIntervalMonths"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Intervalo"
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">meses</InputAdornment>,
                        }}
                        inputProps={{ min: 1 }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="maintenanceNotifyDaysBefore"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Notificar antes"
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                        }}
                        inputProps={{ min: 0 }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={SECTION_HINT_SX}>
                    Com intervalo definido, a próxima manutenção é calculada automaticamente.
                  </Typography>
                </Grid>
                </Grid>
              </Paper>
            </Grid>

            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? 'Erro ao salvar equipamento'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : equipment ? 'Salvar' : 'Criar equipamento'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

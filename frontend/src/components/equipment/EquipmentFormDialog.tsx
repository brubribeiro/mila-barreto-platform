import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Grid,
  InputAdornment,
  Switch,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { equipmentApi, EquipmentPayload } from '../../api/equipment';
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

export function EquipmentFormDialog({ open, onClose, equipment }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: empty });

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
        name: v.name,
        ...(v.brand ? { brand: v.brand } : {}),
        ...(v.model ? { model: v.model } : {}),
        ...(v.serialNumber ? { serialNumber: v.serialNumber } : {}),
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
        ...(v.notes ? { notes: v.notes } : {}),
        active: v.active,
      };
      return equipment ? equipmentApi.update(equipment.id, payload) : equipmentApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title={equipment ? 'Editar equipamento' : 'Novo equipamento'}
          subtitle={equipment?.name ?? 'Dados, aquisição e manutenção'}
          subtitleTitle={equipment?.name}
          icon={<HandymanOutlinedIcon fontSize="small" />}
        />
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* --- Dados gerais --- */}
            <Grid item xs={12} sm={7}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Nome obrigatório' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <Controller
                name="serialNumber"
                control={control}
                render={({ field }) => <TextField {...field} label="Nº de série" fullWidth />}
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

            {/* --- Valores --- */}
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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
                    helperText="Usado para gerar despesa automaticamente"
                  />
                )}
              />
            </Grid>

            {/* --- Manutenção --- */}
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
                    helperText="Ao agendar, uma despesa será criada automaticamente"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="maintenanceIntervalMonths"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Intervalo de manutenção"
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">meses</InputAdornment>,
                    }}
                    helperText="Próxima manutenção calculada automaticamente"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
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
                    helperText="Quantos dias antes de notificar"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Equipamento ativo"
                  />
                )}
              />
            </Grid>

            {/* --- Observações --- */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Observações" fullWidth multiline rows={2} />
                )}
              />
            </Grid>
            {mutation.isError && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

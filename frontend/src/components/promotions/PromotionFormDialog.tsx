import { useEffect, useMemo, type ReactNode } from 'react';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
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
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import { useForm, Controller, type Control } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { promotionsApi, CreatePromotionPayload } from '../../api/promotions';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import { dateInputValueFromApi, dateOnlyToApiIso } from '../../utils/dateOnly';
import { proceduresApi } from '../../api/procedures';
import { packagesApi } from '../../api/packages';
import type { Promotion, Procedure, Package } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Promotion | null;
  initialCommemorativeDate?: string;
}

const COMMEMORATIVE_OPTIONS = [
  'Dia Internacional da Mulher',
  'Outono',
  'Dia das Mães',
  'Dia dos Namorados',
  'Inverno',
  'Dia dos Pais',
  'Dia Internacional da Beleza',
  'Dia do Cliente',
  'Primavera',
  'Black Friday',
  'Verão',
  'Natal',
];

const QUICK_COMMEMORATIVE = [
  'Dia das Mães',
  'Dia dos Namorados',
  'Black Friday',
  'Natal',
  'Dia Internacional da Mulher',
  'Dia do Cliente',
] as const;

const DIALOG_MAX_WIDTH = 960;
const DIALOG_HEIGHT_DESKTOP = 760;

const FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  height: '100%',
} as const;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface FormValues {
  name: string;
  description: string;
  commemorativeDate: string;
  startAt: string;
  endAt: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number | '';
  active: boolean;
  procedureIds: string[];
  packageIds: string[];
}

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

function PromotionActiveToggle({
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
        >
          <ToggleButton value="active" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Ativa
          </ToggleButton>
          <ToggleButton value="inactive" sx={{ px: fullWidth ? 2 : 1.75 }}>
            Inativa
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}

export function PromotionFormDialog({ open, onClose, editing, initialCommemorativeDate }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const { data: procedures = [] } = useQuery<Procedure[]>({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
    enabled: open,
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list(),
    enabled: open,
  });

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      commemorativeDate: initialCommemorativeDate ?? '',
      startAt: '',
      endAt: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      active: true,
      procedureIds: [],
      packageIds: [],
    },
  });

  const discountType = watch('discountType');
  const discountValue = watch('discountValue');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const procedureIds = watch('procedureIds');
  const packageIds = watch('packageIds');
  const commemorativeDate = watch('commemorativeDate');

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          description: editing.description ?? '',
          commemorativeDate: editing.commemorativeDate ?? '',
          startAt: dateInputValueFromApi(editing.startAt),
          endAt: dateInputValueFromApi(editing.endAt),
          discountType: editing.discountType,
          discountValue: Number(editing.discountValue),
          active: editing.active,
          procedureIds: editing.procedures?.map((p) => p.procedureId) ?? [],
          packageIds: editing.packages?.map((p) => p.packageId) ?? [],
        });
      } else {
        reset({
          name: '',
          description: '',
          commemorativeDate: initialCommemorativeDate ?? '',
          startAt: '',
          endAt: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          active: true,
          procedureIds: [],
          packageIds: [],
        });
      }
    }
  }, [open, editing, initialCommemorativeDate, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePromotionPayload) => promotionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção criada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível criar a promoção.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePromotionPayload> }) =>
      promotionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível atualizar a promoção.'));
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CreatePromotionPayload = {
      name: values.name,
      description: values.description || undefined,
      commemorativeDate: values.commemorativeDate || undefined,
      startAt: dateOnlyToApiIso(values.startAt),
      endAt: dateOnlyToApiIso(values.endAt),
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      active: values.active,
      procedureIds: values.procedureIds,
      packageIds: values.packageIds,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const discountPreview = useMemo(() => {
    const value = Number(discountValue);
    if (!value || value <= 0) return null;
    return discountType === 'PERCENTAGE' ? `${value}% de desconto` : `${brl.format(value)} de desconto`;
  }, [discountType, discountValue]);

  const validityLabel = useMemo(() => {
    if (!startAt || !endAt) return null;
    const start = dayjs(startAt);
    const end = dayjs(endAt);
    if (!start.isValid() || !end.isValid()) return null;
    if (end.isBefore(start, 'day')) return 'A data de fim deve ser igual ou posterior ao início';
    const days = end.diff(start, 'day') + 1;
    return `${days} ${days === 1 ? 'dia' : 'dias'} de vigência`;
  }, [startAt, endAt]);

  const eligibleCount = procedureIds.length + packageIds.length;

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
        onSubmit={handleSubmit(onSubmit)}
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
          title={editing ? 'Editar promoção' : 'Nova promoção'}
          subtitle={
            editing
              ? `${editing.name}${discountPreview ? ` · ${discountPreview}` : ''}`
              : 'Desconto, vigência e itens elegíveis'
          }
          icon={
            editing ? <EditOutlinedIcon fontSize="small" /> : <LocalOfferOutlinedIcon fontSize="small" />
          }
          trailing={!isCompact ? <PromotionActiveToggle control={control} /> : undefined}
          bottom={
            isCompact ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Status da promoção
                </Typography>
                <PromotionActiveToggle control={control} fullWidth />
              </Box>
            ) : undefined
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
            display: 'flex',
            flexDirection: 'column',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Grid
            container
            spacing={2.5}
            sx={{
              flex: 1,
              minHeight: 0,
              alignItems: 'stretch',
            }}
          >
            <Grid item xs={12} md={5}>
              <Stack spacing={2.5} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={FORM_CARD_SX}>
                  <SectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Identificação" />
                  <Stack spacing={2}>
                    <Controller
                      name="name"
                      control={control}
                      rules={{ required: 'Nome é obrigatório' }}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label="Nome da promoção"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          fullWidth
                          required
                          autoFocus={!editing}
                        />
                      )}
                    />

                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Descrição"
                          multiline
                          minRows={3}
                          fullWidth
                          placeholder="Detalhes visíveis para a equipe…"
                        />
                      )}
                    />
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ ...FORM_CARD_SX, height: 'auto' }}>
                  <SectionTitle icon={<EventOutlinedIcon fontSize="small" />} title="Data comemorativa" />
                  <Stack spacing={1.5}>
                    <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                      {QUICK_COMMEMORATIVE.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          size="small"
                          clickable
                          color={commemorativeDate === option ? 'primary' : 'default'}
                          variant={commemorativeDate === option ? 'filled' : 'outlined'}
                          onClick={() =>
                            setValue(
                              'commemorativeDate',
                              commemorativeDate === option ? '' : option,
                              { shouldDirty: true },
                            )
                          }
                        />
                      ))}
                    </Stack>
                    <Controller
                      name="commemorativeDate"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          freeSolo
                          options={COMMEMORATIVE_OPTIONS}
                          value={field.value}
                          onChange={(_, value) => field.onChange(value ?? '')}
                          onInputChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Data comemorativa (opcional)"
                              placeholder="Selecione ou digite…"
                              fullWidth
                              size="small"
                            />
                          )}
                        />
                      )}
                    />
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            <Grid
              item
              xs={12}
              md={7}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                ...(isCompact ? {} : { height: '100%' }),
              }}
            >
              <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                <Paper variant="outlined" sx={{ ...FORM_CARD_SX, height: 'auto' }}>
                  <SectionTitle icon={<PercentOutlinedIcon fontSize="small" />} title="Desconto e vigência" />
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Tipo de desconto
                      </Typography>
                      <Controller
                        name="discountType"
                        control={control}
                        render={({ field }) => (
                          <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            color="primary"
                            value={field.value}
                            onChange={(_, val) => val && field.onChange(val)}
                          >
                            <ToggleButton value="PERCENTAGE">
                              <PercentOutlinedIcon sx={{ fontSize: 16, mr: 0.75 }} />
                              Porcentagem
                            </ToggleButton>
                            <ToggleButton value="FIXED">Valor fixo (R$)</ToggleButton>
                          </ToggleButtonGroup>
                        )}
                      />
                    </Box>

                    <Controller
                      name="discountValue"
                      control={control}
                      rules={{
                        required: 'Valor do desconto é obrigatório',
                        min: { value: 0.01, message: 'Deve ser maior que zero' },
                        ...(discountType === 'PERCENTAGE'
                          ? { max: { value: 100, message: 'Máximo 100%' } }
                          : {}),
                      }}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label={discountType === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}
                          type="number"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          fullWidth
                          InputProps={
                            discountType === 'FIXED'
                              ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> }
                              : discountType === 'PERCENTAGE'
                                ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
                                : undefined
                          }
                          inputProps={{
                            step: discountType === 'PERCENTAGE' ? 1 : 0.01,
                            min: 0,
                            max: discountType === 'PERCENTAGE' ? 100 : undefined,
                          }}
                        />
                      )}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Controller
                        name="startAt"
                        control={control}
                        rules={{ required: 'Data de início é obrigatória' }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="Início"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            fullWidth
                            sx={{ flex: 1, minWidth: 0 }}
                          />
                        )}
                      />
                      <Controller
                        name="endAt"
                        control={control}
                        rules={{
                          required: 'Data de fim é obrigatória',
                          validate: (value) => {
                            if (!startAt || !value) return true;
                            return (
                              !dayjs(value).isBefore(dayjs(startAt), 'day') ||
                              'Deve ser igual ou posterior ao início'
                            );
                          },
                        }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="Fim"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            fullWidth
                            sx={{ flex: 1, minWidth: 0 }}
                          />
                        )}
                      />
                    </Stack>

                    {(discountPreview || validityLabel) && (
                      <Alert
                        severity={validityLabel?.includes('deve ser') ? 'warning' : 'info'}
                        icon={<CalendarMonthOutlinedIcon fontSize="inherit" />}
                        sx={{ py: 0.75 }}
                      >
                        <Stack spacing={0.25}>
                          {discountPreview && (
                            <Typography variant="body2" fontWeight={600}>
                              {discountPreview}
                            </Typography>
                          )}
                          {validityLabel && (
                            <Typography variant="caption" color="text.secondary">
                              {validityLabel}
                            </Typography>
                          )}
                        </Stack>
                      </Alert>
                    )}
                  </Stack>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    ...FORM_CARD_SX,
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                    sx={{ mb: 1.5, flexShrink: 0 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <SectionIcon>
                          <PlaylistAddCheckOutlinedIcon fontSize="small" />
                        </SectionIcon>
                        <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
                          Itens elegíveis
                        </Typography>
                      </Stack>
                    </Box>
                    {eligibleCount > 0 && (
                      <Chip size="small" label={`${eligibleCount} selecionado(s)`} variant="outlined" />
                    )}
                  </Stack>

                  <Stack
                    spacing={2}
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      pr: 0.5,
                    }}
                  >
                    <Controller
                      name="procedureIds"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          size="small"
                          options={procedures.filter((p) => p.active)}
                          getOptionLabel={(opt) => opt.name}
                          value={procedures.filter((p) => field.value.includes(p.id))}
                          onChange={(_, selected) => field.onChange(selected.map((s) => s.id))}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                size="small"
                                label={option.name}
                                {...getTagProps({ index })}
                                key={option.id}
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Procedimentos incluídos"
                              placeholder="Buscar procedimentos…"
                            />
                          )}
                        />
                      )}
                    />

                    <Controller
                      name="packageIds"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          size="small"
                          options={packages.filter((p) => p.active)}
                          getOptionLabel={(opt) => opt.name}
                          value={packages.filter((p) => field.value.includes(p.id))}
                          onChange={(_, selected) => field.onChange(selected.map((s) => s.id))}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                size="small"
                                label={option.name}
                                {...getTagProps({ index })}
                                key={option.id}
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Pacotes incluídos" placeholder="Buscar pacotes…" />
                          )}
                        />
                      )}
                    />

                    <Typography variant="caption" color="text.secondary">
                      Deixe vazio para aplicar a todos os procedimentos e pacotes ativos.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            {mutationError && (
              <Grid item xs={12}>
                <Alert severity="error" variant="outlined">
                  {(mutationError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    'Erro ao salvar promoção'}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar promoção'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

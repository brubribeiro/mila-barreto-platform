import { useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionsApi, CreatePromotionPayload } from '../../api/promotions';
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

export function PromotionFormDialog({ open, onClose, editing, initialCommemorativeDate }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const { data: procedures = [] } = useQuery<Procedure[]>({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list(),
  });

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
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
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePromotionPayload> }) =>
      promotionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      onClose();
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Editar promoção' : 'Nova promoção'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
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
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Descrição" multiline rows={2} fullWidth />
              )}
            />

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
                    <TextField {...params} label="Data comemorativa (opcional)" fullWidth />
                  )}
                />
              )}
            />

            <Stack direction="row" spacing={2}>
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
                  />
                )}
              />
              <Controller
                name="endAt"
                control={control}
                rules={{ required: 'Data de fim é obrigatória' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Fim"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <Controller
                name="discountType"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Tipo de desconto" select fullWidth>
                    <MenuItem value="PERCENTAGE">Porcentagem (%)</MenuItem>
                    <MenuItem value="FIXED">Valor fixo (R$)</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                name="discountValue"
                control={control}
                rules={{
                  required: 'Valor do desconto é obrigatório',
                  min: { value: 0.01, message: 'Deve ser maior que zero' },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={discountType === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}
                    type="number"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    inputProps={{
                      step: discountType === 'PERCENTAGE' ? 1 : 0.01,
                      min: 0,
                      max: discountType === 'PERCENTAGE' ? 100 : undefined,
                    }}
                  />
                )}
              />
            </Stack>

            <Controller
              name="procedureIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
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
                    <TextField {...params} label="Procedimentos incluídos" />
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
                    <TextField {...params} label="Pacotes incluídos" />
                  )}
                />
              )}
            />

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={field.onChange} />}
                  label="Promoção ativa"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pendenciasApi } from '../../api/pendencias';
import { usersApi } from '../../api/users';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../DialogCloseButton';
import type { PendingRuleConfig } from '../../types';
import { fontSizes } from '../../theme/fontSizes';
import { CATEGORY_META, PendIcon, RULE_CATEGORY, RULE_META } from './pendenciasUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}

const DIALOG_MAX_WIDTH = 660;

const SMALL_FIELD_SX = {
  '& .MuiOutlinedInput-root': { height: 36, borderRadius: '10px', fontSize: fontSizes.sm },
} as const;

export function PendingRulesDialog({ open, onClose, canEdit }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [draft, setDraft] = useState<PendingRuleConfig[]>([]);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['pendencias', 'rules'],
    queryFn: pendenciasApi.getRules,
    enabled: open,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => usersApi.listActive(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (open && rules) setDraft(rules);
  }, [open, rules]);

  const saveMutation = useMutation({
    mutationFn: pendenciasApi.updateRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
      toast.success('Regras salvas.');
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível salvar as regras.')),
  });

  const patch = (index: number, changes: Partial<PendingRuleConfig>) =>
    setDraft((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)));

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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh', overflow: 'hidden' }),
        },
      }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title="Regras de pendência"
        subtitle="Escolha o que gera pendência automaticamente nas outras telas"
        icon={<SettingsOutlinedIcon fontSize="small" />}
      />
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 0.5, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {isLoading || draft.length === 0
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={72} />)
          : draft.map((r, i) => {
              const meta = RULE_META[r.rule];
              const category = CATEGORY_META[RULE_CATEGORY[r.rule]];
              return (
                <Stack
                  key={r.rule}
                  direction="row"
                  alignItems="flex-start"
                  spacing={1.6}
                  sx={{
                    py: 1.9,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 0 },
                    opacity: r.enabled ? 1 : 0.55,
                    transition: 'opacity .15s',
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '11px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(category.color, 0.12),
                      color: category.color,
                    }}
                  >
                    <PendIcon name={meta.icon} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>{meta.label}</Typography>
                      <Box
                        component="span"
                        sx={{
                          fontSize: fontSizes['3xs'],
                          fontWeight: 700,
                          px: 0.9,
                          py: 0.25,
                          borderRadius: '6px',
                          bgcolor: alpha(category.color, 0.12),
                          color: category.color,
                        }}
                      >
                        {category.label}
                      </Box>
                    </Stack>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', mt: 0.25 }}>
                      {meta.description}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1.25 }}>
                      {meta.param && (
                        <TextField
                          size="small"
                          type="number"
                          label={meta.param.label}
                          value={r.param ?? ''}
                          disabled={!canEdit || !r.enabled}
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : Math.max(0, Math.min(365, Math.round(Number(e.target.value))));
                            patch(i, { param: v });
                          }}
                          InputProps={{ endAdornment: <InputAdornment position="end">{meta.param.suffix}</InputAdornment> }}
                          inputProps={{ min: 0, max: 365 }}
                          sx={{ ...SMALL_FIELD_SX, width: { xs: '100%', sm: 200 } }}
                        />
                      )}
                      <TextField
                        select
                        size="small"
                        label="Responsável padrão"
                        value={r.assigneeId ?? ''}
                        disabled={!canEdit || !r.enabled}
                        onChange={(e) => patch(i, { assigneeId: e.target.value || null })}
                        sx={{ ...SMALL_FIELD_SX, width: { xs: '100%', sm: 200 } }}
                      >
                        <MenuItem value="">
                          <em>Automático</em>
                        </MenuItem>
                        {users.map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  </Box>
                  <Switch
                    checked={r.enabled}
                    disabled={!canEdit}
                    onChange={(e) => patch(i, { enabled: e.target.checked })}
                    inputProps={{ 'aria-label': meta.label }}
                  />
                </Stack>
              );
            })}
      </DialogContent>
      <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          {canEdit ? 'Cancelar' : 'Fechar'}
        </Button>
        {canEdit && (
          <Button
            variant="contained"
            disabled={saveMutation.isPending || draft.length === 0}
            onClick={() => saveMutation.mutate(draft)}
          >
            {saveMutation.isPending ? 'Salvando…' : 'Salvar regras'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

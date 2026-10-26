import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../../api/admin';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  PLATFORM_FEATURES,
  PLATFORM_FEATURE_LABELS,
  type PlatformFeature,
} from '../../features/platformFeatures';
import { fontSizes } from '../../theme/fontSizes';
import type { AdminTenantDetail } from '../../types';

interface Props {
  tenant: AdminTenantDetail;
}

/**
 * Overrides de módulos da clínica: extras (além do plano) e negados (do plano).
 * Efetivo = (plano ∪ extra) − denied.
 */
export function TenantFeaturesEditor({ tenant }: Props) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const planFeatures = useMemo(
    () =>
      new Set(
        (tenant.plan?.features ?? []).filter((f): f is PlatformFeature =>
          (PLATFORM_FEATURES as readonly string[]).includes(f),
        ),
      ),
    [tenant.plan?.features],
  );

  const [extra, setExtra] = useState<PlatformFeature[]>([]);
  const [denied, setDenied] = useState<PlatformFeature[]>([]);

  useEffect(() => {
    setExtra(
      (tenant.featuresExtra ?? []).filter((f): f is PlatformFeature =>
        (PLATFORM_FEATURES as readonly string[]).includes(f),
      ),
    );
    setDenied(
      (tenant.featuresDenied ?? []).filter((f): f is PlatformFeature =>
        (PLATFORM_FEATURES as readonly string[]).includes(f),
      ),
    );
  }, [tenant.id, tenant.featuresExtra, tenant.featuresDenied]);

  const dirty =
    JSON.stringify([...extra].sort()) !== JSON.stringify([...(tenant.featuresExtra ?? [])].sort()) ||
    JSON.stringify([...denied].sort()) !== JSON.stringify([...(tenant.featuresDenied ?? [])].sort());

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateTenant(tenant.id, {
        featuresExtra: extra.length ? extra : null,
        featuresDenied: denied.length ? denied : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenant.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      toast.success('Módulos da clínica atualizados.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível salvar os módulos.')),
  });

  const toggleExtra = (f: PlatformFeature, checked: boolean) => {
    setExtra((prev) => (checked ? [...prev, f] : prev.filter((x) => x !== f)));
    if (checked) setDenied((prev) => prev.filter((x) => x !== f));
  };

  const toggleDenied = (f: PlatformFeature, checked: boolean) => {
    setDenied((prev) => (checked ? [...prev, f] : prev.filter((x) => x !== f)));
    if (checked) setExtra((prev) => prev.filter((x) => x !== f));
  };

  const effective = tenant.effectiveFeatures ?? [];

  return (
    <Stack spacing={2} sx={{ px: 2.5, py: 2 }}>
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>
        {tenant.plan
          ? `Plano ${tenant.plan.name}: ${(tenant.plan.features ?? []).length} módulos. Abaixo você pode acrescentar ou remover em relação ao plano.`
          : 'Sem plano: a clínica tem todos os módulos. Ao atribuir um plano, use extras e negados para ajustar.'}
      </Typography>

      <Box>
        <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 800, textTransform: 'uppercase', color: 'text.disabled', mb: 1 }}>
          Efetivos agora ({effective.length})
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
          {effective.length ? (
            effective.map((f) => (
              <Chip
                key={f}
                size="small"
                label={PLATFORM_FEATURE_LABELS[f as PlatformFeature] ?? f}
                sx={{ fontWeight: 600 }}
              />
            ))
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: fontSizes.sm }}>
              Nenhum módulo
            </Typography>
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, mb: 0.75 }}>
            Extras (além do plano)
          </Typography>
          <FormGroup>
            {PLATFORM_FEATURES.map((f) => {
              const inPlan = planFeatures.has(f);
              return (
                <FormControlLabel
                  key={f}
                  disabled={inPlan}
                  control={
                    <Checkbox
                      size="small"
                      checked={extra.includes(f) || inPlan}
                      onChange={(_, c) => toggleExtra(f, c)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: fontSizes.sm }}>
                      {PLATFORM_FEATURE_LABELS[f]}
                      {inPlan ? ' (no plano)' : ''}
                    </Typography>
                  }
                />
              );
            })}
          </FormGroup>
        </Box>
        <Box>
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, mb: 0.75 }}>
            Removidos (do plano)
          </Typography>
          <FormGroup>
            {PLATFORM_FEATURES.filter((f) => planFeatures.has(f)).map((f) => (
              <FormControlLabel
                key={f}
                control={
                  <Checkbox
                    size="small"
                    checked={denied.includes(f)}
                    onChange={(_, c) => toggleDenied(f, c)}
                  />
                }
                label={<Typography sx={{ fontSize: fontSizes.sm }}>{PLATFORM_FEATURE_LABELS[f]}</Typography>}
              />
            ))}
            {!planFeatures.size && (
              <Typography color="text.secondary" sx={{ fontSize: fontSizes.sm }}>
                Atribua um plano para negar módulos dele.
              </Typography>
            )}
          </FormGroup>
        </Box>
      </Box>

      <Box>
        <Button
          variant="contained"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Salvando…' : 'Salvar módulos'}
        </Button>
      </Box>
    </Stack>
  );
}

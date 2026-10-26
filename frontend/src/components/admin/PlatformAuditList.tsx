import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Skeleton, Stack, Typography, alpha } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';
import { formatDateTime, formatPlanLimits } from './adminUi';
import type { PlanLimits, PlatformAuditAction, PlatformAuditLog } from '../../types';

export const PLATFORM_AUDIT_LABELS: Record<PlatformAuditAction, { label: string; color: string }> = {
  TENANT_CREATE: { label: 'Criou a clínica', color: '#15998B' },
  TENANT_UPDATE: { label: 'Editou a clínica', color: '#5BA8DE' },
  TENANT_SUSPEND: { label: 'Suspendeu', color: '#C25A4C' },
  TENANT_REACTIVATE: { label: 'Reativou', color: '#15998B' },
  TENANT_ENTER: { label: 'Entrou como', color: '#9B7BD4' },
  TENANT_PLAN_CHANGE: { label: 'Trocou o plano', color: '#D49A3A' },
  PLAN_CREATE: { label: 'Criou o plano', color: '#15998B' },
  PLAN_UPDATE: { label: 'Editou o plano', color: '#5BA8DE' },
  PLAN_ACTIVATE: { label: 'Ativou o plano', color: '#15998B' },
  PLAN_DEACTIVATE: { label: 'Desativou o plano', color: '#C25A4C' },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  slug: 'identificador',
  description: 'descrição',
  limits: 'limites',
};

type PlanRef = { name?: string } | null | undefined;

function changeValue(field: string, value: unknown): string {
  if (field === 'limits') return formatPlanLimits(value as PlanLimits | null);
  return value == null || value === '' ? '—' : String(value);
}

/** Resumo legível dos detalhes gravados em cada ação. */
export function auditDetailsText(entry: PlatformAuditLog): string | null {
  const d = entry.details;
  if (!d) return null;
  switch (entry.action) {
    case 'TENANT_CREATE': {
      const parts = [
        d.adminEmail ? `Administrador: ${d.adminName ?? ''} <${d.adminEmail}>` : null,
        (d.plan as PlanRef)?.name ? `Plano: ${(d.plan as PlanRef)!.name}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    }
    case 'TENANT_UPDATE':
    case 'PLAN_UPDATE':
      return Object.entries(d)
        .filter(([field]) => field !== 'planId')
        .map(([field, change]) => {
          const c = change as { old?: unknown; new?: unknown };
          return `${FIELD_LABELS[field] ?? field}: ${changeValue(field, c.old)} → ${changeValue(field, c.new)}`;
        })
        .join(' · ');
    case 'TENANT_PLAN_CHANGE':
      return `Plano: ${(d.old as PlanRef)?.name ?? 'sem plano'} → ${(d.new as PlanRef)?.name ?? 'sem plano'}`;
    case 'PLAN_CREATE':
      return `Limites: ${formatPlanLimits(d.limits as PlanLimits | null)}`;
    case 'TENANT_SUSPEND':
      return d.reason ? `Motivo: ${String(d.reason)}` : null;
    case 'TENANT_ENTER':
      return d.suspended ? 'Clínica estava suspensa' : null;
    default:
      return null;
  }
}

interface Props {
  entries: PlatformAuditLog[];
  loading?: boolean;
  /** Mostra o nome da clínica com link (na auditoria geral). */
  showTenant?: boolean;
  emptyText?: string;
}

export function PlatformAuditList({ entries, loading, showTenant, emptyText = 'Nenhuma ação registrada.' }: Props) {
  if (loading) {
    return (
      <Stack spacing={1.25} sx={{ px: 2.5, py: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={44} />
        ))}
      </Stack>
    );
  }
  if (entries.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ px: 2.5, py: 5, textAlign: 'center' }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {entries.map((entry) => {
        const meta = PLATFORM_AUDIT_LABELS[entry.action] ?? { label: entry.action, color: '#7C928D' };
        const details = auditDetailsText(entry);
        return (
          <Box
            component="li"
            key={entry.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '150px minmax(0, 1fr)' },
              gap: { xs: 0.5, sm: 2 },
              px: 2.5,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'grey.100',
              '&:last-of-type': { borderBottom: 0 },
            }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', pt: 0.4 }}>
              {formatDateTime(entry.createdAt)}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Box
                  component="span"
                  sx={{
                    fontSize: fontSizes.xs,
                    fontWeight: 700,
                    px: 1,
                    py: 0.3,
                    borderRadius: '8px',
                    color: meta.color,
                    bgcolor: alpha(meta.color, 0.12),
                  }}
                >
                  {meta.label}
                </Box>
                {showTenant && (
                  <Typography component="span" sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                    {entry.targetTenantId ? (
                      <Link component={RouterLink} to={`/admin/clinicas/${entry.targetTenantId}`} underline="hover">
                        {entry.targetName}
                      </Link>
                    ) : (
                      entry.targetName ?? '—'
                    )}
                  </Typography>
                )}
                <Typography component="span" sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>
                  por {entry.actorName}
                </Typography>
              </Stack>
              {details && (
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', mt: 0.5 }} noWrap title={details}>
                  {details}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

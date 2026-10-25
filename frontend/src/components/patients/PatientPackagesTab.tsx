import { Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';

import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import { brl } from '../../utils/money';
import { EmptyBlock } from './EmptyBlock';

const packageStatusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

const packageStatusColor: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  ACTIVE: 'success',
  COMPLETED: 'default',
  EXPIRED: 'warning',
  CANCELLED: 'error',
};

export function PatientPackagesTab({ patientPackages }: { patientPackages: any[] }) {
  return (
    <Stack spacing={1.5}>
      {patientPackages.length > 0 ? (
        patientPackages.map((pp: any) => (
          <PackageCard
            key={pp.id}
            name={pp.package?.name ?? 'Pacote'}
            status={pp.status}
            sessionsUsed={pp.sessionsUsed}
            sessionsTotal={pp.sessionsTotal}
            totalPaid={Number(pp.totalPaid)}
            expiresAt={pp.expiresAt}
          />
        ))
      ) : (
        <EmptyBlock message="Nenhum pacote vinculado." />
      )}
    </Stack>
  );
}

function PackageCard({
  name, status, sessionsUsed, sessionsTotal, totalPaid, expiresAt,
}: {
  name: string; status: string; sessionsUsed: number; sessionsTotal: number;
  totalPaid: number; expiresAt?: string | null;
}) {
  const progress = sessionsTotal > 0 ? Math.min(100, (sessionsUsed / sessionsTotal) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {brl.format(totalPaid)}
              {expiresAt ? ` · expira ${formatDateOnlyFromApi(expiresAt)}` : ''}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={packageStatusLabel[status] ?? status}
            color={packageStatusColor[status] ?? 'default'}
            variant={status === 'ACTIVE' ? 'filled' : 'outlined'}
          />
        </Stack>
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Sessões utilizadas</Typography>
            <Typography variant="caption" fontWeight={600}>{sessionsUsed}/{sessionsTotal}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

import { Card, Skeleton, Typography } from '@mui/material';

import { fontSizes } from '../../theme/fontSizes';

export function PatientStatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <Card sx={{ p: { xs: 2, sm: 2.25 } }}>
      {loading ? (
        <Skeleton variant="text" width={80} sx={{ fontSize: fontSizes['6xl'] }} />
      ) : (
        <Typography sx={{ fontSize: { xs: '1.4rem', sm: '1.65rem' }, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
        {label}
      </Typography>
    </Card>
  );
}


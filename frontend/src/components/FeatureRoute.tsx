import { ReactNode } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { PLATFORM_FEATURE_LABELS, type PlatformFeature } from '../features/platformFeatures';

interface FeatureRouteProps {
  feature: PlatformFeature;
  children: ReactNode;
}

/** Bloqueia a página se o módulo não está no plano efetivo da clínica. */
export function FeatureRoute({ feature, children }: FeatureRouteProps) {
  const { user } = useAuth();
  const features = user?.features ?? [];
  if (features.includes(feature)) return <>{children}</>;

  const label = PLATFORM_FEATURE_LABELS[feature];
  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        O módulo <strong>{label}</strong> não está incluído no plano desta clínica.
      </Alert>
      <Button component={RouterLink} to="/" variant="outlined">
        Voltar ao início
      </Button>
    </Box>
  );
}

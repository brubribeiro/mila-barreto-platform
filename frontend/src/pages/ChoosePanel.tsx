import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

import { useAuth } from '../contexts/AuthContext';
import { AuroraIcon } from '../components/AuroraIcon';
import { APP_VERSION } from '../version';
import { fontSizes } from '../theme/fontSizes';

const BRAND_BG = '#0E2926';

export function ChoosePanel() {
  const { user, selectPanel } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'clinic' | 'admin' | null>(null);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.canChoosePanel) {
    return <Navigate to={user.isSuperAdmin && !user.tenantId ? '/admin' : '/'} replace />;
  }

  async function choose(panel: 'clinic' | 'admin') {
    setError(null);
    setLoading(panel);
    try {
      await selectPanel(panel);
      navigate(panel === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível abrir o painel. Tente novamente.';
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  const year = new Date().getFullYear();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: `linear-gradient(155deg, ${BRAND_BG} 0%, #0E3F39 52%, #0E7C7B 130%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: '20px',
          bgcolor: 'background.paper',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,.45)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#22BBAA,#0E7C7B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AuroraIcon name="lock" size={22} strokeWidth={2} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: fontSizes.xl, letterSpacing: '-0.3px' }}>
              Escolha o painel
            </Typography>
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 500 }}>
              Olá, {user.name.split(' ')[0]} — onde deseja entrar?
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.5}>
          <Button
            variant="outlined"
            size="large"
            disabled={!!loading}
            onClick={() => choose('clinic')}
            sx={{
              justifyContent: 'flex-start',
              gap: 1.5,
              py: 1.75,
              borderRadius: '14px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: fontSizes.md,
            }}
          >
            {loading === 'clinic' ? (
              <CircularProgress size={22} />
            ) : (
              <BusinessOutlinedIcon color="primary" />
            )}
            <Box sx={{ textAlign: 'left' }}>
              <Box component="span" sx={{ display: 'block' }}>
                Painel da clínica
              </Box>
              <Box component="span" sx={{ display: 'block', fontWeight: 500, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Agenda, pacientes e rotina do dia a dia
              </Box>
            </Box>
          </Button>

          <Button
            variant="contained"
            size="large"
            disabled={!!loading}
            onClick={() => choose('admin')}
            sx={{
              justifyContent: 'flex-start',
              gap: 1.5,
              py: 1.75,
              borderRadius: '14px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: fontSizes.md,
            }}
          >
            {loading === 'admin' ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              <AdminPanelSettingsOutlinedIcon />
            )}
            <Box sx={{ textAlign: 'left' }}>
              <Box component="span" sx={{ display: 'block' }}>
                Painel da plataforma
              </Box>
              <Box component="span" sx={{ display: 'block', fontWeight: 500, fontSize: fontSizes.xs, opacity: 0.85 }}>
                Clínicas, planos, catálogos e auditoria (/admin)
              </Box>
            </Box>
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Typography sx={{ mt: 3, textAlign: 'center', fontSize: fontSizes['2xs'], color: 'text.secondary' }}>
          © {year} Mila Barreto · v{APP_VERSION}
        </Typography>
      </Box>
    </Box>
  );
}

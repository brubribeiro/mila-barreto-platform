import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  {
    icon: CalendarMonthOutlinedIcon,
    title: 'Agenda integrada',
    description: 'Horários, indisponibilidades e atendimentos em um só lugar.',
  },
  {
    icon: GroupsOutlinedIcon,
    title: 'Gestão de pacientes',
    description: 'Cadastro, histórico e comunicação organizados.',
  },
  {
    icon: InsightsOutlinedIcon,
    title: 'Visão do negócio',
    description: 'Financeiro, estoque e métricas para decisões rápidas.',
  },
] as const;

export function Login() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

  if (user) return <Navigate to="/" replace />;

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Falha ao autenticar com Google. Verifique se seu e-mail está cadastrado.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const brandingPanel = (
    <Box
      sx={{
        position: 'relative',
        flex: { md: '1 1 52%' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 3, sm: 5, md: 6, lg: 8 },
        py: { xs: 5, md: 6 },
        color: 'primary.contrastText',
        background: `linear-gradient(145deg,
          ${theme.palette.primary.dark} 0%,
          ${theme.palette.primary.main} 42%,
          ${alpha(theme.palette.primary.light, 0.95)} 100%)`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          top: -140,
          right: -100,
          bgcolor: alpha('#fff', 0.08),
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          bottom: -80,
          left: -60,
          bgcolor: alpha('#fff', 0.06),
        }}
      />

      <Stack spacing={4} sx={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2.5,
              bgcolor: alpha('#fff', 0.2),
              color: 'inherit',
              fontWeight: 800,
              fontSize: '1.1rem',
              border: `1px solid ${alpha('#fff', 0.35)}`,
              boxShadow: `0 8px 24px ${alpha('#000', 0.15)}`,
            }}
          >
            MB
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Mila Barreto
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
              Plataforma de gestão da clínica
            </Typography>
          </Box>
        </Stack>

        {!isMobile && (
          <Stack spacing={2.5}>
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Stack key={title} direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    mt: 0.25,
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha('#fff', 0.14),
                    display: 'flex',
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.25, lineHeight: 1.5 }}>
                    {description}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );

  const loginPanel = (
    <Box
      sx={{
        flex: { md: '1 1 48%' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, md: 6 },
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      {isMobile && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, alignSelf: 'stretch' }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              fontWeight: 800,
              fontSize: '0.95rem',
            }}
          >
            MB
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Mila Barreto
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gestão da clínica
            </Typography>
          </Box>
        </Stack>
      )}

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.9),
          boxShadow: `0 20px 50px ${alpha(theme.palette.primary.main, 0.08)},
            0 4px 16px ${alpha('#000', 0.04)}`,
          position: 'relative',
        }}
      >
        {submitting && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.72),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
            }}
          >
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Verificando acesso...
            </Typography>
          </Box>
        )}

        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            Bem-vinda de volta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Entre com a conta Google autorizada pela clínica.
          </Typography>
        </Stack>

        {googleClientId ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              '& iframe': { maxWidth: '100%' },
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Erro ao conectar com o Google')}
              text="signin_with"
              shape="rectangular"
              size="large"
              width={isMobile ? '300' : '352'}
              locale="pt-BR"
            />
          </Box>
        ) : (
          <Alert severity="warning">
            Configure <strong>VITE_GOOGLE_CLIENT_ID</strong> no arquivo .env para habilitar o login.
          </Alert>
        )}

        <Divider sx={{ my: 2.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            acesso restrito
          </Typography>
        </Divider>

        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.15 }} />
          <Typography variant="caption" color="text.secondary" lineHeight={1.55}>
            Apenas usuários cadastrados pela administração podem acessar. Em caso de dúvida, fale com o
            responsável da clínica.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Stack spacing={0.5} sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} Mila Barreto · Uso interno da clínica
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          <MuiLink component={Link} to="/termos" variant="caption" color="text.secondary">
            Termos de Uso
          </MuiLink>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <MuiLink component={Link} to="/privacidade" variant="caption" color="text.secondary">
            Política de Privacidade
          </MuiLink>
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {brandingPanel}
      {loginPanel}
    </Box>
  );
}

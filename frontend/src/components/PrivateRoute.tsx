import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/** Área da clínica: exige login; o super-admin só entra pelo "Entrar como" do painel. */
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Super-admin fora de uma clínica usa só o painel da plataforma
  if (user.isSuperAdmin && !user.tenantId) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

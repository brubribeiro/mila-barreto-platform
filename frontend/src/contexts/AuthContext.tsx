import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';
import { appPath } from '../utils/appPath';

type LoginResult = { needsPanelSelection?: boolean };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<LoginResult>;
  selectPanel: (panel: 'clinic' | 'admin') => Promise<void>;
  impersonate: (userId: string) => Promise<void>;
  /** Super-admin: entra numa clínica como administrador (modo "visualizando como"). */
  enterTenant: (tenantId: string) => Promise<void>;
  stopImpersonating: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLoginResponse(data: { access_token: string; user: User }) {
    localStorage.setItem('access_token', data.access_token);
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me.data);
    } catch {
      setUser(data.user);
    }
  }

  async function loginWithGoogle(credential: string): Promise<LoginResult> {
    const { data } = await api.post<{ access_token: string; user: User; needsPanelSelection?: boolean }>(
      '/auth/google',
      { credential },
    );
    await handleLoginResponse(data);
    return { needsPanelSelection: data.needsPanelSelection };
  }

  async function selectPanel(panel: 'clinic' | 'admin') {
    const { data } = await api.post<{ access_token: string; user: User }>('/auth/select-panel', { panel });
    await handleLoginResponse(data);
  }

  async function impersonate(userId: string) {
    // Salva o token original do admin para poder voltar
    const currentToken = localStorage.getItem('access_token');
    if (currentToken) {
      localStorage.setItem('admin_token', currentToken);
    }
    const { data } = await api.post<{ access_token: string; user: User }>(
      `/auth/impersonate/${userId}`,
    );
    localStorage.setItem('access_token', data.access_token);
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me.data);
    } catch {
      setUser(data.user);
    }
  }

  async function enterTenant(tenantId: string) {
    const currentToken = localStorage.getItem('access_token');
    if (currentToken) {
      localStorage.setItem('admin_token', currentToken);
    }
    let data: { access_token: string };
    try {
      ({ data } = await api.post<{ access_token: string }>(`/admin/tenants/${tenantId}/enter`));
    } catch (err) {
      localStorage.removeItem('admin_token');
      throw err;
    }
    localStorage.setItem('access_token', data.access_token);
    const me = await api.get<User>('/auth/me');
    setUser(me.data);
  }

  function stopImpersonating() {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) return;
    localStorage.setItem('access_token', adminToken);
    localStorage.removeItem('admin_token');
    // Super-admin volta para o detalhe da clínica no painel
    window.location.href = appPath(user?.isSuperAdmin && user.tenantId ? `/admin/clinicas/${user.tenantId}` : '/');
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_token');
    setUser(null);
    window.location.href = appPath('/login');
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogle, selectPanel, impersonate, enterTenant, stopImpersonating, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

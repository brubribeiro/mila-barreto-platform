import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  impersonate: (userId: string) => Promise<void>;
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

  /** Processa resposta de login (comum entre login normal e Google). */
  async function handleLoginResponse(data: { access_token: string; user: User }) {
    localStorage.setItem('access_token', data.access_token);
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me.data);
    } catch {
      setUser(data.user);
    }
  }

  async function loginWithGoogle(credential: string) {
    const { data } = await api.post<{ access_token: string; user: User }>('/auth/google', {
      credential,
    });
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

  function stopImpersonating() {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) return;
    localStorage.setItem('access_token', adminToken);
    localStorage.removeItem('admin_token');
    window.location.href = '/';
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_token');
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, impersonate, stopImpersonating, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

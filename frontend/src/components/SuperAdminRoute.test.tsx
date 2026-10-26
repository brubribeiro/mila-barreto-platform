import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PrivateRoute } from './PrivateRoute';
import { SuperAdminRoute } from './SuperAdminRoute';
import type { User } from '../types';

const auth = vi.hoisted(() => ({ user: null as Partial<User> | null, loading: false }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<p>login</p>} />
        <Route path="/" element={<PrivateRoute><p>app da clínica</p></PrivateRoute>} />
        <Route path="/admin" element={<SuperAdminRoute><p>painel admin</p></SuperAdminRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

const clinicAdmin = { id: 'u1', roleName: 'Administrador', tenantId: 't1', isSuperAdmin: false };
const superAdmin = { id: 'root', roleName: '', tenantId: null, isSuperAdmin: true };

describe('rotas do super-admin', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('super-admin logado vai direto para /admin', () => {
    auth.user = superAdmin;
    renderAt('/');
    expect(screen.getByText('painel admin')).toBeInTheDocument();
  });

  it('super-admin acessa /admin', () => {
    auth.user = superAdmin;
    renderAt('/admin');
    expect(screen.getByText('painel admin')).toBeInTheDocument();
  });

  it('usuário de clínica, mesmo administrador, não acessa /admin', () => {
    auth.user = clinicAdmin;
    renderAt('/admin');
    expect(screen.getByText('app da clínica')).toBeInTheDocument();
    expect(screen.queryByText('painel admin')).not.toBeInTheDocument();
  });

  it('super-admin "entrando como" uma clínica usa o app da clínica', () => {
    auth.user = { ...superAdmin, tenantId: 't1', tenantName: 'Clínica Um', impersonating: true };
    renderAt('/');
    expect(screen.getByText('app da clínica')).toBeInTheDocument();
  });

  it('sem login vai para /login', () => {
    renderAt('/admin');
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});

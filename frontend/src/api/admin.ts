import { api } from './client';
import type {
  AdminTenant,
  AdminTenantDetail,
  PlatformAuditLog,
  PlatformCatalogItem,
  PlatformCatalogKind,
} from '../types';

export type TenantStatusFilter = 'active' | 'suspended';

export interface CreateTenantPayload {
  name: string;
  slug?: string;
  adminName: string;
  adminEmail: string;
}

export interface UpdateTenantPayload {
  name?: string;
  slug?: string;
}

export interface CatalogItemPayload {
  kind: PlatformCatalogKind;
  value: string;
  label: string;
  sortOrder?: number;
  meta?: Record<string, unknown> | null;
  active?: boolean;
}

export interface PlatformAuditPage {
  data: PlatformAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Painel do super-admin (rotas /admin, só para isSuperAdmin). */
export const adminApi = {
  listTenants: async (params: { search?: string; status?: TenantStatusFilter } = {}): Promise<AdminTenant[]> => {
    const { data } = await api.get<AdminTenant[]>('/admin/tenants', { params });
    return data;
  },

  getTenant: async (id: string): Promise<AdminTenantDetail> => {
    const { data } = await api.get<AdminTenantDetail>(`/admin/tenants/${id}`);
    return data;
  },

  createTenant: async (payload: CreateTenantPayload): Promise<AdminTenant> => {
    const { data } = await api.post<AdminTenant>('/admin/tenants', payload);
    return data;
  },

  updateTenant: async (id: string, payload: UpdateTenantPayload): Promise<AdminTenant> => {
    const { data } = await api.patch<AdminTenant>(`/admin/tenants/${id}`, payload);
    return data;
  },

  suspendTenant: async (id: string, reason?: string): Promise<AdminTenant> => {
    const { data } = await api.post<AdminTenant>(`/admin/tenants/${id}/suspend`, { reason });
    return data;
  },

  reactivateTenant: async (id: string): Promise<AdminTenant> => {
    const { data } = await api.post<AdminTenant>(`/admin/tenants/${id}/reactivate`);
    return data;
  },

  enterTenant: async (id: string): Promise<{ access_token: string }> => {
    const { data } = await api.post<{ access_token: string }>(`/admin/tenants/${id}/enter`);
    return data;
  },

  listAudit: async (params: { tenantId?: string; page?: number; limit?: number } = {}): Promise<PlatformAuditPage> => {
    const { data } = await api.get<PlatformAuditPage>('/admin/audit', { params });
    return data;
  },

  listCatalogs: async (kind?: PlatformCatalogKind): Promise<PlatformCatalogItem[]> => {
    const { data } = await api.get<PlatformCatalogItem[]>('/admin/catalogs', {
      params: kind ? { kind } : undefined,
    });
    return data;
  },

  createCatalogItem: async (payload: CatalogItemPayload): Promise<PlatformCatalogItem> => {
    const { data } = await api.post<PlatformCatalogItem>('/admin/catalogs', payload);
    return data;
  },

  updateCatalogItem: async (
    id: string,
    payload: Partial<Omit<CatalogItemPayload, 'kind'>>,
  ): Promise<PlatformCatalogItem> => {
    const { data } = await api.patch<PlatformCatalogItem>(`/admin/catalogs/${id}`, payload);
    return data;
  },

  setCatalogItemActive: async (id: string, active: boolean): Promise<PlatformCatalogItem> => {
    const { data } = await api.post<PlatformCatalogItem>(
      `/admin/catalogs/${id}/${active ? 'activate' : 'deactivate'}`,
    );
    return data;
  },
};

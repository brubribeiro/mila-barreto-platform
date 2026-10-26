import { api } from './client';
import type { PlatformCatalogKind, PlatformCatalogOption } from '../types';

/** Catálogo global da plataforma (leitura no app da clínica; só itens ativos). */
export const catalogsApi = {
  list: async (kind?: PlatformCatalogKind): Promise<PlatformCatalogOption[]> => {
    const { data } = await api.get<PlatformCatalogOption[]>('/catalogs', {
      params: kind ? { kind } : undefined,
    });
    return data;
  },
};

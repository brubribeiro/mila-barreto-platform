import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogsApi } from '../api/catalogs';
import {
  CATALOG_FALLBACKS,
  getCatalogItems,
  setCatalogCache,
  setCatalogCacheFromList,
} from '../features/platformCatalog';
import type { PlatformCatalogKind, PlatformCatalogOption } from '../types';

const STALE_MS = 5 * 60 * 1000;

/** Prefetch de todos os catálogos ativos (Layout da clínica). */
export function usePrefetchPlatformCatalogs(enabled = true) {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const items = await catalogsApi.list();
      setCatalogCacheFromList(items);
      return items;
    },
    enabled,
    staleTime: STALE_MS,
  });
}

/** Itens ativos de um tipo; fallback local enquanto carrega. */
export function usePlatformCatalog(kind: PlatformCatalogKind): PlatformCatalogOption[] {
  const { data } = useQuery({
    queryKey: ['catalogs', kind],
    queryFn: async () => {
      const items = await catalogsApi.list(kind);
      setCatalogCache(kind, items);
      return items;
    },
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data) setCatalogCache(kind, data);
  }, [kind, data]);

  return data && data.length > 0 ? data : getCatalogItems(kind) ?? CATALOG_FALLBACKS[kind];
}

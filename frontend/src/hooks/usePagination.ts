import { useEffect, useState, type DependencyList } from 'react';

/**
 * Paginação client-side de uma lista já filtrada.
 * `resetDeps`: volta à primeira página quando algum desses valores muda (busca, filtros).
 */
export function usePagination<T>(items: T[], pageSize: number, resetDeps: DependencyList = []) {
  const [page, setPage] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(0), resetDeps);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  return {
    page: current,
    setPage,
    pageCount,
    rows: items.slice(current * pageSize, current * pageSize + pageSize),
    /** Primeiro e último item exibidos (base 1), para "Mostrando X–Y de Z". */
    rangeStart: current * pageSize + 1,
    rangeEnd: Math.min((current + 1) * pageSize, items.length),
  };
}

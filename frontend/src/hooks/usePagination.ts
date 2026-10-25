import { useUrlState, urlPage } from './useUrlState';

/**
 * Paginação client-side de uma lista já filtrada. A página fica na URL (`?pagina=2`).
 * Quem altera busca/filtros deve chamar `setPage(0)` no handler (não há reset por efeito,
 * senão a página restaurada da URL seria zerada ao montar).
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useUrlState('pagina', 0, urlPage);

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

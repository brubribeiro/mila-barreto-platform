import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

export interface UrlCodec<T> {
  /** Retorna `undefined` quando o valor da URL é inválido (cai no padrão). */
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
}

export const urlString: UrlCodec<string> = {
  parse: (raw) => raw,
  serialize: (value) => value,
};

/** Aceita só os valores listados; qualquer outro cai no padrão. */
export function urlEnum<T extends string>(values: readonly T[]): UrlCodec<T> {
  return {
    parse: (raw) => (values.includes(raw as T) ? (raw as T) : undefined),
    serialize: (value) => value,
  };
}

/** Página 0-based no estado, 1-based na URL (`?pagina=2` é a segunda página). */
export const urlPage: UrlCodec<number> = {
  parse: (raw) => {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 ? n - 1 : undefined;
  },
  serialize: (value) => String(value + 1),
};

export const urlInt: UrlCodec<number> = {
  parse: (raw) => {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  },
  serialize: (value) => String(value),
};

/** Lista separada por vírgula (`?profissionais=a,b`). */
export const urlList: UrlCodec<string[]> = {
  parse: (raw) => raw.split(',').filter(Boolean),
  serialize: (value) => value.join(','),
};

/** Data `YYYY-MM-DD`. */
export const urlDate: UrlCodec<string> = {
  parse: (raw) => (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined),
  serialize: (value) => value,
};

type SetUrlState<T> = (action: T | ((prev: T) => T)) => void;

function readCurrentParams() {
  // Lê da URL atual (e não do render) para que vários setters chamados no
  // mesmo evento — ex.: busca + voltar à página 1 — não sobrescrevam um ao outro.
  return new URLSearchParams(window.location.search);
}

/**
 * Estado sincronizado com um parâmetro da query string (history.replace).
 * O valor padrão não aparece na URL.
 */
export function useUrlState<T = string>(
  key: string,
  defaultValue: T,
  codec: UrlCodec<T> = urlString as unknown as UrlCodec<T>,
): [T, SetUrlState<T>] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(key);
  const defaultSerialized = codec.serialize(defaultValue);

  const value = useMemo(() => {
    if (raw == null || raw === '') return defaultValue;
    return codec.parse(raw) ?? defaultValue;
    // defaultValue entra pela forma serializada para aceitar arrays/objetos literais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, defaultSerialized, codec]);

  const setValue = useCallback<SetUrlState<T>>(
    (action) => {
      const current = readCurrentParams();
      const currentRaw = current.get(key);
      const prev =
        currentRaw == null || currentRaw === ''
          ? defaultValue
          : (codec.parse(currentRaw) ?? defaultValue);
      const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
      const serialized = codec.serialize(next);
      if (serialized === defaultSerialized || serialized === '') current.delete(key);
      else current.set(key, serialized);
      if (current.toString() === readCurrentParams().toString()) return;
      setSearchParams(current, { replace: true, preventScrollReset: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, defaultSerialized, codec, setSearchParams],
  );

  return [value, setValue];
}

const sortCodec: UrlCodec<GridSortModel> = {
  parse: (raw) => {
    const field = raw.replace(/^-/, '');
    if (!field) return undefined;
    return [{ field, sort: raw.startsWith('-') ? 'desc' : 'asc' }];
  },
  serialize: (model) => {
    const first = model[0];
    if (!first?.sort) return '';
    return `${first.sort === 'desc' ? '-' : ''}${first.field}`;
  },
};

const EMPTY_SORT: GridSortModel = [];
const DEFAULT_PAGE_SIZE = 10;

/**
 * Página, tamanho de página e ordenação de um `AppDataGrid` na URL
 * (`?pagina=2&porPagina=25&ordem=-nome`). Espalhar `gridProps` no grid e chamar
 * `resetPage` quando um filtro mudar.
 */
export function useUrlGridState(pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useUrlState('pagina', 0, urlPage);
  const [size, setSize] = useUrlState('porPagina', pageSize, urlInt);
  const [sortModel, setSortModel] = useUrlState('ordem', EMPTY_SORT, sortCodec);

  const paginationModel = useMemo<GridPaginationModel>(
    () => ({ page, pageSize: size }),
    [page, size],
  );

  const onPaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      setSize(model.pageSize);
      setPage(model.page);
    },
    [setPage, setSize],
  );

  const onSortModelChange = useCallback(
    (model: GridSortModel) => {
      setSortModel(model);
      setPage(0);
    },
    [setPage, setSortModel],
  );

  const resetPage = useCallback(() => setPage(0), [setPage]);

  return {
    gridProps: { paginationModel, onPaginationModelChange, sortModel, onSortModelChange },
    resetPage,
  };
}

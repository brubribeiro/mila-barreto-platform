import { describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { urlEnum, urlPage, useUrlState } from './useUrlState';

const wrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</BrowserRouter>
);

const STATUS_CODEC = urlEnum(['ALL', 'ACTIVE', 'INACTIVE'] as const);

function useListState() {
  const [search, setSearch] = useUrlState('busca', '');
  const [status, setStatus] = useUrlState<'ALL' | 'ACTIVE' | 'INACTIVE'>('status', 'ALL', STATUS_CODEC);
  const [page, setPage] = useUrlState('pagina', 0, urlPage);
  return { search, setSearch, status, setStatus, page, setPage };
}

describe('useUrlState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('restores values from the query string', () => {
    window.history.replaceState(null, '', '/?busca=ana&status=ACTIVE&pagina=3');
    const { result } = renderHook(useListState, { wrapper });
    expect(result.current.search).toBe('ana');
    expect(result.current.status).toBe('ACTIVE');
    expect(result.current.page).toBe(2);
  });

  it('falls back to the default for invalid values', () => {
    window.history.replaceState(null, '', '/?status=FOO&pagina=-1');
    const { result } = renderHook(useListState, { wrapper });
    expect(result.current.status).toBe('ALL');
    expect(result.current.page).toBe(0);
  });

  it('keeps defaults out of the URL and composes setters called together', () => {
    const { result } = renderHook(useListState, { wrapper });
    act(() => result.current.setPage(4));
    act(() => {
      result.current.setSearch('maria');
      result.current.setPage(0);
    });
    expect(window.location.search).toBe('?busca=maria');
    expect(result.current.search).toBe('maria');

    act(() => result.current.setStatus('INACTIVE'));
    act(() => result.current.setPage((p) => p + 1));
    expect(window.location.search).toBe('?busca=maria&status=INACTIVE&pagina=2');

    act(() => {
      result.current.setSearch('');
      result.current.setStatus('ALL');
      result.current.setPage(0);
    });
    expect(window.location.search).toBe('');
  });

  it('replaces the history entry instead of pushing', () => {
    const { result } = renderHook(useListState, { wrapper });
    const length = window.history.length;
    act(() => result.current.setSearch('a'));
    act(() => result.current.setSearch('ab'));
    expect(window.history.length).toBe(length);
  });
});

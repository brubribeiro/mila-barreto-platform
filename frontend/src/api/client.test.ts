import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// We need to mock import.meta.env before importing the module
vi.stubGlobal('import', { meta: { env: {} } });

describe('API client interceptors', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('localStorage mock works correctly', () => {
    localStorageMock.setItem('access_token', 'test-token');
    expect(localStorageMock.getItem('access_token')).toBe('test-token');
    localStorageMock.removeItem('access_token');
    expect(localStorageMock.getItem('access_token')).toBeNull();
  });
});

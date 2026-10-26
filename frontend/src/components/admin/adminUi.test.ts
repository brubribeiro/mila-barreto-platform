import { describe, it, expect } from 'vitest';

import { formatBytes, formatLastAccess } from './adminUi';

describe('adminUi', () => {
  const now = new Date('2026-10-26T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('formatLastAccess', () => {
    expect(formatLastAccess(null, now)).toBe('Nunca');
    expect(formatLastAccess(ago(20_000), now)).toBe('agora');
    expect(formatLastAccess(ago(5 * 60_000), now)).toBe('há 5 min');
    expect(formatLastAccess(ago(3 * 3_600_000), now)).toBe('há 3 h');
    expect(formatLastAccess(ago(26 * 3_600_000), now)).toBe('há 1 dia');
    expect(formatLastAccess(ago(10 * 86_400_000), now)).toBe('há 10 dias');
    expect(formatLastAccess('2026-08-01T12:00:00Z', now)).toBe('01/08/2026');
  });

  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
    expect(formatBytes(3.2 * 1024 ** 3)).toBe('3,2 GB');
  });
});

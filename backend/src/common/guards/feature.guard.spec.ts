import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { FeatureGuard } from './feature.guard';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';

describe('FeatureGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new FeatureGuard(reflector);

  const ctx = (user: unknown) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReset();
  });

  it('sem @RequireFeature libera', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ features: [] }))).toBe(true);
  });

  it('nega com 403 quando o módulo não está no plano efetivo', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('finance');
    expect(() =>
      guard.canActivate(
        ctx({
          isSuperAdmin: false,
          tenantId: 't1',
          features: ['patients', 'appointments'],
        }),
      ),
    ).toThrow(ForbiddenException);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(FEATURE_KEY, expect.any(Array));
  });

  it('libera quando a clínica tem o módulo', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('finance');
    expect(
      guard.canActivate(
        ctx({ isSuperAdmin: false, tenantId: 't1', features: ['finance'] }),
      ),
    ).toBe(true);
  });

  it('super-admin sem clínica (painel) passa', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('finance');
    expect(
      guard.canActivate(ctx({ isSuperAdmin: true, tenantId: null, features: [] })),
    ).toBe(true);
  });
});

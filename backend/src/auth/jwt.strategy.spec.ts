import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { ALL_PERMISSIONS } from '../common/permissions';

describe('JwtStrategy', () => {
  const superAdmin = {
    id: 'root-1',
    name: 'Dono',
    email: 'root@platform.dev',
    tenantId: null,
    tenant: null,
    isSuperAdmin: true,
    active: true,
    roleId: null,
    role: null,
    providesAppointments: false,
    lastAccessAt: null,
  };
  const clinicUser = {
    ...superAdmin,
    id: 'user-1',
    email: 'ana@clinica.com',
    tenantId: 'tenant-1',
    tenant: { id: 'tenant-1', name: 'Clínica Um', active: true },
    isSuperAdmin: false,
    roleId: 'role-1',
    role: { name: 'Recepção', permissions: ['patients:view'], restrictToOwnAppointments: false },
    lastAccessAt: new Date(),
  };

  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock }; tenant: { findUnique: jest.Mock } };
  let strategy: JwtStrategy;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      tenant: { findUnique: jest.fn() },
    };
    const config = { get: () => 'secret' } as unknown as ConfigService;
    strategy = new JwtStrategy(config, prisma as any);
  });

  describe('super-admin "entrando como" clínica', () => {
    it('age como administrador da clínica alvo, com o nome dela', async () => {
      prisma.user.findUnique.mockResolvedValue(superAdmin);
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-2', name: 'Clínica Dois', active: true });

      const user = await strategy.validate({
        sub: 'root-1',
        email: superAdmin.email,
        tenantId: 'tenant-2',
        impersonatorId: 'root-1',
      });

      expect(user).toMatchObject({
        id: 'root-1',
        tenantId: 'tenant-2',
        tenantName: 'Clínica Dois',
        isSuperAdmin: true,
        roleName: 'Administrador',
        impersonatorId: 'root-1',
      });
      expect(user.permissions).toEqual(ALL_PERMISSIONS);
    });

    it('vale também para clínica suspensa (suporte)', async () => {
      prisma.user.findUnique.mockResolvedValue(superAdmin);
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-2', name: 'Clínica Dois', active: false });

      await expect(
        strategy.validate({ sub: 'root-1', email: superAdmin.email, tenantId: 'tenant-2', impersonatorId: 'root-1' }),
      ).resolves.toMatchObject({ tenantId: 'tenant-2' });
    });

    it('recusa clínica inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(superAdmin);
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'root-1', email: superAdmin.email, tenantId: 'x', impersonatorId: 'root-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('recusa token com tenant de usuário que não é super-admin', async () => {
      prisma.user.findUnique.mockResolvedValue(clinicUser);

      await expect(
        strategy.validate({ sub: 'user-1', email: clinicUser.email, tenantId: 'tenant-2', impersonatorId: 'user-1' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('último acesso', () => {
    it('grava lastAccessAt quando o último registro é antigo', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...clinicUser, lastAccessAt: new Date(Date.now() - 10 * 60_000) });

      await strategy.validate({ sub: 'user-1', email: clinicUser.email, tenantId: 'tenant-1' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastAccessAt: expect.any(Date) },
      });
    });

    it('não grava de novo dentro do intervalo', async () => {
      prisma.user.findUnique.mockResolvedValue(clinicUser);

      await strategy.validate({ sub: 'user-1', email: clinicUser.email, tenantId: 'tenant-1' });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('não conta personificação como acesso do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...clinicUser, lastAccessAt: null });

      await strategy.validate({ sub: 'user-1', email: clinicUser.email, tenantId: 'tenant-1', impersonatorId: 'admin-1' });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});

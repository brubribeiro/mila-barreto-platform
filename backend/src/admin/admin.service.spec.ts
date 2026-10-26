import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { AdminService, currentBrazilMonthRange, slugify } from './admin.service';
import { TenantContext } from '../tenancy/tenant-context';
import { provisionTenant } from '../tenancy/system-roles';

jest.mock('../tenancy/system-roles', () => ({ provisionTenant: jest.fn() }));

describe('AdminService', () => {
  const actor = { id: 'root-1', name: 'Dono', email: 'root@platform.dev', isSuperAdmin: true } as any;
  const tenant = { id: 'tenant-1', name: 'Clínica Um', slug: 'clinica-um', active: true, suspendedAt: null };

  let prisma: any;
  let auth: { signTenantAccess: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      tenant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), groupBy: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
      appointment: { groupBy: jest.fn(), count: jest.fn() },
      patient: { count: jest.fn() },
      document: { aggregate: jest.fn() },
      patientPhoto: { aggregate: jest.fn() },
      platformAuditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };
    auth = { signTenantAccess: jest.fn().mockResolvedValue('acting-token') };
    service = new AdminService(prisma, auth as any);
    (provisionTenant as jest.Mock).mockReset();
  });

  const lastAudit = () => prisma.platformAuditLog.create.mock.calls.at(-1)?.[0].data;

  describe('slugify', () => {
    it('remove acentos e símbolos', () => {
      expect(slugify('  Clínica Bela & Pele São José ')).toBe('clinica-bela-pele-sao-jose');
    });
  });

  describe('currentBrazilMonthRange', () => {
    it('usa o mês do Brasil, não o do UTC', () => {
      // 1º/nov 01:00 UTC ainda é 31/out no Brasil
      const range = currentBrazilMonthRange(new Date('2026-11-01T01:00:00Z'));
      expect(range.gte.toISOString()).toBe('2026-10-01T03:00:00.000Z');
      expect(range.lt.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    });

    it('vira o ano em dezembro', () => {
      const range = currentBrazilMonthRange(new Date('2026-12-15T12:00:00Z'));
      expect(range.lt.toISOString()).toBe('2027-01-01T03:00:00.000Z');
    });
  });

  it('roda as consultas sem escopo de clínica', async () => {
    const spy = jest.spyOn(TenantContext, 'runUnscoped');
    prisma.tenant.findMany.mockResolvedValue([]);
    prisma.user.groupBy.mockResolvedValue([]);
    prisma.appointment.groupBy.mockResolvedValue([]);

    await service.listTenants({});

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('listTenants', () => {
    it('filtra por busca e status e junta as métricas por clínica', async () => {
      const lastAccessAt = new Date('2026-10-20T12:00:00Z');
      prisma.tenant.findMany.mockResolvedValue([{ ...tenant, _count: { users: 3, patients: 40 } }]);
      prisma.user.groupBy.mockResolvedValue([{ tenantId: 'tenant-1', _max: { lastAccessAt } }]);
      prisma.appointment.groupBy.mockResolvedValue([{ tenantId: 'tenant-1', _count: { _all: 12 } }]);

      const result = await service.listTenants({ search: ' bela ', status: 'suspended' });

      expect(prisma.tenant.findMany.mock.calls[0][0].where).toEqual({
        OR: [
          { name: { contains: 'bela', mode: 'insensitive' } },
          { slug: { contains: 'bela', mode: 'insensitive' } },
        ],
        active: false,
      });
      expect(result).toEqual([
        {
          ...tenant,
          metrics: { activeUsers: 3, patients: 40, appointmentsThisMonth: 12, lastAccessAt },
        },
      ]);
    });
  });

  describe('getTenant', () => {
    it('soma documentos e fotos no armazenamento', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      prisma.user.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
      prisma.patient.count.mockResolvedValue(10);
      prisma.appointment.count.mockResolvedValue(5);
      prisma.user.aggregate.mockResolvedValue({ _max: { lastAccessAt: null } });
      prisma.document.aggregate.mockResolvedValue({ _sum: { size: 1000 }, _count: { _all: 2 } });
      prisma.patientPhoto.aggregate.mockResolvedValue({ _sum: { size: null }, _count: { _all: 0 } });
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getTenant('tenant-1');

      expect(result.metrics).toEqual({
        activeUsers: 2,
        totalUsers: 3,
        patients: 10,
        appointmentsThisMonth: 5,
        lastAccessAt: null,
        storageBytes: 1000,
        files: 2,
      });
    });

    it('404 para clínica inexistente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getTenant('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTenant', () => {
    const dto = { name: 'Clínica Bela Pele', adminName: 'Ana', adminEmail: 'ana@belapele.com' };

    it('provisiona a clínica com o primeiro administrador e audita', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      (provisionTenant as jest.Mock).mockResolvedValue({ id: 'tenant-2', name: dto.name });

      await service.createTenant(dto, actor);

      expect(provisionTenant).toHaveBeenCalledWith(
        prisma,
        { name: dto.name, slug: 'clinica-bela-pele' },
        { name: 'Ana', email: 'ana@belapele.com', password: expect.any(String) },
      );
      expect(lastAudit()).toMatchObject({
        action: 'TENANT_CREATE',
        actorId: 'root-1',
        targetTenantId: 'tenant-2',
        details: { slug: 'clinica-bela-pele', adminEmail: 'ana@belapele.com' },
      });
    });

    it('recusa identificador já usado', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      await expect(service.createTenant({ ...dto, slug: 'clinica-um' }, actor)).rejects.toThrow(ConflictException);
      expect(provisionTenant).not.toHaveBeenCalled();
    });

    it('recusa e-mail que já existe na plataforma', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'u' });
      await expect(service.createTenant(dto, actor)).rejects.toThrow(ConflictException);
      expect(provisionTenant).not.toHaveBeenCalled();
    });

    it('recusa nome sem letras nem números quando não há identificador', async () => {
      await expect(service.createTenant({ ...dto, name: '***' }, actor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTenant', () => {
    it('audita só os campos alterados', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      prisma.tenant.update.mockResolvedValue({ ...tenant, name: 'Clínica Nova' });

      await service.updateTenant('tenant-1', { name: 'Clínica Nova', slug: 'clinica-um' }, actor);

      expect(lastAudit()).toMatchObject({
        action: 'TENANT_UPDATE',
        targetName: 'Clínica Nova',
        details: { name: { old: 'Clínica Um', new: 'Clínica Nova' } },
      });
    });

    it('não audita quando nada mudou', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      prisma.tenant.update.mockResolvedValue(tenant);
      await service.updateTenant('tenant-1', { name: 'Clínica Um' }, actor);
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('suspender e reativar', () => {
    it('suspende com data e motivo na auditoria', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);
      prisma.tenant.update.mockResolvedValue({ ...tenant, active: false });

      await service.suspendTenant('tenant-1', 'Inadimplência', actor);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { active: false, suspendedAt: expect.any(Date) },
      });
      expect(lastAudit()).toMatchObject({ action: 'TENANT_SUSPEND', details: { reason: 'Inadimplência' } });
    });

    it('suspender clínica já suspensa não faz nada', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...tenant, active: false });
      await service.suspendTenant('tenant-1', undefined, actor);
      expect(prisma.tenant.update).not.toHaveBeenCalled();
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });

    it('reativa limpando suspendedAt', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...tenant, active: false });
      prisma.tenant.update.mockResolvedValue(tenant);

      await service.reactivateTenant('tenant-1', actor);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { active: true, suspendedAt: null },
      });
      expect(lastAudit()).toMatchObject({ action: 'TENANT_REACTIVATE' });
    });
  });

  describe('enterTenant', () => {
    it('devolve o token e sempre registra na auditoria', async () => {
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.enterTenant('tenant-1', actor);

      expect(auth.signTenantAccess).toHaveBeenCalledWith(actor, 'tenant-1');
      expect(result).toEqual({ access_token: 'acting-token', tenant: { id: 'tenant-1', name: 'Clínica Um' } });
      expect(lastAudit()).toMatchObject({
        action: 'TENANT_ENTER',
        actorId: 'root-1',
        actorEmail: 'root@platform.dev',
        targetTenantId: 'tenant-1',
      });
    });

    it('404 sem emitir token para clínica inexistente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.enterTenant('x', actor)).rejects.toThrow(NotFoundException);
      expect(auth.signTenantAccess).not.toHaveBeenCalled();
    });
  });

  describe('listAudit', () => {
    it('pagina e filtra por clínica', async () => {
      prisma.platformAuditLog.findMany.mockResolvedValue([]);
      prisma.platformAuditLog.count.mockResolvedValue(120);

      const result = await service.listAudit({ tenantId: 'tenant-1', page: 2, limit: 500 });

      expect(prisma.platformAuditLog.findMany).toHaveBeenCalledWith({
        where: { targetTenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
        skip: 100,
        take: 100,
      });
      expect(result).toMatchObject({ total: 120, page: 2, limit: 100, totalPages: 2 });
    });
  });
});

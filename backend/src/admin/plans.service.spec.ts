import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { normalizeLimits, PlansService } from './plans.service';
import { TenantContext } from '../tenancy/tenant-context';

describe('PlansService', () => {
  const actor = { id: 'root-1', name: 'Dono', email: 'root@platform.dev', isSuperAdmin: true } as any;
  const plan = {
    id: 'plan-1',
    name: 'Essencial',
    slug: 'essencial',
    description: null,
    limits: { maxUsers: 3 },
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let service: PlansService;

  beforeEach(() => {
    prisma = {
      plan: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      tenant: { count: jest.fn().mockResolvedValue(0) },
      platformAuditLog: { create: jest.fn() },
    };
    service = new PlansService(prisma);
  });

  const lastAudit = () => prisma.platformAuditLog.create.mock.calls.at(-1)?.[0].data;

  describe('normalizeLimits', () => {
    it('guarda só os limites informados', () => {
      expect(normalizeLimits({ maxUsers: 5, maxPatients: null, storageGb: undefined })).toEqual({ maxUsers: 5 });
    });

    it('sem limites vira coluna nula; undefined não mexe', () => {
      expect(normalizeLimits({})).toBe(Prisma.DbNull);
      expect(normalizeLimits(null)).toBe(Prisma.DbNull);
      expect(normalizeLimits(undefined)).toBeUndefined();
    });
  });

  it('lista em ordem de criação com o número de clínicas, sem escopo de clínica', async () => {
    const spy = jest.spyOn(TenantContext, 'runUnscoped');
    prisma.plan.findMany.mockResolvedValue([{ ...plan, _count: { tenants: 4 } }]);

    const result = await service.listPlans();

    expect(spy).toHaveBeenCalled();
    expect(prisma.plan.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    expect(result).toEqual([{ ...plan, tenantCount: 4 }]);
    spy.mockRestore();
  });

  it('detalhe de plano inexistente dá 404', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);
    await expect(service.getPlan('x')).rejects.toThrow(NotFoundException);
  });

  describe('createPlan', () => {
    it('gera o identificador pelo nome e audita sem clínica alvo', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);
      prisma.plan.create.mockImplementation(({ data }: any) => ({ ...plan, ...data, id: 'plan-9' }));

      const result = await service.createPlan(
        { name: 'Clínica Plus', description: 'Desc', limits: { maxUsers: 8 } },
        actor,
      );

      expect(prisma.plan.create).toHaveBeenCalledWith({
        data: { name: 'Clínica Plus', slug: 'clinica-plus', description: 'Desc', limits: { maxUsers: 8 } },
      });
      expect(result.tenantCount).toBe(0);
      expect(lastAudit()).toMatchObject({
        action: 'PLAN_CREATE',
        actorId: 'root-1',
        targetTenantId: null,
        targetName: 'Clínica Plus',
        details: { planId: 'plan-9', slug: 'clinica-plus', limits: { maxUsers: 8 } },
      });
    });

    it('recusa identificador já usado', async () => {
      prisma.plan.findUnique.mockResolvedValue(plan);
      await expect(service.createPlan({ name: 'Essencial' }, actor)).rejects.toThrow(ConflictException);
      expect(prisma.plan.create).not.toHaveBeenCalled();
    });

    it('recusa nome sem letras nem números quando não há identificador', async () => {
      await expect(service.createPlan({ name: '***' }, actor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePlan', () => {
    it('audita só os campos alterados, incluindo limites', async () => {
      prisma.plan.findUnique.mockResolvedValue(plan);
      prisma.plan.update.mockResolvedValue({ ...plan, name: 'Básico', limits: { maxUsers: 5 } });

      await service.updatePlan('plan-1', { name: 'Básico', limits: { maxUsers: 5 } }, actor);

      expect(prisma.plan.update.mock.calls[0][0].data).toMatchObject({ name: 'Básico', limits: { maxUsers: 5 } });
      expect(lastAudit()).toMatchObject({
        action: 'PLAN_UPDATE',
        targetName: 'Básico',
        details: {
          planId: 'plan-1',
          name: { old: 'Essencial', new: 'Básico' },
          limits: { old: { maxUsers: 3 }, new: { maxUsers: 5 } },
        },
      });
      expect(lastAudit().details).not.toHaveProperty('slug');
    });

    it('não audita quando nada mudou', async () => {
      prisma.plan.findUnique.mockResolvedValue(plan);
      prisma.plan.update.mockResolvedValue(plan);
      await service.updatePlan('plan-1', { name: 'Essencial' }, actor);
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });

    it('recusa identificador de outro plano', async () => {
      prisma.plan.findUnique.mockResolvedValueOnce(plan).mockResolvedValueOnce({ ...plan, id: 'plan-2' });
      await expect(service.updatePlan('plan-1', { slug: 'profissional' }, actor)).rejects.toThrow(ConflictException);
      expect(prisma.plan.update).not.toHaveBeenCalled();
    });
  });

  describe('ativar e desativar', () => {
    it('desativa e audita', async () => {
      prisma.plan.findUnique.mockResolvedValue(plan);
      prisma.plan.update.mockResolvedValue({ ...plan, active: false });
      prisma.tenant.count.mockResolvedValue(2);

      const result = await service.setActive('plan-1', false, actor);

      expect(prisma.plan.update).toHaveBeenCalledWith({ where: { id: 'plan-1' }, data: { active: false } });
      expect(lastAudit()).toMatchObject({ action: 'PLAN_DEACTIVATE', details: { planId: 'plan-1' } });
      expect(result).toMatchObject({ active: false, tenantCount: 2 });
    });

    it('reativa e audita', async () => {
      prisma.plan.findUnique.mockResolvedValue({ ...plan, active: false });
      prisma.plan.update.mockResolvedValue(plan);
      await service.setActive('plan-1', true, actor);
      expect(lastAudit()).toMatchObject({ action: 'PLAN_ACTIVATE' });
    });

    it('sem mudança de estado não grava nem audita', async () => {
      prisma.plan.findUnique.mockResolvedValue(plan);
      await service.setActive('plan-1', true, actor);
      expect(prisma.plan.update).not.toHaveBeenCalled();
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });
  });
});

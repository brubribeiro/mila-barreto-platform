import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { CatalogsService } from './catalogs.service';
import { TenantContext } from '../tenancy/tenant-context';

describe('CatalogsService', () => {
  const actor = { id: 'root-1', name: 'Dono', email: 'root@platform.dev', isSuperAdmin: true } as any;
  const item = {
    id: 'cat-1',
    kind: 'document_category',
    value: 'contrato',
    label: 'Contrato',
    sortOrder: 0,
    active: true,
    meta: { color: '#5C6BC0' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let service: CatalogsService;

  beforeEach(() => {
    prisma = {
      platformCatalogItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      platformAuditLog: { create: jest.fn() },
    };
    service = new CatalogsService(prisma);
  });

  const lastAudit = () => prisma.platformAuditLog.create.mock.calls.at(-1)?.[0].data;

  it('lista no admin sem escopo de clínica', async () => {
    const spy = jest.spyOn(TenantContext, 'runUnscoped');
    prisma.platformCatalogItem.findMany.mockResolvedValue([item]);

    const result = await service.listForAdmin('document_category');

    expect(spy).toHaveBeenCalled();
    expect(prisma.platformCatalogItem.findMany).toHaveBeenCalledWith({
      where: { kind: 'document_category' },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
    expect(result).toEqual([item]);
    spy.mockRestore();
  });

  it('leitura da clínica só retorna ativos', async () => {
    prisma.platformCatalogItem.findMany.mockResolvedValue([
      { id: item.id, kind: item.kind, value: item.value, label: item.label, sortOrder: 0, meta: item.meta },
    ]);

    await service.listActive('document_category');

    expect(prisma.platformCatalogItem.findMany).toHaveBeenCalledWith({
      where: { active: true, kind: 'document_category' },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: { id: true, kind: true, value: true, label: true, sortOrder: true, meta: true },
    });
  });

  it('recusa kind inválido', async () => {
    await expect(service.listForAdmin('foo')).rejects.toThrow(BadRequestException);
  });

  describe('create', () => {
    it('cria, define sortOrder e audita sem clínica alvo', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(null);
      prisma.platformCatalogItem.findFirst.mockResolvedValue({ sortOrder: 2 });
      prisma.platformCatalogItem.create.mockImplementation(({ data }: any) => ({
        ...item,
        ...data,
        id: 'cat-9',
        meta: data.meta ?? null,
      }));

      const result = await service.create(
        { kind: 'document_category', value: 'outro', label: 'Outro', meta: { color: '#111' } },
        actor,
      );

      expect(prisma.platformCatalogItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kind: 'document_category',
          value: 'outro',
          label: 'Outro',
          sortOrder: 3,
          active: true,
        }),
      });
      expect(result.id).toBe('cat-9');
      expect(lastAudit()).toMatchObject({
        action: 'CATALOG_CREATE',
        actorId: 'root-1',
        targetTenantId: null,
        targetName: 'document_category:Outro',
        details: expect.objectContaining({ catalogItemId: 'cat-9', value: 'outro' }),
      });
    });

    it('recusa value duplicado no mesmo kind', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(item);
      await expect(
        service.create({ kind: 'document_category', value: 'contrato', label: 'X' }, actor),
      ).rejects.toThrow(ConflictException);
      expect(prisma.platformCatalogItem.create).not.toHaveBeenCalled();
    });

    it('recusa gatilho fora do enum MessageTrigger', async () => {
      await expect(
        service.create({ kind: 'message_trigger', value: 'FOO', label: 'Foo' }, actor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('audita só campos alterados', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(item);
      prisma.platformCatalogItem.update.mockResolvedValue({ ...item, label: 'Contrato social' });

      await service.update('cat-1', { label: 'Contrato social' }, actor);

      expect(lastAudit()).toMatchObject({
        action: 'CATALOG_UPDATE',
        details: {
          catalogItemId: 'cat-1',
          kind: 'document_category',
          value: 'contrato',
          label: { old: 'Contrato', new: 'Contrato social' },
        },
      });
    });

    it('não audita quando nada mudou', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(item);
      prisma.platformCatalogItem.update.mockResolvedValue(item);
      await service.update('cat-1', { label: 'Contrato' }, actor);
      expect(prisma.platformAuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('ativar e desativar', () => {
    it('desativa e audita', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(item);
      prisma.platformCatalogItem.update.mockResolvedValue({ ...item, active: false });

      const result = await service.setActive('cat-1', false, actor);

      expect(prisma.platformCatalogItem.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { active: false },
      });
      expect(lastAudit()).toMatchObject({ action: 'CATALOG_DEACTIVATE' });
      expect(result.active).toBe(false);
    });

    it('item inexistente dá 404', async () => {
      prisma.platformCatalogItem.findUnique.mockResolvedValue(null);
      await expect(service.setActive('x', true, actor)).rejects.toThrow(NotFoundException);
    });
  });
});

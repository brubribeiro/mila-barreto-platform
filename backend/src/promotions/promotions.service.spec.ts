import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: any;
  let auditLog: any;

  const mockPromo = {
    id: 'promo-1',
    name: 'Black Friday',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    active: true,
    startAt: new Date('2025-11-25'),
    endAt: new Date('2025-11-30'),
    procedures: [],
    packages: [],
    _count: { appointments: 3 },
  };

  beforeEach(async () => {
    prisma = {
      promotion: {
        findMany: jest.fn().mockResolvedValue([mockPromo]),
        findUnique: jest.fn().mockResolvedValue(mockPromo),
        create: jest.fn().mockResolvedValue(mockPromo),
        update: jest.fn().mockResolvedValue(mockPromo),
        delete: jest.fn().mockResolvedValue(mockPromo),
      },
      promotionProcedure: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      promotionPackage: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)),
    };

    auditLog = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      const result = service.applyDiscount(800, 'PERCENTAGE' as any, 20);
      expect(result).toBe(640);
    });

    it('should apply fixed discount', () => {
      const result = service.applyDiscount(800, 'FIXED' as any, 150);
      expect(result).toBe(650);
    });

    it('should not go below zero for fixed discount', () => {
      const result = service.applyDiscount(100, 'FIXED' as any, 200);
      expect(result).toBe(0);
    });
  });

  describe('findActiveForProcedure', () => {
    it('should return highest discount promotion', async () => {
      prisma.promotion.findMany.mockResolvedValue([mockPromo]);
      const result = await service.findActiveForProcedure('proc-1', new Date());
      expect(result).toEqual(mockPromo);
    });

    it('should return null if no active promo', async () => {
      prisma.promotion.findMany.mockResolvedValue([]);
      const result = await service.findActiveForProcedure('proc-1', new Date());
      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.promotion.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.promotion.findUnique.mockResolvedValue(null);
      await expect(service.remove('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should delete promotion', async () => {
      await service.remove('promo-1');
      expect(prisma.promotion.delete).toHaveBeenCalledWith({ where: { id: 'promo-1' } });
    });
  });
});

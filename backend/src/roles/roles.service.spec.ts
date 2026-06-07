import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;
  let auditLog: any;

  const mockRole = {
    id: 'role-1',
    name: 'Profissional',
    description: 'Profissional da clínica',
    permissions: ['appointments:view', 'appointments:edit'],
    restrictToOwnAppointments: true,
    isSystem: false,
    _count: { users: 2 },
  };

  beforeEach(async () => {
    prisma = {
      role: {
        findMany: jest.fn().mockResolvedValue([mockRole]),
        findUnique: jest.fn().mockResolvedValue(mockRole),
        create: jest.fn().mockResolvedValue(mockRole),
        update: jest.fn().mockResolvedValue(mockRole),
        delete: jest.fn().mockResolvedValue(mockRole),
      },
    };

    auditLog = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw for invalid permissions', async () => {
      await expect(
        service.create({ name: 'Test', permissions: ['invalid:perm'] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate name', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);
      await expect(
        service.create({ name: 'Profissional', permissions: ['appointments:view'] } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create role when valid', async () => {
      prisma.role.findUnique.mockResolvedValue(null);
      await service.create({
        name: 'Novo Grupo',
        permissions: ['appointments:view'],
      } as any);
      expect(prisma.role.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if renaming system role', async () => {
      prisma.role.findUnique.mockResolvedValue({ ...mockRole, isSystem: true });
      await expect(
        service.update('role-1', { name: 'Novo Nome' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if removing permissions from admin', async () => {
      prisma.role.findUnique.mockResolvedValue({
        ...mockRole,
        isSystem: true,
        name: 'Administrador do Sistema',
      });

      await expect(
        service.update('role-1', { permissions: ['appointments:view'] } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for system role', async () => {
      prisma.role.findUnique.mockResolvedValue({ ...mockRole, isSystem: true });
      await expect(service.remove('role-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if role has users', async () => {
      await expect(service.remove('role-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete role with no users', async () => {
      prisma.role.findUnique.mockResolvedValue({ ...mockRole, _count: { users: 0 } });
      await service.remove('role-1');
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });
  });

  describe('catalog', () => {
    it('should return permissions array', () => {
      const result = service.catalog();
      expect(result).toHaveProperty('permissions');
      expect(Array.isArray(result.permissions)).toBe(true);
    });
  });
});

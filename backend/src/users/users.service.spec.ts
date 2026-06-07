import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let notifications: any;
  let auditLog: any;

  const mockUser = {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@clinic.com',
    roleId: 'role-1',
    active: true,
    providesAppointments: true,
    isPrimary: false,
    role: { id: 'role-1', name: 'Profissional', isSystem: false },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findMany: jest.fn().mockResolvedValue([mockUser]),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue(mockUser),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-1', name: 'Profissional' }),
      },
      appointment: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    notifications = {
      findUsersWithPermission: jest.fn().mockResolvedValue([]),
      notifyMany: jest.fn().mockResolvedValue(undefined),
    };

    auditLog = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('should return user with role', async () => {
      const result = await service.findByEmail('ana@clinic.com');
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ana@clinic.com' },
        include: { role: true },
      });
    });
  });

  describe('list', () => {
    it('should return users with safe select', async () => {
      await service.list();
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({ name: 'Ana', email: 'ana@clinic.com', roleId: 'role-1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Ana', email: 'new@clinic.com', roleId: 'invalid' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.create({
        name: 'Ana',
        email: 'new@clinic.com',
        roleId: 'role-1',
      } as any);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should unset other primary users when isPrimary is true', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.create({
        name: 'Ana',
        email: 'new@clinic.com',
        roleId: 'role-1',
        isPrimary: true,
      } as any);

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new email already exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // findById
        .mockResolvedValueOnce({ id: 'other' }); // findByEmail

      await expect(
        service.update('user-1', { email: 'taken@clinic.com' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should update user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.update('user-1', { name: 'Ana Maria' } as any);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw if deleting yourself', async () => {
      await expect(service.remove('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should deactivate user if has appointments', async () => {
      prisma.appointment.count.mockResolvedValue(5);

      await service.remove('user-1', 'admin-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { active: false } }),
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should hard-delete user if no appointments', async () => {
      prisma.appointment.count.mockResolvedValue(0);

      await service.remove('user-1', 'admin-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});

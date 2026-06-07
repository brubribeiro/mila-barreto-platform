import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { R2StorageService } from '../documents/r2-storage.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: any;
  let notifications: any;
  let r2: any;
  let auditLog: any;

  const mockPatient = {
    id: 'patient-1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    photoStorageKey: null,
    photoUrl: null,
    appointments: [],
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([mockPatient]),
        findUnique: jest.fn().mockResolvedValue(mockPatient),
        create: jest.fn().mockResolvedValue(mockPatient),
        update: jest.fn().mockResolvedValue(mockPatient),
        delete: jest.fn().mockResolvedValue(mockPatient),
      },
      appointment: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    notifications = {
      findUsersWithPermission: jest.fn().mockResolvedValue([]),
      notifyMany: jest.fn().mockResolvedValue(undefined),
    };

    r2 = {
      isConfigured: true,
      upload: jest.fn().mockResolvedValue({ key: 'key', url: 'http://url' }),
      getPresignedUrl: jest.fn().mockResolvedValue('https://signed.example/photo.jpg'),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    auditLog = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: R2StorageService, useValue: r2 },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  describe('list', () => {
    it('should return all patients without search', async () => {
      const result = await service.list();
      expect(result).toEqual([mockPatient]);
      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
      });
    });

    it('should sign photo url when storage key exists', async () => {
      prisma.patient.findMany.mockResolvedValue([
        { ...mockPatient, photoStorageKey: 'photos/key-1' },
      ]);
      const result = await service.list();
      expect(r2.getPresignedUrl).toHaveBeenCalledWith('photos/key-1', 3600);
      expect(result[0].photoUrl).toBe('https://signed.example/photo.jpg');
    });

    it('should filter by search term', async () => {
      await service.list('João');
      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'João', mode: 'insensitive' } },
            { email: { contains: 'João', mode: 'insensitive' } },
            { phone: { contains: 'João' } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return patient with appointments', async () => {
      const result = await service.findOne('patient-1');
      expect(result).toEqual(mockPatient);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create patient and notify admins', async () => {
      const dto = { name: 'João Silva', email: 'joao@email.com', phone: '11999999999' };
      const result = await service.create(dto as any);

      expect(result).toEqual(mockPatient);
      expect(prisma.patient.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update patient', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      const dto = { name: 'João Santos' };
      const result = await service.update('patient-1', dto as any);
      expect(prisma.patient.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      await expect(service.update('invalid', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReliabilityStats', () => {
    it('should return 100% reliability with no history', async () => {
      prisma.appointment.groupBy.mockResolvedValue([]);
      const result = await service.getReliabilityStats('patient-1');
      expect(result.reliabilityPercent).toBe(100);
      expect(result.total).toBe(0);
    });

    it('should compute reliability correctly', async () => {
      prisma.appointment.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 8 } },
        { status: 'CANCELLED', _count: { id: 1 } },
        { status: 'NO_SHOW', _count: { id: 1 } },
      ]);
      const result = await service.getReliabilityStats('patient-1');
      expect(result.reliabilityPercent).toBe(80);
      expect(result.completed).toBe(8);
      expect(result.cancelled).toBe(1);
      expect(result.noShow).toBe(1);
    });
  });

  describe('uploadPhoto', () => {
    it('should throw if R2 is not configured', async () => {
      r2.isConfigured = false;
      const file = { mimetype: 'image/jpeg', size: 1000, buffer: Buffer.from('') } as any;
      await expect(service.uploadPhoto('patient-1', file)).rejects.toThrow(BadRequestException);
    });

    it('should throw for invalid mime type', async () => {
      const file = { mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('') } as any;
      await expect(service.uploadPhoto('patient-1', file)).rejects.toThrow(BadRequestException);
    });

    it('should throw for file too large', async () => {
      const file = { mimetype: 'image/jpeg', size: 10 * 1024 * 1024, buffer: Buffer.from('') } as any;
      await expect(service.uploadPhoto('patient-1', file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete patient and remove photo if exists', async () => {
      prisma.patient.findUnique.mockResolvedValue({ ...mockPatient, photoStorageKey: 'key-1' });
      await service.remove('patient-1');

      expect(r2.remove).toHaveBeenCalledWith('key-1');
      expect(prisma.patient.delete).toHaveBeenCalledWith({ where: { id: 'patient-1' } });
    });
  });
});

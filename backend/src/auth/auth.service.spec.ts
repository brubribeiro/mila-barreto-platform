import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findById'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mockUser = {
    id: 'user-1',
    name: 'Maria',
    email: 'maria@clinic.com',
    roleId: 'role-1',
    active: true,
    providesAppointments: true,
    role: {
      name: 'Admin',
      permissions: ['users:view'],
      restrictToOwnAppointments: false,
    },
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('google-client-id') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('loginWithGoogle', () => {
    it('should throw if Google token payload has no email', async () => {
      const googleClient = (service as any).googleClient;
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({}),
      });

      await expect(
        service.loginWithGoogle({ credential: 'token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      const googleClient = (service as any).googleClient;
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'unknown@test.com' }),
      });
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.loginWithGoogle({ credential: 'token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user is inactive', async () => {
      const googleClient = (service as any).googleClient;
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'maria@clinic.com' }),
      });
      usersService.findByEmail.mockResolvedValue({ ...mockUser, active: false } as any);

      await expect(
        service.loginWithGoogle({ credential: 'token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access_token and user on success', async () => {
      const googleClient = (service as any).googleClient;
      googleClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'maria@clinic.com' }),
      });
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.loginWithGoogle({ credential: 'token' });

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('maria@clinic.com');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'maria@clinic.com',
      });
    });
  });

  describe('impersonate', () => {
    const admin = {
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@clinic.com',
      roleName: 'Administrador do Sistema',
      permissions: [],
      restrictToOwnAppointments: false,
    };

    it('should throw ForbiddenException if caller is not admin', async () => {
      const nonAdmin = { ...admin, roleName: 'Profissional' };

      await expect(
        service.impersonate('user-1', nonAdmin as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if trying to impersonate self', async () => {
      await expect(
        service.impersonate('admin-1', admin as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if target user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.impersonate('user-99', admin as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if target user is inactive', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, active: false } as any);

      await expect(
        service.impersonate('user-1', admin as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token with impersonatorId on success', async () => {
      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await service.impersonate('user-1', admin as any);

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.impersonating).toBe(true);
      expect(result.user.impersonatorName).toBe('Admin');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'maria@clinic.com',
        impersonatorId: 'admin-1',
      });
    });
  });
});

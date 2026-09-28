import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import * as argon2 from 'argon2';
import { UsersService } from 'src/users/users.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { SessionsService } from 'src/sessions/sessions.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByUsername: jest.fn(),
    findByUsernameForAuth: jest.fn(),
    create: jest.fn(),
  };

  const sessionsServiceMock = {
    create: jest.fn(),
  };

  const argon2Mock = argon2 as jest.Mocked<typeof argon2>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      const createdUser = {
        id: 'user-id',
        username: 'andrei',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: null,
      };

      usersServiceMock.findByUsername.mockResolvedValue(null);
      argon2Mock.hash.mockResolvedValue('hashed-password');
      usersServiceMock.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(result).toEqual(createdUser);

      expect(usersServiceMock.findByUsername).toHaveBeenCalledWith('andrei');

      expect(argon2Mock.hash).toHaveBeenCalledWith('secret');

      expect(usersServiceMock.create).toHaveBeenCalledWith({
        username: 'andrei',
        passwordHash: 'hashed-password',
      });
    });

    it('should throw ConflictException if username already exists', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      usersServiceMock.findByUsername.mockResolvedValue({
        id: 'existing-user',
        username: 'andrei',
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);

      expect(argon2Mock.hash).not.toHaveBeenCalled();
      expect(usersServiceMock.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should log in a user and create a session', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      const user = {
        id: 'user-id',
        username: 'andrei',
        passwordHash: 'hashed-password',
      };

      usersServiceMock.findByUsernameForAuth.mockResolvedValue(user);
      argon2Mock.verify.mockResolvedValue(true);
      sessionsServiceMock.create.mockResolvedValue('session-token');

      const result = await service.login(dto);

      expect(result).toEqual({
        sessionToken: 'session-token',
      });

      expect(usersServiceMock.findByUsernameForAuth).toHaveBeenCalledWith(
        'andrei',
      );

      expect(argon2Mock.verify).toHaveBeenCalledWith(
        'hashed-password',
        'secret',
      );

      expect(sessionsServiceMock.create).toHaveBeenCalledWith('user-id');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      usersServiceMock.findByUsernameForAuth.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);

      expect(usersServiceMock.findByUsernameForAuth).toHaveBeenCalledWith(
        'andrei',
      );

      expect(argon2Mock.verify).not.toHaveBeenCalled();
      expect(sessionsServiceMock.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      const user = {
        id: 'user-id',
        username: 'andrei',
        passwordHash: 'hashed-password',
      };

      usersServiceMock.findByUsernameForAuth.mockResolvedValue(user);
      argon2Mock.verify.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);

      expect(argon2Mock.verify).toHaveBeenCalledWith(
        'hashed-password',
        'secret',
      );

      expect(sessionsServiceMock.create).not.toHaveBeenCalled();
    });
  });
});

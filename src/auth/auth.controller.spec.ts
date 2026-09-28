import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsService } from 'src/sessions/sessions.service';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const sessionsServiceMock = {
    deleteByToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
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

      authServiceMock.register.mockResolvedValue(createdUser);

      const result = await controller.register(dto);

      expect(result).toEqual(createdUser);

      expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should log in user and set session cookie', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      const sessionToken = 'session-token';

      const response = {
        cookie: jest.fn(),
      };

      authServiceMock.login.mockResolvedValue({
        sessionToken,
      });

      const result = await controller.login(
        dto,
        response as unknown as Response,
      );

      expect(result).toEqual({
        message: 'Logged in',
      });

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);

      expect(response.cookie).toHaveBeenCalledWith('session', sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });
  });

  describe('logout', () => {
    it('should delete session and clear session cookie', async () => {
      const token = 'session-token';

      const request = {
        cookies: {
          session: token,
        },
      };

      const response = {
        clearCookie: jest.fn(),
      };

      await controller.logout(
        request as unknown as Request,
        response as unknown as Response,
      );

      expect(sessionsServiceMock.deleteByToken).toHaveBeenCalledWith(token);

      expect(response.clearCookie).toHaveBeenCalledWith('session');
    });

    it('should clear session cookie when session token is missing', async () => {
      const request = {
        cookies: {},
      };

      const response = {
        clearCookie: jest.fn(),
      };

      await controller.logout(
        request as unknown as Request,
        response as unknown as Response,
      );

      expect(sessionsServiceMock.deleteByToken).not.toHaveBeenCalled();

      expect(response.clearCookie).toHaveBeenCalledWith('session');
    });
  });
});

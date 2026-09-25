import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
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
    it('should log in user and return access token', async () => {
      const dto = {
        username: 'andrei',
        password: 'secret',
      };

      const loginResult = {
        accessToken: 'access-token',
      };

      authServiceMock.login.mockResolvedValue(loginResult);

      const result = await controller.login(dto);

      expect(result).toEqual(loginResult);

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
    });
  });
});

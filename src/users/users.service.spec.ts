import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        username: 'andrei',
        passwordHash: 'hashed-password',
      };

      const createdUser = {
        id: 'user-id',
        username: 'andrei',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: null,
      };

      prismaMock.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(result).toEqual(createdUser);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: 'andrei',
          passwordHash: 'hashed-password',
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          lastSeen: true,
        },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const user = {
        id: 'user-id',
        username: 'andrei',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('user-id');

      expect(result).toEqual(user);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-id',
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          lastSeen: true,
        },
      });
    });

    it('should return null if user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('unknown-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return a user by username', async () => {
      const user = {
        id: 'user-id',
        username: 'andrei',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findByUsername('andrei');

      expect(result).toEqual(user);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          username: 'andrei',
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          lastSeen: true,
        },
      });
    });

    it('should return null if user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.findByUsername('unknown');

      expect(result).toBeNull();
    });
  });
});

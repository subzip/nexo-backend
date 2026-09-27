import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const prismaMock = {
    chat: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    chatParticipants: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const usersServiceMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a direct conversation', async () => {
      const creatorId = 'creator-id';
      const userId = 'user-id';

      usersServiceMock.findById
        .mockResolvedValueOnce({ id: creatorId })
        .mockResolvedValueOnce({ id: userId });

      prismaMock.chat.findFirst.mockResolvedValue(null);

      const chat = {
        id: 'chat-id',
        type: 'direct',
      };

      prismaMock.chat.create.mockResolvedValue(chat);

      prismaMock.chatParticipants.createMany.mockResolvedValue({
        count: 2,
      });

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return callback(prismaMock);
        },
      );

      const result = await service.create({
        creatorId,
        userId,
      });

      expect(result).toEqual(chat);

      expect(prismaMock.chat.create).toHaveBeenCalledWith({
        data: {
          type: 'direct',
        },
      });

      expect(prismaMock.chatParticipants.createMany).toHaveBeenCalledWith({
        data: [
          {
            chatId: chat.id,
            role: 'participant',
            userId: creatorId,
          },
          {
            chatId: chat.id,
            role: 'participant',
            userId,
          },
        ],
      });
    });

    it('should reject creating a conversation with yourself', async () => {
      const userId = 'same-user-id';

      await expect(
        service.create({
          creatorId: userId,
          userId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(usersServiceMock.findById).not.toHaveBeenCalled();
      expect(prismaMock.chat.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.chat.create).not.toHaveBeenCalled();
      expect(prismaMock.chatParticipants.createMany).not.toHaveBeenCalled();
    });

    it('should throw if one of the users does not exist', async () => {
      usersServiceMock.findById
        .mockResolvedValueOnce({ id: 'creator-id' })
        .mockResolvedValueOnce(null);

      await expect(
        service.create({
          creatorId: 'creator-id',
          userId: 'user-id',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(usersServiceMock.findById).toHaveBeenCalledTimes(2);
      expect(prismaMock.chat.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.chat.create).not.toHaveBeenCalled();
      expect(prismaMock.chatParticipants.createMany).not.toHaveBeenCalled();
    });

    it('should return existing conversation', async () => {
      const creatorId = 'creator-id';
      const userId = 'user-id';

      usersServiceMock.findById
        .mockResolvedValueOnce({ id: creatorId })
        .mockResolvedValueOnce({ id: userId });

      const existingChat = {
        id: 'existing-chat-id',
        type: 'direct',
      };

      prismaMock.chat.findFirst.mockResolvedValue(existingChat);

      const result = await service.create({
        creatorId,
        userId,
      });

      expect(result).toEqual(existingChat);

      expect(prismaMock.chat.findFirst).toHaveBeenCalledWith({
        where: {
          type: 'direct',
          participants: {
            some: {
              userId: creatorId,
            },
          },
          AND: {
            participants: {
              some: {
                userId,
              },
            },
          },
        },
      });

      expect(prismaMock.chat.create).not.toHaveBeenCalled();
      expect(prismaMock.chatParticipants.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUserId', () => {
    it('should return conversations for a user', async () => {
      const userId = 'user-id';

      const conversations = [
        {
          id: 'chat-1',
          type: 'direct',
        },
        {
          id: 'chat-2',
          type: 'direct',
        },
      ];

      prismaMock.chat.findMany.mockResolvedValue(conversations);

      const result = await service.findAllByUserId(userId);

      expect(result).toEqual(conversations);

      expect(prismaMock.chat.findMany).toHaveBeenCalledWith({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        include: {
          participants: {
            where: {
              userId: {
                not: userId,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  avatar: true,
                  username: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });
    });
  });
});

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
      findMany: jest.fn(),
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
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
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

      const result = await service.create({ userId }, creatorId);

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

      await expect(service.create({ userId }, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(usersServiceMock.findById).not.toHaveBeenCalled();
      expect(prismaMock.chat.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.chat.create).not.toHaveBeenCalled();
      expect(prismaMock.chatParticipants.createMany).not.toHaveBeenCalled();
    });

    it('should throw if one of the users does not exist', async () => {
      const creatorId = 'creator-id';
      const userId = 'user-id';

      usersServiceMock.findById
        .mockResolvedValueOnce({ id: creatorId })
        .mockResolvedValueOnce(null);

      await expect(service.create({ userId }, creatorId)).rejects.toThrow(
        NotFoundException,
      );

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

      const result = await service.create({ userId }, creatorId);

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

  describe('getUserChatIds', () => {
    it('should return only the chat ids of a user', async () => {
      prismaMock.chat.findMany.mockResolvedValue([
        { id: 'chat-1' },
        { id: 'chat-2' },
      ]);

      const result = await service.getUserChatIds('user-id');

      expect(result).toEqual(['chat-1', 'chat-2']);
      expect(prismaMock.chat.findMany).toHaveBeenCalledWith({
        where: {
          participants: {
            some: {
              userId: 'user-id',
            },
          },
        },
        select: {
          id: true,
        },
      });
    });

    it('should return an empty array when the user has no chats', async () => {
      prismaMock.chat.findMany.mockResolvedValue([]);

      const result = await service.getUserChatIds('user-id');

      expect(result).toEqual([]);
    });
  });

  describe('getChatParticipantsWithPresence', () => {
    it('should flatten participants with their lastSeen value', async () => {
      const lastSeen = new Date('2026-01-01T00:00:00.000Z');

      prismaMock.chatParticipants.findMany.mockResolvedValue([
        { userId: 'user-1', user: { lastSeen: null } },
        { userId: 'user-2', user: { lastSeen } },
      ]);

      const result = await service.getChatParticipantsWithPresence('chat-1');

      expect(result).toEqual([
        { userId: 'user-1', lastSeen: null },
        { userId: 'user-2', lastSeen },
      ]);
      expect(prismaMock.chatParticipants.findMany).toHaveBeenCalledWith({
        where: {
          chatId: 'chat-1',
        },
        select: {
          userId: true,
          user: {
            select: {
              lastSeen: true,
            },
          },
        },
      });
    });

    it('should return an empty array for a chat with no participants', async () => {
      prismaMock.chatParticipants.findMany.mockResolvedValue([]);

      const result = await service.getChatParticipantsWithPresence('chat-1');

      expect(result).toEqual([]);
    });
  });

  describe('canAccessChat', () => {
    it('should return true when the user participates in the chat', async () => {
      prismaMock.chat.findFirst.mockResolvedValue({ id: 'chat-1' });

      const result = await service.canAccessChat('chat-1', 'user-id');

      expect(result).toBe(true);
      expect(prismaMock.chat.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'chat-1',
          participants: {
            some: {
              userId: 'user-id',
            },
          },
        },
      });
    });

    it('should return false when the chat does not exist', async () => {
      prismaMock.chat.findFirst.mockResolvedValue(null);

      const result = await service.canAccessChat('chat-1', 'user-id');

      expect(result).toBe(false);
    });
  });
});

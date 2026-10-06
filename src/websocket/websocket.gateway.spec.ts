import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { SocketAuthMiddleware } from './middleware/socket-auth.middleware';
import { ConversationsService } from 'src/conversations/conversations.service';
import { MessagesService } from 'src/messages/messages.service';
import { UsersService } from 'src/users/users.service';
import { AppSocket } from './types/socket-data';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let websocketService: WebsocketService;

  const conversationsServiceMock = {
    getUserChatIds: jest.fn(),
    getChatParticipantsWithPresence: jest.fn(),
    canAccessChat: jest.fn(),
  };

  const messagesServiceMock = {
    create: jest.fn(),
  };

  const usersServiceMock = {
    updateLastSeen: jest.fn(),
  };

  const socketAuthMiddlewareMock = {
    middleware: jest.fn(),
  };

  const emitToRoom = jest.fn();

  const serverMock = {
    use: jest.fn(),
    to: jest.fn(() => ({ emit: emitToRoom })),
  };

  const createSocket = (userId: string, socketId = 'socket-1'): AppSocket =>
    ({
      id: socketId,
      data: {
        user: {
          id: userId,
          username: 'andrei',
          avatar: null,
        },
      },
      join: jest.fn(),
      emit: jest.fn(),
      rooms: new Set<string>(),
    }) as unknown as AppSocket;

  // `join`/`emit` are declared as methods on socket.io's Socket, so referencing
  // them straight from `client` trips @typescript-eslint/unbound-method. Read
  // them back through a plain object type instead.
  const socketMocks = (
    socket: AppSocket,
  ): { join: jest.Mock; emit: jest.Mock } =>
    socket as unknown as { join: jest.Mock; emit: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        WebsocketService,
        {
          provide: SocketAuthMiddleware,
          useValue: socketAuthMiddlewareMock,
        },
        {
          provide: ConversationsService,
          useValue: conversationsServiceMock,
        },
        {
          provide: MessagesService,
          useValue: messagesServiceMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    websocketService = module.get<WebsocketService>(WebsocketService);

    gateway.server = serverMock as unknown as WebsocketGateway['server'];
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should register the socket auth middleware on the server', () => {
      const handler = jest.fn();
      socketAuthMiddlewareMock.middleware.mockReturnValue(handler);

      gateway.afterInit(serverMock as unknown as WebsocketGateway['server']);

      expect(socketAuthMiddlewareMock.middleware).toHaveBeenCalledTimes(1);
      expect(serverMock.use).toHaveBeenCalledWith(handler);
    });
  });

  describe('handleConnection', () => {
    it('should register the socket and broadcast user:online on the first connection', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.getUserChatIds.mockResolvedValue([
        'chat-1',
        'chat-2',
      ]);
      usersServiceMock.updateLastSeen.mockResolvedValue(undefined);

      await gateway.handleConnection(client);

      expect(websocketService.isUserOnline('user-1')).toBe(true);
      expect(websocketService.getUserSockets('user-1')).toEqual(['socket-1']);

      expect(conversationsServiceMock.getUserChatIds).toHaveBeenCalledWith(
        'user-1',
      );
      expect(usersServiceMock.updateLastSeen).toHaveBeenCalledWith(
        'user-1',
        null,
      );

      expect(serverMock.to).toHaveBeenCalledTimes(2);
      expect(serverMock.to).toHaveBeenNthCalledWith(1, 'chat-1');
      expect(serverMock.to).toHaveBeenNthCalledWith(2, 'chat-2');
      expect(emitToRoom).toHaveBeenCalledWith('user:online', {
        userId: 'user-1',
        online: true,
        lastSeen: null,
      });
    });

    it('should not broadcast when the user already has an active socket', async () => {
      conversationsServiceMock.getUserChatIds.mockResolvedValue(['chat-1']);
      usersServiceMock.updateLastSeen.mockResolvedValue(undefined);

      await gateway.handleConnection(createSocket('user-1', 'socket-1'));

      emitToRoom.mockClear();
      serverMock.to.mockClear();

      await gateway.handleConnection(createSocket('user-1', 'socket-2'));

      expect(websocketService.getUserSockets('user-1')).toEqual([
        'socket-1',
        'socket-2',
      ]);
      expect(conversationsServiceMock.getUserChatIds).toHaveBeenCalledTimes(1);
      expect(usersServiceMock.updateLastSeen).toHaveBeenCalledTimes(1);
      expect(serverMock.to).not.toHaveBeenCalled();
      expect(emitToRoom).not.toHaveBeenCalled();
    });

    it('should not emit anything when the user belongs to no chat', async () => {
      conversationsServiceMock.getUserChatIds.mockResolvedValue([]);
      usersServiceMock.updateLastSeen.mockResolvedValue(undefined);

      await gateway.handleConnection(createSocket('user-1'));

      expect(websocketService.isUserOnline('user-1')).toBe(true);
      expect(usersServiceMock.updateLastSeen).toHaveBeenCalledWith(
        'user-1',
        null,
      );
      expect(serverMock.to).not.toHaveBeenCalled();
      expect(emitToRoom).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should persist lastSeen and broadcast user:offline when the last socket closes', async () => {
      const client = createSocket('user-1');
      websocketService.addConnection('user-1', 'socket-1');

      conversationsServiceMock.getUserChatIds.mockResolvedValue(['chat-1']);

      let persistedBy: string | null = null;
      let persistedLastSeen: Date | null = null;
      usersServiceMock.updateLastSeen.mockImplementation(
        (userId: string, lastSeen: Date | null) => {
          persistedBy = userId;
          persistedLastSeen = lastSeen;
          return Promise.resolve();
        },
      );

      await gateway.handleDisconnect(client);

      expect(websocketService.isUserOnline('user-1')).toBe(false);
      expect(conversationsServiceMock.getUserChatIds).toHaveBeenCalledWith(
        'user-1',
      );

      expect(persistedBy).toBe('user-1');
      expect(persistedLastSeen).toBeInstanceOf(Date);
      // The very same timestamp must reach both the database and the clients.
      expect(emitToRoom).toHaveBeenCalledWith('user:offline', {
        userId: 'user-1',
        online: false,
        lastSeen: persistedLastSeen,
      });
    });

    it('should keep the user online while other sockets remain', async () => {
      websocketService.addConnection('user-1', 'socket-1');
      websocketService.addConnection('user-1', 'socket-2');

      await gateway.handleDisconnect(createSocket('user-1', 'socket-1'));

      expect(websocketService.isUserOnline('user-1')).toBe(true);
      expect(usersServiceMock.updateLastSeen).not.toHaveBeenCalled();
      expect(conversationsServiceMock.getUserChatIds).not.toHaveBeenCalled();
      expect(emitToRoom).not.toHaveBeenCalled();
    });

    it('should not fail when the user belongs to no chat', async () => {
      websocketService.addConnection('user-1', 'socket-1');

      conversationsServiceMock.getUserChatIds.mockResolvedValue([]);
      usersServiceMock.updateLastSeen.mockResolvedValue(undefined);

      await gateway.handleDisconnect(createSocket('user-1'));

      expect(websocketService.isUserOnline('user-1')).toBe(false);
      expect(serverMock.to).not.toHaveBeenCalled();
    });
  });

  describe('handlePresence (presence:request)', () => {
    it('should return presence for every chat of the requester', async () => {
      const client = createSocket('user-1');
      const lastSeen = new Date('2026-01-01T00:00:00.000Z');

      conversationsServiceMock.getUserChatIds.mockResolvedValue([
        'chat-1',
        'chat-2',
      ]);
      conversationsServiceMock.getChatParticipantsWithPresence
        .mockResolvedValueOnce([
          { userId: 'user-1', lastSeen: null },
          { userId: 'user-2', lastSeen: null },
        ])
        .mockResolvedValueOnce([
          { userId: 'user-1', lastSeen: null },
          { userId: 'user-3', lastSeen },
        ]);

      websocketService.addConnection('user-2', 'socket-2');

      await gateway.handlePresence(client);

      expect(
        conversationsServiceMock.getChatParticipantsWithPresence,
      ).toHaveBeenCalledTimes(2);
      expect(
        conversationsServiceMock.getChatParticipantsWithPresence,
      ).toHaveBeenNthCalledWith(1, 'chat-1');
      expect(
        conversationsServiceMock.getChatParticipantsWithPresence,
      ).toHaveBeenNthCalledWith(2, 'chat-2');

      expect(socketMocks(client).emit).toHaveBeenCalledWith('presence:sync', [
        {
          chatId: 'chat-1',
          users: [{ userId: 'user-2', online: true, lastSeen: null }],
        },
        {
          chatId: 'chat-2',
          users: [{ userId: 'user-3', online: false, lastSeen }],
        },
      ]);
    });

    it('should exclude the requester from the returned users', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.getUserChatIds.mockResolvedValue(['chat-1']);
      conversationsServiceMock.getChatParticipantsWithPresence.mockResolvedValue(
        [{ userId: 'user-1', lastSeen: null }],
      );

      await gateway.handlePresence(client);

      expect(socketMocks(client).emit).toHaveBeenCalledWith('presence:sync', [
        { chatId: 'chat-1', users: [] },
      ]);
    });

    it('should return an empty list when the user has no chats', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.getUserChatIds.mockResolvedValue([]);

      await gateway.handlePresence(client);

      expect(socketMocks(client).emit).toHaveBeenCalledWith(
        'presence:sync',
        [],
      );
      expect(
        conversationsServiceMock.getChatParticipantsWithPresence,
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinChat (chat:join)', () => {
    it('should join only the chats the user can access', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.canAccessChat
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await gateway.handleJoinChat(client, {
        chatIds: ['chat-1', 'chat-2', 'chat-3'],
      });

      expect(result).toEqual({ joinedChatIds: ['chat-1', 'chat-3'] });

      expect(conversationsServiceMock.canAccessChat).toHaveBeenCalledTimes(3);
      expect(conversationsServiceMock.canAccessChat).toHaveBeenNthCalledWith(
        1,
        'chat-1',
        'user-1',
      );

      const join = socketMocks(client).join;
      expect(join).toHaveBeenCalledTimes(2);
      expect(join).toHaveBeenNthCalledWith(1, 'chat-1');
      expect(join).toHaveBeenNthCalledWith(2, 'chat-3');
    });

    it('should not join any room when access is denied', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.canAccessChat.mockResolvedValue(false);

      const result = await gateway.handleJoinChat(client, {
        chatIds: ['chat-1'],
      });

      expect(result).toEqual({ joinedChatIds: [] });
      expect(socketMocks(client).join).not.toHaveBeenCalled();
    });

    it('should do nothing for an empty chat list', async () => {
      const client = createSocket('user-1');

      const result = await gateway.handleJoinChat(client, { chatIds: [] });

      expect(result).toEqual({ joinedChatIds: [] });
      expect(conversationsServiceMock.canAccessChat).not.toHaveBeenCalled();
      expect(socketMocks(client).join).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageSend (chat:send)', () => {
    const message = {
      id: 'message-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      text: 'hello',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should persist the message and broadcast it to the room', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.canAccessChat.mockResolvedValue(true);
      messagesServiceMock.create.mockResolvedValue(message);

      await gateway.handleMessageSend(client, {
        chatId: 'chat-1',
        content: 'hello',
      });

      expect(conversationsServiceMock.canAccessChat).toHaveBeenCalledWith(
        'chat-1',
        'user-1',
      );
      // The WS payload field "content" is mapped onto the "text" field
      // expected by MessagesService.create().
      expect(messagesServiceMock.create).toHaveBeenCalledWith(
        { chatId: 'chat-1', text: 'hello' },
        'user-1',
      );
      expect(serverMock.to).toHaveBeenCalledWith('chat-1');
      expect(emitToRoom).toHaveBeenCalledWith('message:new', message);
    });

    it('should not persist or broadcast when the user cannot access the chat', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.canAccessChat.mockResolvedValue(false);

      const result = await gateway.handleMessageSend(client, {
        chatId: 'chat-1',
        content: 'hello',
      });

      expect(result).toBeUndefined();
      expect(messagesServiceMock.create).not.toHaveBeenCalled();
      expect(serverMock.to).not.toHaveBeenCalled();
      expect(emitToRoom).not.toHaveBeenCalled();
    });

    it('should propagate an error thrown by the messages service', async () => {
      const client = createSocket('user-1');

      conversationsServiceMock.canAccessChat.mockResolvedValue(true);
      messagesServiceMock.create.mockRejectedValue(new Error('db down'));

      await expect(
        gateway.handleMessageSend(client, { chatId: 'chat-1', content: 'hi' }),
      ).rejects.toThrow('db down');

      expect(emitToRoom).not.toHaveBeenCalled();
    });
  });
});

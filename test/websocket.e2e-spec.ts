import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { createTestApp } from './helpers/create-app';
import {
  connectSocket,
  disconnectSocket,
  expectNoEvent,
  expectNoEventMatching,
  joinChat,
  waitForEvent,
  waitForEventMatching,
} from './helpers/socket.helper';
import { io, Socket } from 'socket.io-client';
import { PrismaService } from 'src/prisma/prisma.service';
import { createTestChat } from './helpers/create-chat';
import { createTestUser, loginTestUser } from './helpers/auth.helper';
import { DefaultEventsMap } from 'socket.io';

describe('WebSocket (e2e)', () => {
  let app: INestApplication<App>;
  let serverUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    serverUrl = await app.getUrl();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect an authenticated user', async () => {
    const user = await createTestUser(app);
    const sessionCookie = await loginTestUser(app, user);

    const socket = await connectSocket(serverUrl, sessionCookie);

    expect(socket.connected).toBe(true);

    await disconnectSocket(socket);
  });

  it('should reject an unauthenticated user', async () => {
    await expect(
      new Promise<void>((resolve, reject) => {
        const socket = io(serverUrl, {
          transports: ['websocket'],
        });

        socket.once('connect', () => {
          socket.disconnect();
          reject(new Error('Socket connected without authentication'));
        });

        socket.once('connect_error', () => {
          socket.disconnect();
          resolve();
        });
      }),
    ).resolves.toBeUndefined();
  });

  it('should join only chats the user has access to', async () => {
    const userA = await createTestUser(app, 'ws-join-a');
    const userB = await createTestUser(app, 'ws-join-b');

    const userAChat = await createTestChat({
      prisma,
      userId: userA.id,
    });

    const userBChat = await createTestChat({
      prisma,
      userId: userB.id,
    });

    const sessionCookie = await loginTestUser(app, userA);
    const socketA = await connectSocket(serverUrl, sessionCookie);

    try {
      const result = await joinChat(socketA, [userAChat.id, userBChat.id]);

      expect(result.joinedChatIds).toContain(userAChat.id);
      expect(result.joinedChatIds).not.toContain(userBChat.id);
    } finally {
      await disconnectSocket(socketA);
    }
  });

  it('should send a message to chat participants', async () => {
    const userA = await createTestUser(app, 'ws-message-a');
    const userB = await createTestUser(app, 'ws-message-b');

    const chat = await createTestChat({
      prisma,
      userId: userA.id,
      participantIds: [userB.id],
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketA = await connectSocket(serverUrl, userASession);
    const socketB = await connectSocket(serverUrl, userBSession);

    try {
      await joinChat(socketA, [chat.id]);
      await joinChat(socketB, [chat.id]);

      const messagePromise = waitForEvent<{
        id: string;
        chatId: string;
        senderId: string;
        text: string;
      }>(socketB, 'message:new');

      socketA.emit('chat:send', {
        chatId: chat.id,
        content: 'Hello from WebSocket',
      });

      const message = await messagePromise;

      expect(message.chatId).toBe(chat.id);
      expect(message.senderId).toBe(userA.id);
      expect(message.text).toBe('Hello from WebSocket');

      const savedMessage = await prisma.message.findUnique({
        where: {
          id: message.id,
        },
      });

      expect(savedMessage).not.toBeNull();
      expect(savedMessage?.chatId).toBe(chat.id);
      expect(savedMessage?.senderId).toBe(userA.id);
      expect(savedMessage?.text).toBe('Hello from WebSocket');
    } finally {
      await disconnectSocket(socketA);
      await disconnectSocket(socketB);
    }
  });

  it('should reject sending a message to a chat the user cannot access', async () => {
    const userA = await createTestUser(app, 'ws-send-a');
    const userB = await createTestUser(app, 'ws-send-b');

    const chat = await createTestChat({
      prisma,
      userId: userB.id,
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketA = await connectSocket(serverUrl, userASession);
    const socketB = await connectSocket(serverUrl, userBSession);

    try {
      await joinChat(socketB, [chat.id]);

      const noMessagePromise = expectNoEvent(socketB, 'message:new');

      socketA.emit('chat:send', {
        chatId: chat.id,
        content: 'Unauthorized message',
      });

      await noMessagePromise;

      const messages = await prisma.message.findMany({
        where: {
          chatId: chat.id,
          senderId: userA.id,
        },
      });

      expect(messages).toHaveLength(0);
    } finally {
      await disconnectSocket(socketA);
      await disconnectSocket(socketB);
    }
  });

  it('should reject invalid chat:send payload', async () => {
    const user = await createTestUser(app, 'ws-validation');
    const sessionCookie = await loginTestUser(app, user);

    const socket = await connectSocket(serverUrl, sessionCookie);

    try {
      const exceptionPromise = waitForEvent<unknown>(socket, 'exception');

      socket.emit('chat:send', {
        chatId: 'not-a-uuid',
        content: '',
      });

      const exception = await exceptionPromise;

      expect(exception).toBeDefined();
    } finally {
      await disconnectSocket(socket);
    }
  });

  it('should sync presence for all user chats', async () => {
    const userA = await createTestUser(app, 'ws-presence-a');
    const userB = await createTestUser(app, 'ws-presence-b');

    const chat = await createTestChat({
      prisma,
      userId: userA.id,
      participantIds: [userB.id],
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketA = await connectSocket(serverUrl, userASession);
    const socketB = await connectSocket(serverUrl, userBSession);

    try {
      const presencePromise = waitForEvent<
        {
          chatId: string;
          users: {
            userId: string;
            online: boolean;
            lastSeen: string | null;
          }[];
        }[]
      >(socketA, 'presence:sync');

      socketA.emit('presence:request');

      const presence = await presencePromise;

      const chatPresence = presence.find((item) => item.chatId === chat.id);

      expect(chatPresence).toBeDefined();

      const userPresence = chatPresence?.users.find(
        (user) => user.userId === userB.id,
      );

      expect(userPresence).toBeDefined();
      expect(userPresence?.online).toBe(true);
      expect(userPresence?.lastSeen).toBeNull();
    } finally {
      await disconnectSocket(socketA);
      await disconnectSocket(socketB);
    }
  });

  it('should emit user:offline when the last socket disconnects', async () => {
    const userA = await createTestUser(app, 'ws-offline-a');
    const userB = await createTestUser(app, 'ws-offline-b');

    const chat = await createTestChat({
      prisma,
      userId: userA.id,
      participantIds: [userB.id],
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketA = await connectSocket(serverUrl, userASession);
    const socketB = await connectSocket(serverUrl, userBSession);

    try {
      await joinChat(socketA, [chat.id]);
      await joinChat(socketB, [chat.id]);

      const offlinePromise = waitForEvent<{
        userId: string;
        online: boolean;
        lastSeen: string;
      }>(socketA, 'user:offline');

      await disconnectSocket(socketB);

      const event = await offlinePromise;

      expect(event.userId).toBe(userB.id);
      expect(event.online).toBe(false);
      expect(event.lastSeen).toBeTruthy();

      const user = await prisma.user.findUnique({
        where: {
          id: userB.id,
        },
        select: {
          lastSeen: true,
        },
      });

      expect(user?.lastSeen).not.toBeNull();
    } finally {
      await disconnectSocket(socketA);
    }
  });

  it('should emit user:online when a user reconnects', async () => {
    const userA = await createTestUser(app, 'ws-online-a');
    const userB = await createTestUser(app, 'ws-online-b');

    const chat = await createTestChat({
      prisma,
      userId: userA.id,
      participantIds: [userB.id],
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketA = await connectSocket(serverUrl, userASession);
    let socketB = await connectSocket(serverUrl, userBSession);

    try {
      await joinChat(socketA, [chat.id]);
      await joinChat(socketB, [chat.id]);

      const offlinePromise = waitForEvent<{
        userId: string;
        online: boolean;
        lastSeen: string;
      }>(socketA, 'user:offline');

      await disconnectSocket(socketB);

      const offlineEvent = await offlinePromise;

      expect(offlineEvent.userId).toBe(userB.id);
      expect(offlineEvent.online).toBe(false);

      const onlinePromise = waitForEvent<{
        userId: string;
        online: boolean;
        lastSeen: null;
      }>(socketA, 'user:online');

      socketB = await connectSocket(serverUrl, userBSession);

      const onlineEvent = await onlinePromise;

      expect(onlineEvent.userId).toBe(userB.id);
      expect(onlineEvent.online).toBe(true);
      expect(onlineEvent.lastSeen).toBeNull();
    } finally {
      await disconnectSocket(socketA);
      await disconnectSocket(socketB);
    }
  });

  it('should emit presence changes only on first connect and last disconnect', async () => {
    const userA = await createTestUser(app, 'ws-multi-a');
    const userB = await createTestUser(app, 'ws-multi-b');

    const chat = await createTestChat({
      prisma,
      userId: userB.id,
      participantIds: [userA.id],
    });

    const userASession = await loginTestUser(app, userA);
    const userBSession = await loginTestUser(app, userB);

    const socketB = await connectSocket(serverUrl, userBSession);

    await joinChat(socketB, [chat.id]);

    let socketA1: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;
    let socketA2: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;

    try {
      const firstOnlinePromise = waitForEventMatching<{
        userId: string;
        online: boolean;
        lastSeen: null;
      }>(socketB, 'user:online', (event) => event.userId === userA.id);

      socketA1 = await connectSocket(serverUrl, userASession);

      const firstOnline = await firstOnlinePromise;

      expect(firstOnline.userId).toBe(userA.id);
      expect(firstOnline.online).toBe(true);
      expect(firstOnline.lastSeen).toBeNull();

      socketA2 = await connectSocket(serverUrl, userASession);

      await expectNoEventMatching<{
        userId: string;
        online: boolean;
        lastSeen: null;
      }>(socketB, 'user:online', (event) => event.userId === userA.id);

      const noOfflineAfterFirstDisconnectPromise = expectNoEventMatching<{
        userId: string;
        online: boolean;
        lastSeen: string;
      }>(socketB, 'user:offline', (event) => event.userId === userA.id);

      await disconnectSocket(socketA1);

      await noOfflineAfterFirstDisconnectPromise;

      const finalOfflinePromise = waitForEventMatching<{
        userId: string;
        online: boolean;
        lastSeen: string;
      }>(socketB, 'user:offline', (event) => event.userId === userA.id);

      await disconnectSocket(socketA2);

      const finalOffline = await finalOfflinePromise;

      expect(finalOffline.userId).toBe(userA.id);
      expect(finalOffline.online).toBe(false);
      expect(finalOffline.lastSeen).toBeTruthy();
    } finally {
      await disconnectSocket(socketB);

      if (socketA1?.connected) {
        await disconnectSocket(socketA1);
      }

      if (socketA2?.connected) {
        await disconnectSocket(socketA2);
      }
    }
  });
});

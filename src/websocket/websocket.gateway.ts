import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, SocketData } from 'socket.io';
import { WebsocketService } from './websocket.service';
import { AppSocket } from './types/socket-data';
import { SocketAuthMiddleware } from './middleware/socket-auth.middleware';
import { JoinChatDto } from './dto/join-chat.dto';
import { ConversationsService } from 'src/conversations/conversations.service';
import { MessageSendDto } from './dto/message-send.dto';
import { MessagesService } from 'src/messages/messages.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import {
  ChatPresence,
  ClientToServerEvents,
  ServerToClientEvents,
} from './types/socket-events';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    DefaultEventsMap,
    SocketData
  >;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    server.use(this.socketAuthMiddleware.middleware());
  }

  async handleConnection(client: AppSocket) {
    const userId = client.data.user.id;

    const wasOffline = !this.websocketService.isUserOnline(userId);

    this.websocketService.addConnection(userId, client.id);

    if (wasOffline) {
      const chatIds = await this.conversationsService.getUserChatIds(userId);

      await this.usersService.updateLastSeen(userId, null);

      chatIds.forEach((id) => {
        this.server
          .to(id)
          .emit('user:online', { userId, online: true, lastSeen: null });
      });
    }
  }

  async handleDisconnect(client: AppSocket) {
    const userId = client.data.user.id;

    this.websocketService.removeConnection(userId, client.id);

    if (!this.websocketService.isUserOnline(userId)) {
      const lastSeen = new Date();

      await this.usersService.updateLastSeen(userId, lastSeen);

      const chatIds = await this.conversationsService.getUserChatIds(userId);

      chatIds.forEach((id) => {
        this.server
          .to(id)
          .emit('user:offline', { userId, online: false, lastSeen });
      });
    }
  }

  @SubscribeMessage('presence:request')
  async handlePresence(@ConnectedSocket() client: AppSocket) {
    const userId = client.data.user.id;

    //many db requests, cuz every chat will be doing request to db
    const chatIds = await this.conversationsService.getUserChatIds(userId);

    const chats: ChatPresence[] = [];

    for (const chatId of chatIds) {
      const participants =
        await this.conversationsService.getChatParticipantsWithPresence(chatId);

      const users = participants
        .filter((participant) => participant.userId !== userId)
        .map((participant) => ({
          userId: participant.userId,
          online: this.websocketService.isUserOnline(participant.userId),
          lastSeen: participant.lastSeen,
        }));

      chats.push({
        chatId,
        users,
      });
    }

    client.emit('presence:sync', chats);
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: JoinChatDto,
  ) {
    const userId = client.data.user.id;
    const joinedChatIds: string[] = [];

    for (const chatId of data.chatIds) {
      if (!(await this.conversationsService.canAccessChat(chatId, userId))) {
        continue;
      }

      await client.join(chatId);
      joinedChatIds.push(chatId);
    }

    return { joinedChatIds };

    //do chat leave
  }

  @SubscribeMessage('chat:send')
  async handleMessageSend(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: MessageSendDto,
  ) {
    const userId = client.data.user.id;

    if (!(await this.conversationsService.canAccessChat(data.chatId, userId)))
      return;

    const message = await this.messagesService.create(
      { chatId: data.chatId, text: data.content },
      userId,
    );
    this.server.to(data.chatId).emit('message:new', message);
    //msg emit to client
  }
}

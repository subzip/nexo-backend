import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket, SocketData } from 'socket.io';
import { WebsocketService } from './websocket.service';
import { AppSocket } from './types/socket-data';
import { SocketAuthMiddleware } from './middleware/socket-auth.middleware';
import { JoinChatDto } from './dto/join-chat.dto';
import { ConversationsService } from 'src/conversations/conversations.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    SocketData
  >;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
    private readonly conversationsService: ConversationsService,
  ) {}

  afterInit(server: Server) {
    server.use(this.socketAuthMiddleware.middleware());
  }

  handleConnection(client: AppSocket) {
    const userId = client.data.user.id;

    this.websocketService.addConnection(userId, client.id);

    console.log('User sockets:', this.websocketService.getUserSockets(userId));
    console.log(client.data.user);
  }

  handleDisconnect(client: AppSocket) {
    const userId = client.data.user.id;

    this.websocketService.removeConnection(userId, client.id);

    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    console.log('Ping ', client.id);
    console.log('Data: ', data);

    client.emit('pong', {
      message: 'hi from server',
    });
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() chatIds: JoinChatDto,
  ) {
    const userId = client.data.user.id;

    for (const chatId of chatIds.chatIds) {
      if (!(await this.conversationsService.canAccessChat(chatId, userId)))
        continue;
      await client.join(chatId);
    }
    console.log(client.rooms);
  }

  @SubscribeMessage('room-message')
  handleRoomMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; text: string },
  ) {
    this.server.to(data.room).emit('room-message', {
      from: client.id,
      text: data.text,
    });
  }
}

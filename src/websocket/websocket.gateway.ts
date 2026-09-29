import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected', client.id);
    console.log(client.handshake.headers.cookie);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    console.log('Ping ', client.id);
    console.log('Data: ', data);

    client.emit('pong', {
      message: 'hi from server',
    });
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    await client.join(room);

    console.log(client.rooms);

    console.log(`${client.id} joined ${room}`);
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

import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SessionsModule } from 'src/sessions/sessions.module';
import { SocketAuthMiddleware } from './middleware/socket-auth.middleware';
import { WebsocketService } from './websocket.service';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { ConversationsService } from 'src/conversations/conversations.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [SessionsModule, ConversationsModule, UsersModule],
  providers: [
    WebsocketGateway,
    SocketAuthMiddleware,
    WebsocketService,
    ConversationsService,
  ],
})
export class WebsocketModule {}

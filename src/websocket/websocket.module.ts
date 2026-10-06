import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SessionsModule } from 'src/sessions/sessions.module';
import { SocketAuthMiddleware } from './middleware/socket-auth.middleware';
import { WebsocketService } from './websocket.service';
import { ConversationsModule } from 'src/conversations/conversations.module';

import { UsersModule } from 'src/users/users.module';
import { MessagesModule } from 'src/messages/messages.module';

@Module({
  imports: [SessionsModule, ConversationsModule, UsersModule, MessagesModule],
  providers: [WebsocketGateway, SocketAuthMiddleware, WebsocketService],
})
export class WebsocketModule {}

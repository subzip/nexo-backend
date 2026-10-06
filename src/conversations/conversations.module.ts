import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { SessionAuthGuard } from 'src/auth/guards/session-auth.guard';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, SessionsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, SessionAuthGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}

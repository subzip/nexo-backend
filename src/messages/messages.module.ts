import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { SessionsModule } from 'src/sessions/sessions.module';

@Module({
  imports: [PrismaModule, UsersModule, SessionsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}

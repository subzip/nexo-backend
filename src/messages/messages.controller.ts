import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthUser } from 'src/auth/types/auth-user.type';
import { SessionAuthGuard } from 'src/auth/guards/session-auth.guard';

@Controller('messages')
@UseGuards(SessionAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() dto: CreateMessageDto, @CurrentUser() user: AuthUser) {
    return this.messagesService.create(dto, user.id);
  }

  @Get()
  findMessagesByUsername(
    @Query('username') username: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.findMessagesByUsername(username, user.id);
  }

  @Get(':id')
  findMessagesForChat(
    @Param('id') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.findMessagesForChat(chatId, user.id);
  }
}

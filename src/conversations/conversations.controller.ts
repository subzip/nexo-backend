import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SessionAuthGuard } from 'src/auth/guards/session-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthUser } from 'src/auth/types/auth-user.type';

@Controller('conversations')
@UseGuards(SessionAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('create')
  create(@Body() dto: CreateConversationDto, @CurrentUser() user: AuthUser) {
    return this.conversationsService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.conversationsService.findAllByUserId(user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.conversationsService.findById(id, user.id);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('create')
  create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.conversationsService.findAllByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Query('userId') userId: string) {
    return this.conversationsService.findById(id, userId);
  }
}

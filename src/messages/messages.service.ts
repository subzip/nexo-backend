import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMessageDto, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: dto.chatId,
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) throw new ForbiddenException('no chat for this user');

    return this.prisma.message.create({
      data: {
        chatId: dto.chatId,
        senderId: userId,
        text: dto.text,
      },
    });
  }

  async findMessagesForChat(chatId: string, userId: string) {
    //feat: pagination for msgs(limit 100 for example)
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) throw new ForbiddenException('no chat for this user');

    return this.prisma.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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

  async findMessagesByUsername(username: string, userId: string) {
    const otherUser = await this.usersService.findByUsername(username);

    if (!otherUser) throw new NotFoundException('chat not found');

    const chat = await this.prisma.chat.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId, otherUser?.id],
            },
          },
          some: {
            userId,
          },
        },
      },
    });

    if (!chat) throw new ForbiddenException('no chat for this user');

    return this.prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

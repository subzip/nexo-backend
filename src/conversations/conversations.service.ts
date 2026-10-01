import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UsersService } from 'src/users/users.service';
import { ChatPreview } from 'src/auth/types/conversations.type';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateConversationDto, creatorId: string) {
    if (dto.userId === creatorId) {
      throw new BadRequestException(
        'Cannot create a conversation with yourself',
      );
    }

    const creator = await this.usersService.findById(creatorId);
    const participant = await this.usersService.findById(dto.userId);

    if (!creator || !participant) {
      throw new NotFoundException('User not found');
    }
    //resolve race condition if 2 requests sent at the same time
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'direct',
        participants: {
          some: {
            userId: creatorId,
          },
        },
        AND: {
          participants: {
            some: {
              userId: dto.userId,
            },
          },
        },
      },
    });

    if (existingChat) return existingChat;

    return this.prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          type: 'direct',
        },
      });

      await tx.chatParticipants.createMany({
        data: [
          {
            chatId: chat.id,
            role: 'participant',
            userId: creatorId,
          },
          {
            chatId: chat.id,
            role: 'participant',
            userId: dto.userId,
          },
        ],
      });

      return chat;
    });
  }

  async findAllByUserId(id: string) {
    return this.prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: id,
          },
        },
      },
      include: {
        participants: {
          where: {
            userId: {
              not: id,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                avatar: true,
                username: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.chat.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          where: {
            userId: {
              not: userId,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                avatar: true,
                username: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });
  }

  async getChatPreview(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) throw new NotFoundException('User not found');

    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'direct',
        participants: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },

        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            chatId: true,
            senderId: true,
            text: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const chatPreviews: ChatPreview[] = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (participant) => participant.user.id !== userId,
      )!.user;

      const lastMessage = chat.messages[0] ?? null;

      return {
        chatId: chat.id,
        title: otherUser.username,
        participantId: otherUser.id,
        avatar: otherUser.avatar,
        lastMessage,
        lastMessageTime: lastMessage?.createdAt ?? chat.createdAt,
        unreadCount: 0,
      };
    });

    return chatPreviews;
  }
}

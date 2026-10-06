import { PrismaService } from '../../src/prisma/prisma.service';

type CreateChatParams = {
  prisma: PrismaService;
  userId: string;
  participantIds?: string[];
};

export const createTestChat = async ({
  prisma,
  userId,
  participantIds = [],
}: CreateChatParams) => {
  const chat = await prisma.chat.create({
    data: {
      type: 'direct',
      participants: {
        create: [
          {
            userId,
            role: 'participant',
          },
          ...participantIds.map((participantId) => ({
            userId: participantId,
            role: 'participant' as const,
          })),
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  return chat;
};

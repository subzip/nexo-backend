import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes, createHash } from 'node:crypto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string) {
    const token = randomBytes(32).toString('hex');

    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async findByToken(token: string) {
    const tokenHash = this.hashToken(token);

    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!session) return null;
    if (session.expiresAt <= new Date()) return null;
    return session;
  }

  async deleteByToken(token: string) {
    const tokenHash = this.hashToken(token);

    await this.prisma.session.deleteMany({
      where: {
        tokenHash,
      },
    });
  }
}

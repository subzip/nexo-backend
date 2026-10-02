import { Injectable } from '@nestjs/common';

import { SessionsService } from 'src/sessions/sessions.service';
import { AppSocket } from '../types/socket-data';

@Injectable()
export class SocketAuthMiddleware {
  constructor(private readonly sessionsService: SessionsService) {}

  async use(socket: AppSocket, next: (err?: Error) => void) {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        return next(new Error('Unauthorized'));
      }

      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((cookie) => {
          const [key, ...value] = cookie.split('=');

          return [key, value.join('=')];
        }),
      );

      const token = cookies.session;

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const session = await this.sessionsService.findByToken(token);

      if (!session) {
        return next(new Error('Unauthorized'));
      }

      socket.data.user = {
        id: session.user.id,
        username: session.user.username,
        avatar: session.user.avatar,
      };

      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  }

  middleware() {
    return (socket: AppSocket, next: (err?: Error) => void) => {
      void this.use(socket, next);
    };
  }
}

import type { AuthUser } from 'src/auth/types/auth-user';

declare module 'socket.io' {
  interface SocketData {
    user: AuthUser;
  }
}

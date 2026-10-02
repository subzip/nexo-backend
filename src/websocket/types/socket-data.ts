import { Socket } from 'socket.io';
import { AuthUser } from 'src/auth/types/auth-user.type';

export type SocketData = {
  user: AuthUser;
};

export type AppSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

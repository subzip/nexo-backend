import { Socket } from 'socket.io';
import { AuthUser } from 'src/auth/types/auth-user.type';
import { ClientToServerEvents, ServerToClientEvents } from './socket-events';

export type SocketData = {
  user: AuthUser;
};

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

import { Injectable } from '@nestjs/common';

@Injectable()
export class WebsocketService {
  private readonly userSockets = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string) {
    let sockets = this.userSockets.get(userId);

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
  }

  removeConnection(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);

    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) this.userSockets.delete(userId);
  }

  getUserSockets(userId: string): string[] {
    return [...(this.userSockets.get(userId) ?? [])];
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

import { Socket, io } from 'socket.io-client';

export const connectSocket = (
  url: string,
  sessionCookie: string,
): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      extraHeaders: {
        Cookie: sessionCookie,
      },
      transports: ['websocket'],
    });

    socket.once('connect', () => resolve(socket));

    socket.once('connect_error', (error) => {
      reject(error);
    });
  });
};

export const waitForEvent = <T>(
  socket: Socket,
  event: string,
  timeout = 3000,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    const handler = (data: T) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };

    socket.once(event, handler);
  });
};

export const waitForEventMatching = <T>(
  socket: Socket,
  event: string,
  predicate: (data: T) => boolean,
  timeout = 3000,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for matching event: ${event}`));
    }, timeout);

    const handler = (data: T) => {
      if (!predicate(data)) {
        return;
      }

      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };

    socket.on(event, handler);
  });
};

export const expectNoEventMatching = <T>(
  socket: Socket,
  event: string,
  predicate: (data: T) => boolean,
  timeout = 500,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const handler = (data: T) => {
      if (!predicate(data)) {
        return;
      }

      clearTimeout(timer);
      socket.off(event, handler);
      reject(new Error(`Unexpected event: ${event}`));
    };

    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, timeout);

    socket.on(event, handler);
  });
};

export const disconnectSocket = (socket: Socket): Promise<void> => {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve();
      return;
    }

    socket.once('disconnect', () => {
      resolve();
    });

    socket.disconnect();
  });
};

export const joinChat = (
  socket: Socket,
  chatIds: string[],
): Promise<{ joinedChatIds: string[] }> => {
  return new Promise((resolve) => {
    socket.emit('chat:join', { chatIds }, resolve);
  });
};

export const expectNoEvent = (
  socket: Socket,
  event: string,
  timeout = 500,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const handler = () => {
      clearTimeout(timer);
      socket.off(event, handler);
      reject(new Error(`Unexpected event: ${event}`));
    };

    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, timeout);

    socket.once(event, handler);
  });
};

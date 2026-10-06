import { Test, TestingModule } from '@nestjs/testing';
import { SocketAuthMiddleware } from './socket-auth.middleware';
import { SessionsService } from 'src/sessions/sessions.service';
import { AppSocket } from '../types/socket-data';

describe('SocketAuthMiddleware', () => {
  let middleware: SocketAuthMiddleware;

  const sessionsServiceMock = {
    findByToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketAuthMiddleware,
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    middleware = module.get<SocketAuthMiddleware>(SocketAuthMiddleware);
  });

  const createSocket = (cookie?: string): AppSocket =>
    ({
      handshake: {
        headers: cookie === undefined ? {} : { cookie },
      },
      data: {},
    }) as unknown as AppSocket;

  /** Runs the middleware and exposes the socket, the `next` callback and the
   *  error `next` was called with (if any). */
  const authenticate = async (cookie?: string) => {
    const socket = createSocket(cookie);
    const next = jest.fn((err?: Error) => err);

    await middleware.use(socket, next);

    return { socket, next, error: next.mock.calls[0][0] };
  };

  type AuthResult = Awaited<ReturnType<typeof authenticate>>;

  const expectUnauthorized = (result: AuthResult) => {
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Unauthorized');
  };

  describe('use', () => {
    it('should reject when there is no cookie header', async () => {
      const result = await authenticate();

      expectUnauthorized(result);
      expect(sessionsServiceMock.findByToken).not.toHaveBeenCalled();
      expect(result.socket.data.user).toBeUndefined();
    });

    it('should reject when there is no session cookie', async () => {
      const result = await authenticate('other=value');

      expectUnauthorized(result);
      expect(sessionsServiceMock.findByToken).not.toHaveBeenCalled();
      expect(result.socket.data.user).toBeUndefined();
    });

    it('should reject when the session does not exist', async () => {
      sessionsServiceMock.findByToken.mockResolvedValue(null);

      const result = await authenticate('session=token');

      expect(sessionsServiceMock.findByToken).toHaveBeenCalledWith('token');
      expectUnauthorized(result);
      expect(result.socket.data.user).toBeUndefined();
    });

    it('should reject when the session lookup throws', async () => {
      sessionsServiceMock.findByToken.mockRejectedValue(new Error('db down'));

      const result = await authenticate('session=token');

      expectUnauthorized(result);
      expect(result.socket.data.user).toBeUndefined();
    });

    it('should authenticate a valid session', async () => {
      sessionsServiceMock.findByToken.mockResolvedValue({
        user: {
          id: 'user-1',
          username: 'andrei',
          avatar: null,
        },
      });

      const result = await authenticate('session=token');

      expect(result.next).toHaveBeenCalledWith();
      expect(result.error).toBeUndefined();
      expect(sessionsServiceMock.findByToken).toHaveBeenCalledWith('token');
      expect(result.socket.data.user).toEqual({
        id: 'user-1',
        username: 'andrei',
        avatar: null,
      });
    });

    it('should preserve "=" characters inside the token value', async () => {
      sessionsServiceMock.findByToken.mockResolvedValue({
        user: {
          id: 'user-1',
          username: 'andrei',
          avatar: null,
        },
      });

      const result = await authenticate('session=abc=def=ghi');

      expect(sessionsServiceMock.findByToken).toHaveBeenCalledWith(
        'abc=def=ghi',
      );
      expect(result.next).toHaveBeenCalledWith();
      expect(result.error).toBeUndefined();
    });
  });

  describe('middleware', () => {
    it('should return a socket.io middleware function', () => {
      const handler = middleware.middleware();

      expect(typeof handler).toBe('function');
    });
  });
});

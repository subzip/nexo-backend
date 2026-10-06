import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketService } from './websocket.service';

describe('WebsocketService', () => {
  let service: WebsocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebsocketService],
    }).compile();

    service = module.get<WebsocketService>(WebsocketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addConnection', () => {
    it('should mark a user as online', () => {
      service.addConnection('user-1', 'socket-1');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getUserSockets('user-1')).toEqual(['socket-1']);
    });

    it('should accumulate several sockets for the same user', () => {
      service.addConnection('user-1', 'socket-1');
      service.addConnection('user-1', 'socket-2');

      expect(service.getUserSockets('user-1')).toEqual([
        'socket-1',
        'socket-2',
      ]);
    });

    it('should keep users isolated from each other', () => {
      service.addConnection('user-1', 'socket-1');
      service.addConnection('user-2', 'socket-2');

      expect(service.getUserSockets('user-1')).toEqual(['socket-1']);
      expect(service.getUserSockets('user-2')).toEqual(['socket-2']);
    });

    it('should ignore a duplicate socket id', () => {
      service.addConnection('user-1', 'socket-1');
      service.addConnection('user-1', 'socket-1');

      expect(service.getUserSockets('user-1')).toEqual(['socket-1']);
    });
  });

  describe('removeConnection', () => {
    it('should keep the user online while another socket remains', () => {
      service.addConnection('user-1', 'socket-1');
      service.addConnection('user-1', 'socket-2');

      service.removeConnection('user-1', 'socket-1');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getUserSockets('user-1')).toEqual(['socket-2']);
    });

    it('should mark the user offline when the last socket is removed', () => {
      service.addConnection('user-1', 'socket-1');

      service.removeConnection('user-1', 'socket-1');

      expect(service.isUserOnline('user-1')).toBe(false);
      expect(service.getUserSockets('user-1')).toEqual([]);
    });

    it('should forget an unknown user without throwing', () => {
      expect(() =>
        service.removeConnection('unknown-user', 'socket-1'),
      ).not.toThrow();

      expect(service.isUserOnline('unknown-user')).toBe(false);
    });

    it('should ignore an unknown socket id', () => {
      service.addConnection('user-1', 'socket-1');

      service.removeConnection('user-1', 'unknown-socket');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getUserSockets('user-1')).toEqual(['socket-1']);
    });
  });

  describe('isUserOnline', () => {
    it('should be false by default', () => {
      expect(service.isUserOnline('user-1')).toBe(false);
    });
  });

  describe('getUserSockets', () => {
    it('should return an empty array for an unknown user', () => {
      expect(service.getUserSockets('unknown-user')).toEqual([]);
    });
  });
});

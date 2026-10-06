import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { SessionsService } from 'src/sessions/sessions.service';

describe('MessagesController', () => {
  let controller: MessagesController;

  const messagesServiceMock = {
    create: jest.fn(),
    findMessagesByUsername: jest.fn(),
    findMessagesForChat: jest.fn(),
  };

  const sessionsServiceMock = {
    findByToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: messagesServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

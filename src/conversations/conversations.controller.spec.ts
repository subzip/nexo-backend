import { Test } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AuthUser } from 'src/auth/types/auth-user.type';
import { SessionsService } from 'src/sessions/sessions.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;

  const conversationsServiceMock = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
  };

  const sessionsServiceMock = {
    findByToken: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsServiceMock,
        },
        {
          provide: SessionsService,
          useValue: sessionsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a conversation for the current user', async () => {
    const dto = {
      userId: 'user-id',
    };

    const currentUser: AuthUser = {
      id: 'creator-id',
      username: 'andrei',
      avatar: null,
    };

    const conversation = {
      id: 'chat-id',
      type: 'direct',
    };

    conversationsServiceMock.create.mockResolvedValue(conversation);

    const result = await controller.create(dto, currentUser);

    expect(result).toEqual(conversation);

    expect(conversationsServiceMock.create).toHaveBeenCalledWith(
      dto,
      'creator-id',
    );
  });

  it('should return conversations for the current user', async () => {
    const currentUser: AuthUser = {
      id: 'user-id',
      username: 'andrei',
      avatar: null,
    };

    const conversations = [
      {
        id: 'chat-1',
        type: 'direct',
      },
      {
        id: 'chat-2',
        type: 'direct',
      },
    ];

    conversationsServiceMock.findAllByUserId.mockResolvedValue(conversations);

    const result = await controller.findAll(currentUser);

    expect(result).toEqual(conversations);

    expect(conversationsServiceMock.findAllByUserId).toHaveBeenCalledWith(
      'user-id',
    );
  });

  it('should return a conversation by id for the current user', async () => {
    const chatId = 'chat-id';

    const currentUser: AuthUser = {
      id: 'user-id',
      username: 'andrei',
      avatar: null,
    };

    const conversation = {
      id: chatId,
      type: 'direct',
    };

    conversationsServiceMock.findById.mockResolvedValue(conversation);

    const result = await controller.findById(chatId, currentUser);

    expect(result).toEqual(conversation);

    expect(conversationsServiceMock.findById).toHaveBeenCalledWith(
      chatId,
      'user-id',
    );
  });
});

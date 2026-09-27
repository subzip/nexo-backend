import { Test } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;

  const conversationsServiceMock = {
    create: jest.fn(),
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a conversation', async () => {
    const dto = {
      creatorId: 'creator-id',
      userId: 'user-id',
    };

    const conversation = {
      id: 'chat-id',
      type: 'direct',
    };

    conversationsServiceMock.create.mockResolvedValue(conversation);

    const result = await controller.create(dto);

    expect(result).toEqual(conversation);
    expect(conversationsServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('should return conversations for a user', async () => {
    const userId = 'user-id';

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

    const result = await controller.findAll(userId);

    expect(result).toEqual(conversations);
    expect(conversationsServiceMock.findAllByUserId).toHaveBeenCalledWith(
      userId,
    );
  });

  it('should return a conversation by id', async () => {
    const chatId = 'chat-id';
    const userId = 'user-id';

    const conversation = {
      id: chatId,
      type: 'direct',
    };

    conversationsServiceMock.findById.mockResolvedValue(conversation);

    const result = await controller.findById(chatId, userId);

    expect(result).toEqual(conversation);
    expect(conversationsServiceMock.findById).toHaveBeenCalledWith(
      chatId,
      userId,
    );
  });
});

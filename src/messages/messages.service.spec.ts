import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';

describe('MessagesService', () => {
  let service: MessagesService;

  const prismaMock = {
    chat: {
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const usersServiceMock = {
    findByUsername: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

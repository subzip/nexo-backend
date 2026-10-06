import { validate } from 'class-validator';
import { JoinChatDto } from './join-chat.dto';
import { MessageSendDto } from './message-send.dto';

const UUID_V4 = '11111111-1111-4111-8111-111111111111';

describe('JoinChatDto', () => {
  it('should accept an array of uuid v4 values', async () => {
    const dto = new JoinChatDto();
    dto.chatIds = [UUID_V4, UUID_V4];

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should accept an empty array', async () => {
    const dto = new JoinChatDto();
    dto.chatIds = [];

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should reject a non-array value', async () => {
    const dto = new JoinChatDto();
    (dto as { chatIds: unknown }).chatIds = UUID_V4;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isArray');
  });

  it('should reject a non-uuid entry', async () => {
    const dto = new JoinChatDto();
    dto.chatIds = [UUID_V4, 'not-a-uuid'];

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isUuid');
  });
});

describe('MessageSendDto', () => {
  it('should accept a valid message', async () => {
    const dto = new MessageSendDto();
    dto.chatId = UUID_V4;
    dto.content = 'hello';

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should reject a non-uuid chatId', async () => {
    const dto = new MessageSendDto();
    dto.chatId = 'nope';
    dto.content = 'hello';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isUuid');
  });

  it('should reject an empty message', async () => {
    const dto = new MessageSendDto();
    dto.chatId = UUID_V4;
    dto.content = '';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isLength');
  });

  it('should reject a message longer than 555 characters', async () => {
    const dto = new MessageSendDto();
    dto.chatId = UUID_V4;
    dto.content = 'a'.repeat(556);

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isLength');
  });

  it('should reject a missing message body', async () => {
    const dto = new MessageSendDto();
    dto.chatId = UUID_V4;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isLength');
    expect(errors[0].constraints).toHaveProperty('isString');
  });
});

import { IsString, IsUUID, Length } from 'class-validator';

export class MessageSendDto {
  @IsUUID()
  chatId: string;

  @Length(1, 555)
  @IsString()
  content: string;
}

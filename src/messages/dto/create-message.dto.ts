import { IsString, IsUUID, Length } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  chatId: string;

  @IsString()
  @Length(1, 555)
  text: string;
}

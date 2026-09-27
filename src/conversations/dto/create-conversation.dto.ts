import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  creatorId: string;

  @IsUUID()
  userId: string;
}

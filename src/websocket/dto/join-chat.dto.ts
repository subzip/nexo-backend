import { IsArray, IsUUID } from 'class-validator';

export class JoinChatDto {
  @IsArray()
  @IsUUID('4', { each: true })
  chatIds: string[];
}

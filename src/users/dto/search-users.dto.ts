import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SearchUsersDto {
  @ApiProperty({
    description: 'Username search query',
    example: 'and',
  })
  @IsString()
  @Length(3, 30)
  username: string;
}

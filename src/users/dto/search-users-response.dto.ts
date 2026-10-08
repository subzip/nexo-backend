import { ApiProperty } from '@nestjs/swagger';

export class SearchUserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    example: 'andrei',
  })
  username: string;

  @ApiProperty({
    nullable: true,
    example: 'https://example.com/avatar.jpg',
  })
  avatar: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-10-08T21:30:00.000Z',
  })
  lastSeen: Date | null;
}

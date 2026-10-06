import { IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 30)
  username: string;

  @IsString()
  @Length(1, 100)
  passwordHash: string;
}

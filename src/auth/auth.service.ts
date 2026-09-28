import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto/register.dto';
import * as argon2 from 'argon2';

import { LoginDto } from './dto/register.dto/login.dto';
import { SessionsService } from 'src/sessions/sessions.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsernameForAuth(dto.username);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const sessionToken = await this.sessionsService.create(user.id);

    return {
      sessionToken,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByUsername(dto.username);

    if (existingUser) throw new ConflictException('Username exists');

    const passwordHash = await argon2.hash(dto.password);

    return this.usersService.create({
      username: dto.username,
      passwordHash,
    });
  }
}

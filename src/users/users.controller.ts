import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SessionAuthGuard } from 'src/auth/guards/session-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthUser } from 'src/auth/types/auth-user.type';
import { SearchUsersDto } from './dto/search-users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  @Get('search')
  @UseGuards(SessionAuthGuard)
  async findByUsernameSearch(
    @Query() dto: SearchUsersDto,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.usersService.findByUsernameSearch(dto, user.id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionsService } from '../../sessions/sessions.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = request.cookies?.session as string | undefined;

    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionsService.findByToken(token);

    if (!session) {
      throw new UnauthorizedException();
    }

    request.user = session.user;

    return true;
  }
}

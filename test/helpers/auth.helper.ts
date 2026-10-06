import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';

type TestUser = {
  id: string;
  username: string;
  password: string;
};

export const createTestUser = async (
  app: INestApplication<App>,
  prefix = 'ws-user',
): Promise<TestUser> => {
  const username = `${prefix.slice(0, 10)}-${Date.now()}`;

  const password = 'password123';

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      username,
      password,
    })
    .expect(201);

  const user = response.body as {
    id: string;
  };

  return {
    id: user.id,
    username,
    password,
  };
};

export const loginTestUser = async (
  app: INestApplication<App>,
  user: TestUser,
): Promise<string> => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      username: user.username,
      password: user.password,
    })
    .expect(201);

  return response.headers['set-cookie'][0];
};

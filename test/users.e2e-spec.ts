import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { createTestApp } from './helpers/create-app';
import { createTestUser, loginTestUser } from './helpers/auth.helper';

type SearchUser = {
  id: string;
  username: string;
  avatar: string | null;
  lastSeen: string | null;
};

describe('GET /users/search', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const search = (cookie: string, username: string) =>
    request(app.getHttpServer())
      .get('/users/search')
      .set('Cookie', cookie)
      .query({ username });

  const createAndLogin = async (prefix: string) => {
    const user = await createTestUser(app, prefix);
    const cookie = await loginTestUser(app, user);

    return { user, cookie };
  };

  it('returns matching users for authenticated user', async () => {
    const { cookie } = await createAndLogin('t1-find');
    const target = await createTestUser(app, 'target-a');

    const res = await search(cookie, 'target-a').expect(200);

    const body = res.body as SearchUser[];

    expect(body.map((user) => user.id)).toContain(target.id);
  });

  it('performs case-insensitive partial search', async () => {
    const { cookie } = await createAndLogin('t2-case');
    const mixedCase = await createTestUser(app, 'MiXeDcAsE');

    const res = await search(cookie, 'mIxE').expect(200);

    const body = res.body as SearchUser[];

    expect(body.map((user) => user.id)).toContain(mixedCase.id);
  });

  it('excludes current user', async () => {
    const { user: me, cookie } = await createAndLogin('excl-me');
    const other = await createTestUser(app, 'excl-other');

    const res = await search(cookie, 'excl-').expect(200);

    const ids = (res.body as SearchUser[]).map((user) => user.id);

    expect(ids).toContain(other.id);
    expect(ids).not.toContain(me.id);
  });

  it('returns only public user fields', async () => {
    const { cookie } = await createAndLogin('t4-pub');
    const target = await createTestUser(app, 'public-a');

    const res = await search(cookie, 'public-a').expect(200);

    const body = res.body as SearchUser[];

    expect(body.map((user) => user.id)).toContain(target.id);

    for (const user of body) {
      expect(Object.keys(user).sort()).toEqual([
        'avatar',
        'id',
        'lastSeen',
        'username',
      ]);
    }

    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('returns [] when there are no matches', async () => {
    const { cookie } = await createAndLogin('t5-empty');

    const res = await search(cookie, 'zz-no-such-user').expect(200);

    expect(res.body as SearchUser[]).toEqual([]);
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .get('/users/search')
      .query({ username: 'target-a' })
      .expect(401);
  });

  it('rejects an invalid username query', async () => {
    const { cookie } = await createAndLogin('t6-validation');

    await search(cookie, 'ab').expect(400);
  });
});

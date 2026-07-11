import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { signAccessToken } from '../services/jwt';
import type { AppEnv } from '../types';
import { authMiddleware } from './auth';

const SECRET = 'test-secret-do-not-use-in-production';

function createApp() {
  const app = new Hono<AppEnv>();
  app.get('/me', authMiddleware, (c) => c.json(c.get('user')));
  return app;
}

describe('authMiddleware', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await createApp().request('/me', {}, { JWT_SIGNING_KEY: SECRET });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await createApp().request(
      '/me',
      { headers: { Authorization: 'Basic xyz' } },
      { JWT_SIGNING_KEY: SECRET },
    );
    expect(res.status).toBe(401);
  });

  it('accepts a valid token and sets the user on context', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'super_admin' },
      SECRET,
    );
    const res = await createApp().request(
      '/me',
      { headers: { Authorization: `Bearer ${token}` } },
      { JWT_SIGNING_KEY: SECRET },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sub: 'user-1', email: 'a@b.com', role: 'super_admin' });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'super_admin' },
      'wrong-secret',
    );
    const res = await createApp().request(
      '/me',
      { headers: { Authorization: `Bearer ${token}` } },
      { JWT_SIGNING_KEY: SECRET },
    );
    expect(res.status).toBe(401);
  });
});

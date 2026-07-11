import { roles, users } from '@ml-trading-ops/db';
import { createTestDb } from '@ml-trading-ops/db/test';
import { hashPassword } from '@ml-trading-ops/shared';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../types';
import { authRoutes } from './auth';

const JWT_SIGNING_KEY = 'test-signing-key';
const JWT_REFRESH_KEY = 'test-refresh-key';
const TEST_PASSWORD = 'correcthorse1';
const TEST_EMAIL = 'test@example.com';

function createFakeKV() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as AppEnv['Bindings']['RATE_LIMIT_KV'];
}

async function createTestApp() {
  const db = await createTestDb();

  const [role] = await db
    .insert(roles)
    .values({ key: 'super_admin', name: 'Super Admin' })
    .returning();
  if (!role) throw new Error('role insert returned no row');

  const passwordHash = await hashPassword(TEST_PASSWORD);
  await db.insert(users).values({
    email: TEST_EMAIL,
    passwordHash,
    name: 'Test User',
    roleId: role.id,
  });

  const app = new Hono<AppEnv>();
  // Inject the pglite-backed test db directly — bypasses dbMiddleware's real
  // createDb(), which would try to hit an actual Neon connection.
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });
  app.route('/auth', authRoutes);

  return {
    app,
    env: { JWT_SIGNING_KEY, JWT_REFRESH_KEY, RATE_LIMIT_KV: createFakeKV() },
  };
}

describe('POST /auth/login', () => {
  it('happy path: returns tokens and user info for correct credentials', async () => {
    const { app, env } = await createTestApp();

    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { email: string; role: string };
    };
    expect(body.accessToken).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');
    expect(body.user).toMatchObject({ email: TEST_EMAIL, role: 'super_admin' });
  });

  it('wrong password: returns 401 with a generic UNAUTHORIZED error', async () => {
    const { app, env } = await createTestApp();

    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: 'wrongpassword1' }),
      },
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('unknown email: returns the same generic 401 (does not leak account existence)', async () => {
    const { app, env } = await createTestApp();

    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.com', password: TEST_PASSWORD }),
      },
      env,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Invalid email or password');
  });
});

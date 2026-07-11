import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../types';
import { loginRateLimitKey, loginRateLimiter } from './rateLimit';

function createFakeKV() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as AppEnv['Bindings']['RATE_LIMIT_KV'];
}

function createApp() {
  const app = new Hono<AppEnv>();
  app.post('/login', loginRateLimiter, (c) => c.json({ ok: true }));
  return app;
}

describe('loginRateLimitKey', () => {
  it('lowercases the email so casing does not bypass the limit', () => {
    expect(loginRateLimitKey('1.2.3.4', 'A@B.com')).toBe(loginRateLimitKey('1.2.3.4', 'a@b.com'));
  });
});

describe('loginRateLimiter', () => {
  it('allows up to 5 attempts then blocks the 6th', async () => {
    const app = createApp();
    const RATE_LIMIT_KV = createFakeKV();
    const body = JSON.stringify({ email: 'a@b.com', password: 'x' });
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' };

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/login',
        { method: 'POST', body, headers },
        { RATE_LIMIT_KV },
      );
      expect(res.status).toBe(200);
    }

    const blocked = await app.request(
      '/login',
      { method: 'POST', body, headers },
      { RATE_LIMIT_KV },
    );
    expect(blocked.status).toBe(429);
  });

  it('tracks separate IP+email pairs independently', async () => {
    const app = createApp();
    const RATE_LIMIT_KV = createFakeKV();
    const headersA = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' };
    const headersB = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '2.2.2.2' };
    const body = JSON.stringify({ email: 'a@b.com', password: 'x' });

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/login',
        { method: 'POST', body, headers: headersA },
        { RATE_LIMIT_KV },
      );
      expect(res.status).toBe(200);
    }

    // Different IP, same email — separate bucket, should still be allowed.
    const res = await app.request(
      '/login',
      { method: 'POST', body, headers: headersB },
      { RATE_LIMIT_KV },
    );
    expect(res.status).toBe(200);
  });
});

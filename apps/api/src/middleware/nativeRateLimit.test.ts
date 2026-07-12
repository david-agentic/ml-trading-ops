import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../types';
import { authFloodGuard } from './nativeRateLimit';

/**
 * Cloudflare's native Rate Limiting binding is a Workers-runtime-only primitive —
 * its actual fixed-window counting algorithm runs on Cloudflare's infrastructure,
 * not in this process, so it can't be genuinely exercised outside a real deployed
 * Worker (or @cloudflare/vitest-pool-workers, which needs the workerd binary this
 * network can't download — see apps/api/vitest.config.ts). What IS tested here,
 * with a fake implementing the binding's exact interface ({ limit(opts):
 * Promise<{success}> }), is that OUR middleware correctly reacts to both outcomes
 * the binding can return: blocks with 429 on { success: false }, passes through on
 * { success: true }. That's the code that's actually ours to get right.
 */
function createFakeLimiter(success: boolean) {
  return {
    limit: async () => ({ success }),
  } as unknown as AppEnv['Bindings']['AUTH_RATE_LIMITER'];
}

function createApp() {
  const app = new Hono<AppEnv>();
  app.get('/auth/probe', authFloodGuard, (c) => c.json({ ok: true }));
  return app;
}

describe('authFloodGuard', () => {
  it('passes the request through when the binding allows it', async () => {
    const res = await createApp().request(
      '/auth/probe',
      { headers: { 'CF-Connecting-IP': '1.2.3.4' } },
      { AUTH_RATE_LIMITER: createFakeLimiter(true) },
    );
    expect(res.status).toBe(200);
  });

  it('blocks with 429 when the binding reports the limit was exceeded', async () => {
    const res = await createApp().request(
      '/auth/probe',
      { headers: { 'CF-Connecting-IP': '1.2.3.4' } },
      { AUTH_RATE_LIMITER: createFakeLimiter(false) },
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});

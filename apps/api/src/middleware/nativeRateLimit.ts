import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';

/**
 * Fast first-line flood guard on all of /auth/*, using Cloudflare's native Rate
 * Limiting binding (in-region, no round-trip to KV). This is deliberately blunt —
 * a fixed per-IP request-volume cap, not the precise business rule. The precise
 * rule (5 login attempts/15min per IP+email) is a separate, second layer —
 * see middleware/rateLimit.ts's loginRateLimiter, which runs after this on
 * POST /auth/login specifically.
 *
 * Limit: 30 requests / 10s per IP. Rationale: the native binding's `simple` mode
 * only supports fixed windows of 10 or 60 seconds (not the 900s the precise rule
 * needs, which is why KV still does the real work) — 10s was chosen over 60s for
 * faster recovery after a burst. 30 req/10s is generous enough that a shared
 * office/NAT IP with several staff logging in around the same moment won't trip
 * it, while a scripted flood (dozens of requests/sec) will.
 */
export async function authFloodGuard(c: Context<AppEnv>, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: ip });

  if (!success) {
    return c.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
      429,
    );
  }

  await next();
}

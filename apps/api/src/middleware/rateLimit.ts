import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

export function loginRateLimitKey(ip: string, email: string): string {
  return `ratelimit:login:${ip}:${email.toLowerCase()}`;
}

/**
 * 5 attempts / 15 min per IP+email (CLAUDE.md §14), counting every request that
 * reaches this endpoint regardless of outcome — separate from login_history's
 * success/failure audit trail, which serves a different purpose.
 *
 * Read-then-increment against Workers KV, not atomic — KV is eventually consistent
 * (~60s global propagation), so a distributed attacker hitting multiple Cloudflare
 * colos simultaneously could squeeze a few extra attempts through. Accepted
 * limitation for an internal B2B tool in Phase 1 (see phase-01-plan.md).
 */
export async function loginRateLimiter(c: Context<AppEnv>, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  let email = 'unknown';
  try {
    const body = await c.req.json<{ email?: unknown }>();
    if (typeof body?.email === 'string') {
      email = body.email;
    }
  } catch {
    // Malformed body — let the route's own Zod validation produce the error.
  }

  const key = loginRateLimitKey(ip, email);
  const current = await c.env.RATE_LIMIT_KV.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= MAX_ATTEMPTS) {
    return c.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } },
      429,
    );
  }

  await c.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  await next();
}

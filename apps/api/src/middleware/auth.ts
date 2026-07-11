import type { Context, Next } from 'hono';
import { TokenExpiredError, verifyAccessToken } from '../services/jwt';
import type { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } },
      401,
    );
  }

  try {
    const payload = await verifyAccessToken(token, c.env.JWT_SIGNING_KEY);
    c.set('user', payload);
  } catch (err) {
    const message = err instanceof TokenExpiredError ? 'Token has expired' : 'Invalid token';
    return c.json({ error: { code: 'UNAUTHORIZED', message } }, 401);
  }

  await next();
}

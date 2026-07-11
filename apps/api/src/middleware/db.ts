import { createDb } from '@ml-trading-ops/db';
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';

/** Creates one db client per request and sets it on context — routes use c.get('db')
 * instead of calling createDb() themselves, so tests can substitute a different db
 * (see packages/db/src/testDb.ts) without touching route code. */
export async function dbMiddleware(c: Context<AppEnv>, next: Next) {
  c.set('db', createDb(c.env.DATABASE_URL));
  await next();
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Neon's HTTP driver — the only one that works inside a Workers V8 isolate (no raw
 * TCP sockets available). Trade-off: no real interactive transactions. For atomic
 * multi-statement writes (e.g. create user + write audit log), use db.batch([...])
 * instead of db.transaction(...) — see createDb() usage sites for the pattern.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;

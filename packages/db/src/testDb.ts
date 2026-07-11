import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';
import type { Db } from './client';

// Passing a string (not a URL object) to fileURLToPath sidesteps a cross-package
// @types/node version mismatch that otherwise makes the URL-object overload's
// types incompatible when this file is typechecked from a different workspace
// package (e.g. apps/api importing @ml-trading-ops/db/test).
function migrationsDirPath(): string {
  return fileURLToPath(new URL('../migrations', import.meta.url).href);
}

/**
 * In-memory Postgres (WASM, no external process) for genuine integration tests —
 * real SQL execution against the actual committed migrations, not hand-rolled
 * mocks of Drizzle's query builder. Test-only: production code always uses
 * createDb() (Neon HTTP) from client.ts, never this.
 *
 * The pglite-backed instance is cast to Db (NeonHttpDatabase's type) at the return
 * boundary — the two drivers expose the same query-building surface our code
 * actually uses (select/insert/update/where/etc.), even though their concrete
 * TypeScript types differ by driver internals we don't touch.
 */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const migrationsDir = migrationsDirPath();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(`${migrationsDir}/${file}`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) {
        await client.exec(trimmed);
      }
    }
  }

  return db as unknown as Db;
}

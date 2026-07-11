import { defineConfig } from 'drizzle-kit';

// DATABASE_URL is only required for commands that connect to a live DB (migrate,
// studio) — `generate` just diffs schema against committed migration files and
// works fine without it.
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});

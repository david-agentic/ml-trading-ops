import { defineConfig } from 'vitest/config';

// TEMPORARY: this should be @cloudflare/vitest-pool-workers (real workerd runtime),
// not plain Node. wrangler's bundled workerd binary (~100MB) has repeatedly failed
// to download on this network (consistent timeout on @cloudflare/workerd-windows-64
// across 5 retries). Falling back to plain Node here so development isn't fully
// blocked; the Argon2id CPU-spike test result measured under this config is a
// Node-based proxy, not a true Workers CPU-time measurement — see
// phase-01-report.md and the note on this in the spike test itself. Swap back once
// wrangler installs successfully (see TODO in apps/api/package.json history / ask
// the owner about network/proxy conditions if this keeps failing).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // PGlite (in-memory WASM Postgres, used by integration tests in routes/*.test.ts)
    // has a real cold-start cost — WASM init + running all committed migrations —
    // which can exceed Vitest's 5s default when multiple test files spin up their
    // own instance in parallel. 20s gives real headroom without masking genuine hangs.
    testTimeout: 20000,
  },
});

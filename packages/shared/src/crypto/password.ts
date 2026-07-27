import { argon2id, argon2Verify } from 'hash-wasm';

/**
 * SECURITY-TODO: Argon2id parameters tuned for Workers Free 10ms budget — revisit
 * before real production traffic (upgrading to the $5/mo Workers Paid plan, 50ms
 * budget, would let these go back up with no code change needed). See
 * phase-01-report.md.
 *
 * Lowered a second time (1024 KiB/2 iters -> 256 KiB/1 iter) after the earlier,
 * still-provisional Node-measured values (see password.test.ts) turned out to be
 * a live production incident, not just a theoretical risk: POST /auth/login was
 * 500ing in production specifically (not /refresh or /me, which don't call
 * verifyPassword) - consistent with Cloudflare force-killing the request for
 * exceeding the Free plan's CPU cap, which a JS try/catch cannot intercept. The
 * old params had already measured 6-14ms idle and 34-63ms under load in Node
 * proxy testing this session - i.e. sometimes over budget even in the "idle"
 * case. This is a real, deliberate security-margin reduction (already below
 * OWASP's usual Argon2id recommendation before this change), not a routine
 * tuning tweak - owner-approved.
 *
 * Lives in packages/shared (not apps/api) so packages/db's seed script can hash the
 * Super Admin's temp password without apps/api depending on packages/db depending
 * on apps/api (a cycle) — packages/shared has no dependency on either.
 */
const ARGON2_MEMORY_SIZE_KIB = 256;
const ARGON2_ITERATIONS = 1;
const ARGON2_PARALLELISM = 1;
const ARGON2_HASH_LENGTH = 32;
const SALT_LENGTH_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(salt);

  return argon2id({
    password,
    salt,
    memorySize: ARGON2_MEMORY_SIZE_KIB,
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: 'encoded',
  });
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  return argon2Verify({ password, hash: encodedHash });
}

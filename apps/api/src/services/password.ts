import { argon2id, argon2Verify } from 'hash-wasm';

/**
 * SECURITY-TODO: Argon2id parameters tuned for Workers Free 10ms budget — revisit
 * before real production traffic. See phase-01-report.md.
 *
 * Chosen from a provisional Node measurement (~3.7ms; see password.test.ts) since
 * wrangler's workerd binary failed to install on this network (see
 * apps/api/vitest.config.ts) — the true Workers CPU-ms figure is still unmeasured
 * and must be re-verified at first live deploy (Task #12) before this is final.
 */
const ARGON2_MEMORY_SIZE_KIB = 1024;
const ARGON2_ITERATIONS = 2;
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

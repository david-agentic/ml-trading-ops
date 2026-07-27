import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correcthorse1');
    expect(await verifyPassword('correcthorse1', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correcthorse1');
    expect(await verifyPassword('wrongpassword1', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword('correcthorse1'),
      hashPassword('correcthorse1'),
    ]);
    expect(hashA).not.toBe(hashB);
  });

  it(
    'CPU-budget spike: measures real hashing cost — currently under plain Node, ' +
      'NOT the true Workers/workerd runtime (wrangler failed to install on this ' +
      'network, see apps/api/vitest.config.ts note); treat this as a provisional ' +
      'proxy figure only, to be re-measured on real Workers infra before real ' +
      'production traffic',
    async () => {
      const start = performance.now();
      await hashPassword('correcthorse1');
      const durationMs = performance.now() - start;

      // eslint-disable-next-line no-console
      console.log(`[Argon2id CPU spike, Node proxy measurement] hashPassword took ${durationMs.toFixed(2)}ms`);

      // Free plan cap is 10ms CPU/request for the whole request (hashing + JWT +
      // Zod + DB round-trip), not just hashing. Params were lowered again
      // (see password.ts) after the old ones caused a real production 500 on
      // POST /auth/login, consistent with a CPU-limit kill. Threshold tightened
      // to match the actual 10ms constraint being guarded against, with a little
      // headroom for the rest of the request (JWT + DB) - still a Node-measured
      // regression guard, not the real gate (real gate is workerd re-measurement
      // before production traffic).
      expect(durationMs).toBeLessThan(8);
    },
  );
});

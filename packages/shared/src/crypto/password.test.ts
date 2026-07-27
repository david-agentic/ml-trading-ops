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

  it('rejects a malformed or legacy-format hash instead of throwing', async () => {
    expect(await verifyPassword('correcthorse1', 'not-a-real-hash')).toBe(false);
    // Old Argon2id-format hashes (from before the PBKDF2 switch) must fail
    // closed, not crash - they no longer match ALGORITHM_ID.
    expect(await verifyPassword('correcthorse1', '$argon2id$v=19$m=256,t=1,p=1$c2FsdA$aGFzaA')).toBe(false);
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
      console.log(`[PBKDF2 CPU spike, Node proxy measurement] hashPassword took ${durationMs.toFixed(2)}ms`);

      // Free plan cap is 10ms CPU/request for the whole request (hashing + JWT +
      // Zod + DB round-trip), not just hashing. ITERATIONS in password.ts (3,000)
      // was chosen well under OWASP's 600,000 recommendation specifically to fit
      // this budget - a real, deliberate security reduction, owner-approved after
      // confirming 600,000 iterations costs ~780ms (see password.ts's comment).
      // Threshold here leaves headroom for the rest of the request - still a
      // Node-measured regression guard, not the real gate (real gate is workerd
      // re-measurement before production traffic).
      expect(durationMs).toBeLessThan(8);
    },
  );
});

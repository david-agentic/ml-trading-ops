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
      'network, see vitest.config.ts note); treat this as a provisional proxy ' +
      'figure only, to be re-measured on real Workers infra at first deploy ' +
      '(Task #12) before phase-01-report.md is finalized',
    async () => {
      const start = performance.now();
      await hashPassword('correcthorse1');
      const durationMs = performance.now() - start;

      // eslint-disable-next-line no-console
      console.log(`[Argon2id CPU spike, Node proxy measurement] hashPassword took ${durationMs.toFixed(2)}ms`);

      // Free plan cap is 10ms CPU/request for the whole request (hashing + JWT +
      // Zod + DB round-trip), not just hashing. Threshold kept loose here (Node,
      // not workerd) — this is a regression guard, not the real gate. The real
      // gate is the workerd re-measurement at first deploy (Task #12).
      expect(durationMs).toBeLessThan(15);
    },
  );
});

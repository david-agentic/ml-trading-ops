import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, hashToken } from './token';

describe('hashToken', () => {
  it('is deterministic for the same input', async () => {
    expect(await hashToken('abc')).toBe(await hashToken('abc'));
  });

  it('differs for different inputs', async () => {
    expect(await hashToken('abc')).not.toBe(await hashToken('abd'));
  });
});

describe('generateOpaqueToken', () => {
  it('produces a different token each call', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('produces a hex string of the expected length', () => {
    expect(generateOpaqueToken(32)).toMatch(/^[0-9a-f]{64}$/);
  });
});

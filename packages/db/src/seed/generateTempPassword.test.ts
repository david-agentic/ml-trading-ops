import { passwordSchema } from '@ml-trading-ops/shared';
import { describe, expect, it } from 'vitest';
import { generateTempPassword } from './generateTempPassword';

describe('generateTempPassword', () => {
  it('always satisfies passwordSchema', () => {
    for (let i = 0; i < 50; i++) {
      expect(passwordSchema.safeParse(generateTempPassword()).success).toBe(true);
    }
  });

  it('produces a different password each call', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});

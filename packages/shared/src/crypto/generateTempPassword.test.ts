import { describe, expect, it } from 'vitest';
import { passwordSchema } from '../validators/auth';
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

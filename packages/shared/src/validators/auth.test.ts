import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema } from './auth';

describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('correcthorse1').success).toBe(true);
  });

  it('rejects passwords shorter than 10 characters', () => {
    expect(passwordSchema.safeParse('short1').success).toBe(false);
  });

  it('rejects passwords with no digit', () => {
    expect(passwordSchema.safeParse('nodigitshere').success).toBe(false);
  });

  it('rejects passwords with no letter', () => {
    expect(passwordSchema.safeParse('12345678901').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });
});

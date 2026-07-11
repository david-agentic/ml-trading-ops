import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  TokenExpiredError,
  TokenInvalidError,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt';

const SECRET = 'test-secret-do-not-use-in-production';

describe('access tokens', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'super_admin' },
      SECRET,
    );
    const payload = await verifyAccessToken(token, SECRET);
    expect(payload).toEqual({ sub: 'user-1', email: 'a@b.com', role: 'super_admin' });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'super_admin' },
      SECRET,
    );
    await expect(verifyAccessToken(token, 'a-different-secret')).rejects.toThrow(
      TokenInvalidError,
    );
  });

  it('rejects an expired token', async () => {
    const expired = await new SignJWT({ email: 'a@b.com', role: 'super_admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(SECRET));

    await expect(verifyAccessToken(expired, SECRET)).rejects.toThrow(TokenExpiredError);
  });
});

describe('refresh tokens', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signRefreshToken({ sub: 'user-1' }, SECRET);
    const payload = await verifyRefreshToken(token, SECRET);
    expect(payload.sub).toBe('user-1');
  });
});

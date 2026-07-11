import { SignJWT, jwtVerify, errors } from 'jose';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
}

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(toKey(secret));
}

export async function signRefreshToken(
  payload: RefreshTokenPayload,
  secret: string,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(toKey(secret));
}

export class TokenExpiredError extends Error {}
export class TokenInvalidError extends Error {}

async function verify<T>(token: string, secret: string): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret));
    return payload as T;
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      throw new TokenExpiredError('Token has expired');
    }
    throw new TokenInvalidError('Token is invalid');
  }
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload & { sub: string }> {
  const payload = await verify<{ sub: string; email: string; role: string }>(token, secret);
  return { sub: payload.sub, email: payload.email, role: payload.role };
}

export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<RefreshTokenPayload & { sub: string }> {
  const payload = await verify<{ sub: string }>(token, secret);
  return { sub: payload.sub };
}

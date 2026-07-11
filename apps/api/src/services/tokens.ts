import type { createDb } from '@ml-trading-ops/db';
import { refreshTokens } from '@ml-trading-ops/db';
import { hashToken } from '@ml-trading-ops/shared';
import { signAccessToken, signRefreshToken } from './jwt';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssueTokenPairParams {
  userId: string;
  email: string;
  role: string;
  jwtSigningKey: string;
  jwtRefreshKey: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function issueTokenPair(db: ReturnType<typeof createDb>, params: IssueTokenPairParams) {
  const accessToken = await signAccessToken(
    { sub: params.userId, email: params.email, role: params.role },
    params.jwtSigningKey,
  );
  const refreshToken = await signRefreshToken({ sub: params.userId }, params.jwtRefreshKey);
  const tokenHash = await hashToken(refreshToken);

  await db.insert(refreshTokens).values({
    userId: params.userId,
    tokenHash,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
}

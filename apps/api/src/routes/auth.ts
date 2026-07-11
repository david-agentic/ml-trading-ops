import {
  loginHistory,
  passwordResetTokens,
  refreshTokens,
  roles,
  users,
  writeAuditLog,
} from '@ml-trading-ops/db';
import {
  changePasswordSchema,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  loginSchema,
  logoutSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshSchema,
  verifyPassword,
} from '@ml-trading-ops/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { errorResponse } from '../lib/errors';
import { authMiddleware } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimit';
import { verifyRefreshToken } from '../services/jwt';
import { issueTokenPair } from '../services/tokens';
import type { AppEnv } from '../types';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export const authRoutes = new Hono<AppEnv>();

function requestMeta(c: { req: { header: (name: string) => string | undefined } }) {
  return {
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  };
}

authRoutes.post('/login', loginRateLimiter, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const db = c.get('db');
  const { ip, userAgent } = requestMeta(c);

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const recordFailure = async (reason: string) => {
    await db.insert(loginHistory).values({
      userId: row?.id ?? null,
      attemptedEmail: normalizedEmail,
      success: false,
      ipAddress: ip,
      userAgent,
    });
    await writeAuditLog(db, {
      actorUserId: row?.id ?? null,
      actorRole: row?.roleKey ?? null,
      actorEmail: normalizedEmail,
      action: 'login',
      resourceType: 'auth',
      reason,
      ipAddress: ip,
      userAgent,
      relatedModule: 'system',
    });
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid email or password');
  };

  if (!row) {
    return recordFailure('No account with this email');
  }
  if (row.deletedAt) {
    return recordFailure('Account deleted');
  }
  if (!row.isActive) {
    return recordFailure('Account inactive');
  }

  const passwordOk = await verifyPassword(password, row.passwordHash);
  if (!passwordOk) {
    return recordFailure('Incorrect password');
  }

  const tokens = await issueTokenPair(db, {
    userId: row.id,
    email: row.email,
    role: row.roleKey,
    jwtSigningKey: c.env.JWT_SIGNING_KEY,
    jwtRefreshKey: c.env.JWT_REFRESH_KEY,
    ipAddress: ip,
    userAgent,
  });

  await db.insert(loginHistory).values({
    userId: row.id,
    attemptedEmail: normalizedEmail,
    success: true,
    ipAddress: ip,
    userAgent,
  });
  await writeAuditLog(db, {
    actorUserId: row.id,
    actorRole: row.roleKey,
    actorEmail: row.email,
    action: 'login',
    resourceType: 'auth',
    relatedModule: 'system',
    ipAddress: ip,
    userAgent,
  });

  return c.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: { id: row.id, email: row.email, name: row.name, role: row.roleKey },
  });
});

authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const db = c.get('db');

  let payload;
  try {
    payload = await verifyRefreshToken(parsed.data.refreshToken, c.env.JWT_REFRESH_KEY);
  } catch {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid refresh token');
  }

  const tokenHash = await hashToken(parsed.data.refreshToken);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Invalid refresh token');
  }

  const [userRow] = await db
    .select({
      id: users.id,
      email: users.email,
      roleKey: roles.key,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, stored.userId))
    .limit(1);

  if (!userRow || userRow.deletedAt || !userRow.isActive) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Account no longer active');
  }

  // Rotate: revoke the old refresh token, issue a new pair.
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));

  const { ip, userAgent } = requestMeta(c);
  const tokens = await issueTokenPair(db, {
    userId: userRow.id,
    email: userRow.email,
    role: userRow.roleKey,
    jwtSigningKey: c.env.JWT_SIGNING_KEY,
    jwtRefreshKey: c.env.JWT_REFRESH_KEY,
    ipAddress: ip,
    userAgent,
  });

  return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

authRoutes.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const db = c.get('db');
  const tokenHash = await hashToken(parsed.data.refreshToken);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (stored && !stored.revokedAt) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    const { ip, userAgent } = requestMeta(c);
    await writeAuditLog(db, {
      actorUserId: stored.userId,
      actorRole: null,
      actorEmail: null,
      action: 'logout',
      resourceType: 'auth',
      relatedModule: 'system',
      ipAddress: ip,
      userAgent,
    });
  }

  // Always return success — don't leak whether the token was valid or already revoked.
  return c.json({ success: true });
});

authRoutes.post('/password-reset-request', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const db = c.get('db');

  const [row] = await db
    .select({ id: users.id, isActive: users.isActive, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (row && !row.deletedAt && row.isActive) {
    const rawToken = generateOpaqueToken();
    const tokenHash = await hashToken(rawToken);
    await db.insert(passwordResetTokens).values({
      userId: row.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const appUrl = c.env.APP_URL ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;
    // Resend isn't wired until Stage G (Task #24) — console log stands in for now.
    // eslint-disable-next-line no-console
    console.log(`[password reset] ${normalizedEmail}: ${resetLink}`);

    const { ip, userAgent } = requestMeta(c);
    await writeAuditLog(db, {
      actorUserId: row.id,
      actorRole: null,
      actorEmail: normalizedEmail,
      action: 'create',
      resourceType: 'auth',
      relatedModule: 'system',
      ipAddress: ip,
      userAgent,
    });
  }

  // Always the same response, found or not — don't leak whether the email exists.
  return c.json({ message: 'If that email exists, a reset link has been sent.' });
});

authRoutes.post('/password-reset-confirm', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const db = c.get('db');
  const tokenHash = await hashToken(parsed.data.token);
  const [stored] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid or expired reset link');
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, stored.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, stored.id));
  // Force re-login everywhere — a password reset should invalidate existing sessions.
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, stored.userId));

  const { ip, userAgent } = requestMeta(c);
  await writeAuditLog(db, {
    actorUserId: stored.userId,
    actorRole: null,
    actorEmail: null,
    action: 'update',
    resourceType: 'auth',
    resourceId: stored.userId,
    reason: 'Password reset via emailed link',
    relatedModule: 'system',
    ipAddress: ip,
    userAgent,
  });

  return c.json({ success: true });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const authedUser = c.get('user');
  const db = c.get('db');

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, authedUser.sub))
    .limit(1);

  if (!row) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  return c.json({ id: row.id, email: row.email, name: row.name, role: row.roleKey, isActive: row.isActive });
});

// Not in CLAUDE.md's literal Phase 1 endpoint list, but required to satisfy the
// Phase 1 brief's own "My Profile: change password" deliverable and the owner's
// explicit success gate ("I can change my password") — a necessary implementation
// detail of an already-required feature, not a new business rule.
authRoutes.post('/change-password', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const authedUser = c.get('user');
  const db = c.get('db');

  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, authedUser.sub))
    .limit(1);

  if (!row) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  const currentOk = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
  if (!currentOk) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Current password is incorrect');
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, row.id));

  const { ip, userAgent } = requestMeta(c);
  await writeAuditLog(db, {
    actorUserId: authedUser.sub,
    actorRole: authedUser.role,
    actorEmail: authedUser.email,
    action: 'update',
    resourceType: 'auth',
    resourceId: authedUser.sub,
    reason: 'Self-service password change',
    relatedModule: 'system',
    ipAddress: ip,
    userAgent,
  });

  return c.json({ success: true });
});

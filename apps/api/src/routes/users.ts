import { roles, users, writeAuditLog } from '@ml-trading-ops/db';
import { createUserSchema, generateTempPassword, hashPassword, updateUserSchema } from '@ml-trading-ops/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { errorResponse } from '../lib/errors';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import type { AppEnv } from '../types';

export const userRoutes = new Hono<AppEnv>();

userRoutes.use('*', authMiddleware);

function requestMeta(c: { req: { header: (name: string) => string | undefined } }) {
  return {
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  };
}

const userListSelection = {
  id: users.id,
  email: users.email,
  name: users.name,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  roleKey: roles.key,
};

userRoutes.get('/', requirePermission('user', 'read'), async (c) => {
  const db = c.get('db');
  const rows = await db
    .select(userListSelection)
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(isNull(users.deletedAt));

  return c.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.roleKey,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

userRoutes.get('/:id', requirePermission('user', 'read'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!id) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  const [row] = await db
    .select(userListSelection)
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  if (!row) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  return c.json({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.roleKey,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

userRoutes.post('/', requirePermission('user', 'create'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const db = c.get('db');
  const normalizedEmail = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing) {
    return errorResponse(c, 409, 'CONFLICT', 'A user with this email already exists');
  }

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, parsed.data.role)).limit(1);
  if (!role) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Unknown role');
  }

  // Admin sets an initial password directly, or one is generated and returned once
  // (mirrors packages/db's seed script) — Resend isn't wired until Stage G, so an
  // email-invite flow isn't available yet in Phase 1.
  const tempPassword = parsed.data.password ?? generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [created] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name: parsed.data.name,
      passwordHash,
      roleId: role.id,
    })
    .returning({ id: users.id, createdAt: users.createdAt, updatedAt: users.updatedAt });
  if (!created) {
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Failed to create user');
  }

  const authedUser = c.get('user');
  const { ip, userAgent } = requestMeta(c);
  await writeAuditLog(db, {
    actorUserId: authedUser.sub,
    actorRole: authedUser.role,
    actorEmail: authedUser.email,
    action: 'create',
    resourceType: 'user',
    resourceId: created.id,
    newValue: { email: normalizedEmail, name: parsed.data.name, role: parsed.data.role },
    relatedModule: 'admin',
    ipAddress: ip,
    userAgent,
  });

  return c.json(
    {
      id: created.id,
      email: normalizedEmail,
      name: parsed.data.name,
      role: parsed.data.role,
      isActive: true,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      // Only present when the caller didn't supply a password — shown once.
      tempPassword: parsed.data.password ? undefined : tempPassword,
    },
    201,
  );
});

userRoutes.patch('/:id', requirePermission('user', 'update'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
  }

  const db = c.get('db');
  const id = c.req.param('id');
  if (!id) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  const [existing] = await db
    .select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive, roleId: users.roleId })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  if (!existing) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  const updates: Partial<{ name: string; roleId: string; isActive: boolean; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
    oldValue.name = existing.name;
    newValue.name = parsed.data.name;
    updates.name = parsed.data.name;
  }
  if (parsed.data.isActive !== undefined && parsed.data.isActive !== existing.isActive) {
    oldValue.isActive = existing.isActive;
    newValue.isActive = parsed.data.isActive;
    updates.isActive = parsed.data.isActive;
  }
  let newRoleKey: string | undefined;
  if (parsed.data.role !== undefined) {
    const [role] = await db.select({ id: roles.id, key: roles.key }).from(roles).where(eq(roles.key, parsed.data.role)).limit(1);
    if (!role) {
      return errorResponse(c, 400, 'VALIDATION_ERROR', 'Unknown role');
    }
    if (role.id !== existing.roleId) {
      oldValue.role = existing.roleId;
      newValue.role = parsed.data.role;
      updates.roleId = role.id;
      newRoleKey = role.key;
    }
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, name: users.name, isActive: users.isActive, roleId: users.roleId, updatedAt: users.updatedAt, createdAt: users.createdAt });
  if (!updated) {
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Failed to update user');
  }

  if (Object.keys(newValue).length > 0) {
    const authedUser = c.get('user');
    const { ip, userAgent } = requestMeta(c);
    await writeAuditLog(db, {
      actorUserId: authedUser.sub,
      actorRole: authedUser.role,
      actorEmail: authedUser.email,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      oldValue,
      newValue,
      relatedModule: 'admin',
      ipAddress: ip,
      userAgent,
    });
  }

  const [roleRow] = newRoleKey
    ? [{ key: newRoleKey }]
    : await db.select({ key: roles.key }).from(roles).where(eq(roles.id, updated.roleId)).limit(1);

  return c.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: roleRow?.key,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

userRoutes.delete('/:id', requirePermission('user', 'delete'), async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const authedUser = c.get('user');
  if (!id) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }

  if (id === authedUser.sub) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'You cannot delete your own account');
  }

  const [existing] = await db
    .select({ id: users.id, roleKey: roles.key })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  if (!existing) {
    return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
  }
  if (existing.roleKey === 'super_admin') {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'The Super Admin account cannot be deleted');
  }

  await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, id));

  const { ip, userAgent } = requestMeta(c);
  await writeAuditLog(db, {
    actorUserId: authedUser.sub,
    actorRole: authedUser.role,
    actorEmail: authedUser.email,
    action: 'delete',
    resourceType: 'user',
    resourceId: id,
    relatedModule: 'admin',
    ipAddress: ip,
    userAgent,
  });

  return c.json({ success: true });
});

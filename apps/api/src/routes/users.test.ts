import { permissions, roles, users } from '@ml-trading-ops/db';
import { createTestDb } from '@ml-trading-ops/db/test';
import { hashPassword, PERMISSION_ACTIONS } from '@ml-trading-ops/shared';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { authMiddleware } from '../middleware/auth';
import { signAccessToken } from '../services/jwt';
import type { AppEnv } from '../types';
import { userRoutes } from './users';

const JWT_SIGNING_KEY = 'test-signing-key';

function createFakeKV() {
  return {
    get: async () => null,
    put: async () => {},
  } as unknown as AppEnv['Bindings']['RATE_LIMIT_KV'];
}

async function seedRoleAndUser(
  db: Awaited<ReturnType<typeof createTestDb>>,
  roleKey: string,
  email: string,
  grantAllUserPermissions: boolean,
) {
  const [role] = await db.insert(roles).values({ key: roleKey, name: roleKey }).returning();
  if (!role) throw new Error('role insert returned no row');

  if (grantAllUserPermissions) {
    for (const action of PERMISSION_ACTIONS) {
      await db.insert(permissions).values({ roleId: role.id, resource: 'user', action });
    }
  }

  const passwordHash = await hashPassword('correcthorse1');
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name: email, roleId: role.id })
    .returning({ id: users.id });
  if (!user) throw new Error('user insert returned no row');

  return { roleId: role.id, userId: user.id };
}

async function createTestApp() {
  const db = await createTestDb();

  const superAdmin = await seedRoleAndUser(db, 'super_admin', 'admin@example.com', true);
  const reseller = await seedRoleAndUser(db, 'reseller', 'reseller@example.com', false);

  // A second Super Admin, sharing the already-seeded super_admin role — used to
  // test that Super-Admin protection applies to any account holding that role, not
  // just to self-deletion.
  const secondSuperAdminHash = await hashPassword('correcthorse1');
  const [secondSuperAdmin] = await db
    .insert(users)
    .values({
      email: 'admin2@example.com',
      passwordHash: secondSuperAdminHash,
      name: 'Second Admin',
      roleId: superAdmin.roleId,
    })
    .returning({ id: users.id });
  if (!secondSuperAdmin) throw new Error('second super admin insert returned no row');

  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });
  app.use('*', authMiddleware);
  app.route('/users', userRoutes);

  const superAdminToken = await signAccessToken(
    { sub: superAdmin.userId, email: 'admin@example.com', role: 'super_admin' },
    JWT_SIGNING_KEY,
  );
  const resellerToken = await signAccessToken(
    { sub: reseller.userId, email: 'reseller@example.com', role: 'reseller' },
    JWT_SIGNING_KEY,
  );

  return {
    app,
    env: { JWT_SIGNING_KEY, RATE_LIMIT_KV: createFakeKV() },
    superAdminToken,
    resellerToken,
    superAdminId: superAdmin.userId,
    resellerId: reseller.userId,
    secondSuperAdminId: secondSuperAdmin.id,
  };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

describe('GET /users', () => {
  it('a role with no user permissions is forbidden', async () => {
    const { app, env, resellerToken } = await createTestApp();
    const res = await app.request('/users', { headers: authHeaders(resellerToken) }, env);
    expect(res.status).toBe(403);
  });

  it('Super Admin (granted user:read) can list users', async () => {
    const { app, env, superAdminToken } = await createTestApp();
    const res = await app.request('/users', { headers: authHeaders(superAdminToken) }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: unknown[] };
    expect(body.users).toHaveLength(3);
  });
});

describe('POST /users', () => {
  it('creates a user and returns a generated temp password when none is supplied', async () => {
    const { app, env, superAdminToken } = await createTestApp();
    const res = await app.request(
      '/users',
      {
        method: 'POST',
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({ email: 'new@example.com', name: 'New User', role: 'reseller' }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { email: string; tempPassword?: string };
    expect(body.email).toBe('new@example.com');
    expect(body.tempPassword).toBeTypeOf('string');
  });

  it('rejects a duplicate email with 409', async () => {
    const { app, env, superAdminToken } = await createTestApp();
    const res = await app.request(
      '/users',
      {
        method: 'POST',
        headers: authHeaders(superAdminToken),
        body: JSON.stringify({ email: 'admin@example.com', name: 'Dup', role: 'reseller' }),
      },
      env,
    );
    expect(res.status).toBe(409);
  });
});

describe('DELETE /users/:id', () => {
  it('cannot delete your own account', async () => {
    const { app, env, superAdminToken, superAdminId } = await createTestApp();
    const res = await app.request(
      `/users/${superAdminId}`,
      { method: 'DELETE', headers: authHeaders(superAdminToken) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('cannot delete a Super Admin account even when the actor is a different user', async () => {
    const { app, env, superAdminToken, secondSuperAdminId } = await createTestApp();
    const res = await app.request(
      `/users/${secondSuperAdminId}`,
      { method: 'DELETE', headers: authHeaders(superAdminToken) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('soft-deletes a non-Super-Admin user', async () => {
    const { app, env, superAdminToken, resellerId } = await createTestApp();
    const res = await app.request(
      `/users/${resellerId}`,
      { method: 'DELETE', headers: authHeaders(superAdminToken) },
      env,
    );
    expect(res.status).toBe(200);

    const listRes = await app.request('/users', { headers: authHeaders(superAdminToken) }, env);
    const body = (await listRes.json()) as { users: { id: string }[] };
    expect(body.users.find((u) => u.id === resellerId)).toBeUndefined();
  });
});

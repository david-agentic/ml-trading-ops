import {
  generateTempPassword,
  hashPassword,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  ROLE_LABELS,
  ROLES,
} from '@ml-trading-ops/shared';
import { eq } from 'drizzle-orm';
import { createDb } from '../client';
import { permissions, roles, users } from '../schema';
import { buildAuditLogInsert } from '../audit';

const SUPER_ADMIN_EMAIL = 'daoodtaxexpertllc@gmail.com';
const SUPER_ADMIN_NAME = 'Muhammad Daood';

/**
 * Must match packages/shared/src/crypto/password.ts's hash format prefix.
 * Password hashing switched twice this phase: Argon2id (hash-wasm, then
 * @rabbit-company/argon2id) turned out to be fundamentally incompatible with
 * Cloudflare Workers (dynamic WASM compilation is disallowed at request time
 * - confirmed live, this was the actual cause of a production 500 on
 * POST /auth/login), so password.ts now hashes with PBKDF2-HMAC-SHA256
 * instead. Every prior hash format is a different, incompatible encoding -
 * seedSuperAdmin used to unconditionally skip if the user already existed,
 * which would have left the Super Admin stuck on a hash verifyPassword can
 * no longer read at all. This detects any non-current format and re-hashes.
 */
const CURRENT_HASH_PREFIX = 'pbkdf2-sha256$';

function isCurrentHashFormat(encodedHash: string): boolean {
  return encodedHash.startsWith(CURRENT_HASH_PREFIX);
}

async function seedRoles(db: ReturnType<typeof createDb>) {
  const roleIdByKey = new Map<string, string>();

  for (const key of ROLES) {
    const [row] = await db
      .insert(roles)
      .values({ key, name: ROLE_LABELS[key] })
      .onConflictDoUpdate({ target: roles.key, set: { name: ROLE_LABELS[key] } })
      .returning({ id: roles.id });
    if (!row) {
      throw new Error(`Upserting role "${key}" returned no row — this should be impossible.`);
    }
    roleIdByKey.set(key, row.id);
  }

  return roleIdByKey;
}

/**
 * Super Admin gets every (resource, action) pair Phase 1 defines. Every other role
 * gets none for now — Phase 1's user management endpoints are Super Admin only
 * (CLAUDE.md's Phase 1 brief), so seeding permissions for other roles here would be
 * inventing scope beyond what's specified.
 */
async function seedPermissions(db: ReturnType<typeof createDb>, superAdminRoleId: string) {
  for (const resource of PERMISSION_RESOURCES) {
    for (const action of PERMISSION_ACTIONS) {
      await db
        .insert(permissions)
        .values({ roleId: superAdminRoleId, resource, action })
        .onConflictDoNothing();
    }
  }
}

async function seedSuperAdmin(db: ReturnType<typeof createDb>, superAdminRoleId: string) {
  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, SUPER_ADMIN_EMAIL))
    .limit(1);

  if (row) {
    if (isCurrentHashFormat(row.passwordHash)) {
      // eslint-disable-next-line no-console
      console.log(`Super Admin (${SUPER_ADMIN_EMAIL}) already exists — skipped, no password reset.`);
      return;
    }

    // Existing hash predates the PBKDF2 switch (or an earlier Argon2id
    // parameter change) - regenerate with a fresh temp password so it's
    // re-hashed in the current format. The previous temp password stops
    // working; this mirrors first-creation UX (console-logged once, "change
    // on first login") since nobody has successfully logged in with it yet.
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.id));
    await buildAuditLogInsert(db, {
      actorUserId: null,
      actorRole: null,
      actorEmail: null,
      action: 'update',
      resourceType: 'user',
      resourceId: row.id,
      reason: 'Password re-hashed after switching to PBKDF2 (Argon2id was incompatible with Workers)',
      relatedModule: 'system',
    });

    // eslint-disable-next-line no-console
    console.log('='.repeat(60));
    // eslint-disable-next-line no-console
    console.log('Super Admin password re-hashed (hashing algorithm updated):');
    // eslint-disable-next-line no-console
    console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
    // eslint-disable-next-line no-console
    console.log(`  Password: ${tempPassword}`);
    // eslint-disable-next-line no-console
    console.log('  The previous temp password no longer works. Change this on first login.');
    // eslint-disable-next-line no-console
    console.log('='.repeat(60));
    return;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Not batched with the audit-log write: the audit entry's resourceId depends on
  // this insert's server-generated id, so the two statements can't be sent together
  // via db.batch() (see packages/db/src/audit.ts). Acceptable here since this is a
  // one-time bootstrap script, not a request-path endpoint — Task #15's real
  // user-create API should generate the user id client-side (crypto.randomUUID())
  // if it wants true batched atomicity with its audit-log write.
  const [createdUser] = await db
    .insert(users)
    .values({
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: SUPER_ADMIN_NAME,
      roleId: superAdminRoleId,
    })
    .returning({ id: users.id });

  if (!createdUser) {
    throw new Error('Creating the Super Admin user returned no row — this should be impossible.');
  }

  await buildAuditLogInsert(db, {
    actorUserId: null,
    actorRole: null,
    actorEmail: null,
    action: 'create',
    resourceType: 'user',
    resourceId: createdUser.id,
    newValue: { email: SUPER_ADMIN_EMAIL, name: SUPER_ADMIN_NAME, role: 'super_admin' },
    relatedModule: 'system',
  });

  // eslint-disable-next-line no-console
  console.log('='.repeat(60));
  // eslint-disable-next-line no-console
  console.log('Super Admin created:');
  // eslint-disable-next-line no-console
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  // eslint-disable-next-line no-console
  console.log(`  Password: ${tempPassword}`);
  // eslint-disable-next-line no-console
  console.log('  Change this password on first login. It will not be shown again.');
  // eslint-disable-next-line no-console
  console.log('='.repeat(60));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the seed script.');
  }

  const db = createDb(databaseUrl);

  const roleIdByKey = await seedRoles(db);
  const superAdminRoleId = roleIdByKey.get('super_admin');
  if (!superAdminRoleId) {
    throw new Error('super_admin role was not seeded — this should be impossible.');
  }

  await seedPermissions(db, superAdminRoleId);
  await seedSuperAdmin(db, superAdminRoleId);

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});

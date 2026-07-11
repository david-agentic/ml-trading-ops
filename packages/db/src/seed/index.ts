import { hashPassword, PERMISSION_ACTIONS, PERMISSION_RESOURCES, ROLE_LABELS, ROLES } from '@ml-trading-ops/shared';
import { eq } from 'drizzle-orm';
import { createDb } from '../client';
import { permissions, roles, users } from '../schema';
import { buildAuditLogInsert } from '../audit';
import { generateTempPassword } from './generateTempPassword';

const SUPER_ADMIN_EMAIL = 'daoodtaxexpertllc@gmail.com';
const SUPER_ADMIN_NAME = 'Muhammad Daood';

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
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SUPER_ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`Super Admin (${SUPER_ADMIN_EMAIL}) already exists — skipped, no password reset.`);
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

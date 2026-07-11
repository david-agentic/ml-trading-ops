import { createDb, permissions as permissionsTable, roles, userPermissions } from '@ml-trading-ops/db';
import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { resolvePermission } from '../services/permissions';
import type { AppEnv } from '../types';

/** Must run after authMiddleware — reads the user set on context by it. */
export function requirePermission(resource: string, action: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    const db = createDb(c.env.DATABASE_URL);

    const [rolePerms, overrides] = await Promise.all([
      db
        .select({ resource: permissionsTable.resource, action: permissionsTable.action })
        .from(permissionsTable)
        .innerJoin(roles, eq(roles.id, permissionsTable.roleId))
        .where(eq(roles.key, user.role)),
      db
        .select({
          resource: userPermissions.resource,
          action: userPermissions.action,
          granted: userPermissions.granted,
        })
        .from(userPermissions)
        .where(eq(userPermissions.userId, user.sub)),
    ]);

    const allowed = resolvePermission(rolePerms, overrides, resource, action);
    if (!allowed) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    await next();
  };
}

import { permissions as permissionsTable, roles, userPermissions } from '@ml-trading-ops/db';
import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { resolvePermission } from '../services/permissions';
import type { AppEnv } from '../types';

/** Must run after both dbMiddleware and authMiddleware — reads the db/user set on
 * context by them. */
export function requirePermission(resource: string, action: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    const db = c.get('db');

    const rolePerms = await db
      .select({ resource: permissionsTable.resource, action: permissionsTable.action })
      .from(permissionsTable)
      .innerJoin(roles, eq(roles.id, permissionsTable.roleId))
      .where(eq(roles.key, user.role));
    const overrides = await db
      .select({
        resource: userPermissions.resource,
        action: userPermissions.action,
        granted: userPermissions.granted,
      })
      .from(userPermissions)
      .where(eq(userPermissions.userId, user.sub));

    const allowed = resolvePermission(rolePerms, overrides, resource, action);
    if (!allowed) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    await next();
  };
}

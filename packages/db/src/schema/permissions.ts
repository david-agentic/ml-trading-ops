import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { roles } from './roles';

/**
 * A role's default permission set: rows of (role, resource, action) that role is
 * allowed to perform. Per-user exceptions live in user_permissions, layered on top.
 * `resource`/`action` are plain text (not Postgres enums) so later phases can add new
 * resources without a migration — see @ml-trading-ops/shared's PermissionResource.
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('permissions_role_resource_action_idx').on(
      table.roleId,
      table.resource,
      table.action,
    ),
    index('permissions_role_id_idx').on(table.roleId),
  ],
);

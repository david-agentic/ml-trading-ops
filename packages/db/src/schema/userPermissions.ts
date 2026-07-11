import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Per-user permission overrides layered on top of the user's role defaults
 * (see permissions.ts). `granted: true` explicitly allows, `granted: false`
 * explicitly denies — both override whatever the role would otherwise say.
 */
export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    granted: boolean('granted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_permissions_user_resource_action_idx').on(
      table.userId,
      table.resource,
      table.action,
    ),
    index('user_permissions_user_id_idx').on(table.userId),
  ],
);

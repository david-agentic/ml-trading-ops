import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Exact fields per CLAUDE.md §13. Append-only — no update/delete path anywhere in the
 * app, so there is deliberately no updatedAt/deletedAt column here (their presence
 * would wrongly imply this table is mutable).
 *
 * actorUserId/actorRole/actorEmail are denormalized (copied at write time, not FKs
 * resolved at read time) so audit entries stay historically accurate even after the
 * acting user's role or email changes later, per CLAUDE.md §13.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid('actor_user_id'),
    actorRole: text('actor_role'),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    reason: text('reason'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    relatedModule: text('related_module').notNull(),
  },
  (table) => [
    index('audit_log_actor_user_id_idx').on(table.actorUserId),
    index('audit_log_resource_idx').on(table.resourceType, table.resourceId),
    index('audit_log_timestamp_idx').on(table.timestamp),
  ],
);

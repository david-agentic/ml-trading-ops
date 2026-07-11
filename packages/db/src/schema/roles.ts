import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/** The 7 fixed roles from CLAUDE.md §5, seeded once and not user-editable. */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(), // e.g. 'super_admin' — matches @ml-trading-ops/shared Role
  name: text('name').notNull(), // display label, e.g. 'Super Admin'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

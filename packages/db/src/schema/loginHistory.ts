import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Every login attempt, success or failure. userId is nullable because a failed
 * attempt against an email with no matching account still needs to be recorded (for
 * rate-limiting visibility and audit) but has no user to attach to; attemptedEmail
 * captures what was typed regardless. CLAUDE.md §14's "last 20 sessions per user" is
 * a query-time limit (ORDER BY createdAt DESC LIMIT 20 WHERE userId = ...), not a
 * retention rule enforced by this table.
 */
export const loginHistory = pgTable(
  'login_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    attemptedEmail: text('attempted_email').notNull(),
    success: boolean('success').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('login_history_user_id_idx').on(table.userId),
    index('login_history_created_at_idx').on(table.createdAt),
  ],
);

import type { AuditAction, AuditModule, AuditResourceType } from '@ml-trading-ops/shared';
import { auditLog } from './schema';
import type { Db } from './client';

export interface AuditLogEntry {
  actorUserId: string | null;
  actorRole: string | null;
  actorEmail: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  relatedModule: AuditModule;
}

/**
 * Builds (but does not execute) the audit-log insert. Use this — not
 * writeAuditLog — when the write must be atomic with another statement (e.g.
 * user-create + audit-log write), composed via db.batch([...]). See
 * packages/db/src/client.ts for why: the Neon HTTP driver doesn't support real
 * interactive transactions.
 */
export function buildAuditLogInsert(db: Db, entry: AuditLogEntry) {
  return db.insert(auditLog).values({
    actorUserId: entry.actorUserId,
    actorRole: entry.actorRole,
    actorEmail: entry.actorEmail,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    reason: entry.reason ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    relatedModule: entry.relatedModule,
  });
}

/** Standalone audit-log write, for actions with no other statement to batch with. */
export async function writeAuditLog(db: Db, entry: AuditLogEntry): Promise<void> {
  await buildAuditLogInsert(db, entry);
}

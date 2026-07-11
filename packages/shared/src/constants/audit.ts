/** Exact enums from CLAUDE.md §13. Audit log is append-only, no delete endpoint. */
export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'state_change',
  'override',
  'print',
  'export',
  'permission_change',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * resource_type is a plain string column in the DB (not a Postgres enum) so later
 * phases can log against new resources (order, payment, shipment, ...) without a
 * migration. Phase 1 only ever writes 'user' and 'auth'.
 */
export const AUDIT_RESOURCE_TYPES = ['user', 'auth'] as const;
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export const AUDIT_MODULES = ['finance', 'shipping', 'admin', 'reseller', 'system'] as const;
export type AuditModule = (typeof AUDIT_MODULES)[number];

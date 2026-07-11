/**
 * RBAC model per CLAUDE.md §5: a role has a default permission set (resource, action)
 * pairs; a user may carry explicit overrides (grant or deny) on top of their role's
 * defaults. Middleware checks `canDo(action, resource)` on every protected endpoint.
 *
 * `resource` is stored as a plain string column in the DB (not a Postgres enum) so
 * later phases can introduce new resources (order, product, payment, ...) without a
 * schema migration. The union below is only the subset Phase 1 code actually needs —
 * extend it as each later phase adds the resource it manages.
 */
export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_RESOURCES = ['user'] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

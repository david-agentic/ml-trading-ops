export interface PermissionPair {
  resource: string;
  action: string;
}

export interface PermissionOverride extends PermissionPair {
  granted: boolean;
}

/**
 * RBAC resolution per CLAUDE.md §5: a user-level override (grant or deny) always
 * wins over the role's default; absent an override, the role's default applies.
 * Pure function — no DB/Workers dependency — so it's directly unit-testable.
 */
export function resolvePermission(
  rolePermissions: PermissionPair[],
  userOverrides: PermissionOverride[],
  resource: string,
  action: string,
): boolean {
  const override = userOverrides.find((o) => o.resource === resource && o.action === action);
  if (override) {
    return override.granted;
  }
  return rolePermissions.some((p) => p.resource === resource && p.action === action);
}

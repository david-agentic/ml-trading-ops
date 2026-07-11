import { describe, expect, it } from 'vitest';
import { resolvePermission } from './permissions';

const rolePermissions = [
  { resource: 'user', action: 'create' },
  { resource: 'user', action: 'read' },
];

describe('resolvePermission', () => {
  it('allows an action the role grants by default', () => {
    expect(resolvePermission(rolePermissions, [], 'user', 'read')).toBe(true);
  });

  it('denies an action the role does not grant', () => {
    expect(resolvePermission(rolePermissions, [], 'user', 'delete')).toBe(false);
  });

  it('an explicit grant override allows an action the role does not have', () => {
    const overrides = [{ resource: 'user', action: 'delete', granted: true }];
    expect(resolvePermission(rolePermissions, overrides, 'user', 'delete')).toBe(true);
  });

  it('an explicit deny override blocks an action the role would otherwise allow', () => {
    const overrides = [{ resource: 'user', action: 'read', granted: false }];
    expect(resolvePermission(rolePermissions, overrides, 'user', 'read')).toBe(false);
  });
});

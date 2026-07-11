/** The 7 fixed roles from CLAUDE.md §5. Not user-extensible. */
export const ROLES = [
  'super_admin',
  'finance_manager',
  'finance_team',
  'shipping_manager',
  'shipping_team',
  'reseller',
  'admin_support',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  finance_manager: 'Finance Manager',
  finance_team: 'Finance Team',
  shipping_manager: 'Shipping Manager',
  shipping_team: 'Shipping Team',
  reseller: 'Reseller',
  admin_support: 'Admin / Support',
};

/** Post-login redirect target per role, per CLAUDE.md Phase 1 brief. */
export const ROLE_HOME_PATH: Record<Role, string> = {
  super_admin: '/admin',
  finance_manager: '/finance',
  finance_team: '/finance',
  shipping_manager: '/shipping',
  shipping_team: '/shipping',
  reseller: '/shop',
  admin_support: '/admin',
};

import { ROLE_LABELS, type Role } from '@ml-trading-ops/shared';
import { LogoutButton } from './LogoutButton';

interface AuthedPlaceholderProps {
  name: string;
  role: Role;
  portalName: string;
}

/**
 * Gate 2 scope: prove login + role-based redirect work. The real dashboard
 * for each portal is built in E9+ — this placeholder is what
 * ROLE_HOME_PATH[role] actually renders in the meantime, not a stand-in
 * route that gets swapped out.
 */
export function AuthedPlaceholder({ name, role, portalName }: AuthedPlaceholderProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-sm text-muted-foreground">{portalName}</p>
      <h1 className="text-xl font-semibold">
        You are logged in as {name}, role {ROLE_LABELS[role]}
      </h1>
      <LogoutButton />
    </div>
  );
}

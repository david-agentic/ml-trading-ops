import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Role } from '@ml-trading-ops/shared';
import { cookies } from 'next/headers';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

/**
 * Server-side only (Server Components / Route Handlers) — reads the
 * httpOnly access_token cookie and calls apps/api's GET /auth/me directly
 * via the Workers Service Binding. Returns null if there's no session or
 * it's no longer valid (expired/revoked/inactive account).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const accessToken = cookies().get('access_token')?.value;
  if (!accessToken) {
    return null;
  }

  const { env } = getCloudflareContext();
  const res = await env.API.fetch('https://internal/auth/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<CurrentUser>;
}

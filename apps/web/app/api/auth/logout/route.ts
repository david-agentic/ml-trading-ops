import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const { env } = getCloudflareContext();
  const refreshToken = cookies().get('refresh_token')?.value;

  if (refreshToken) {
    // Best-effort revoke — logout succeeds client-side regardless (matching
    // apps/api's own "always return success" logout semantics).
    await env.API.fetch('https://internal/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  return res;
}

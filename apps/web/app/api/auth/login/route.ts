import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes — matches apps/api's access token TTL
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches apps/api's refresh token TTL

/**
 * Login gets its own route (rather than going through the generic
 * app/api/[...path] proxy) because it needs to translate apps/api's JSON
 * token response into httpOnly cookies. The browser never sees either
 * token — only { user } comes back in the body. This is a more secure
 * default than the sessionStorage fallback mentioned in the brief, and it's
 * achievable specifically because we already proxy through Next.js Route
 * Handlers for the Service Binding — flagged as an autonomous decision in
 * the Gate 2 report.
 */
export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  const body = await req.text();

  const upstream = await env.API.fetch('https://internal/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  const data = (await upstream.json()) as
    | { accessToken: string; refreshToken: string; user: unknown }
    | { error: { code: string; message: string; details?: unknown } };

  if (!upstream.ok || !('accessToken' in data)) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const res = NextResponse.json({ user: data.user });
  res.cookies.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookies.set('refresh_token', data.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  return res;
}

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Generic proxy: browser calls same-origin /api/*, this forwards to apps/api
 * via the Workers Service Binding (zero CORS in production, per the locked
 * decision in phase-01-plan.md). /api/auth/login and /api/auth/logout get
 * their own route files (E8) that take precedence over this catch-all for
 * those exact paths — Next.js resolves the more specific route first — since
 * they need to set/clear the httpOnly session cookies this proxy only reads.
 */
async function proxy(req: NextRequest, path: string[]) {
  const { env } = getCloudflareContext();
  const targetPath = `/${path.join('/')}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  const accessToken = cookies().get('access_token')?.value;
  if (accessToken) {
    headers['authorization'] = `Bearer ${accessToken}`;
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const upstream = await env.API.fetch(`https://internal${targetPath}${req.nextUrl.search}`, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}

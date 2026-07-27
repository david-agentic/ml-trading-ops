import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { errorResponse } from './lib/errors';
import { dbMiddleware } from './middleware/db';
import { authFloodGuard } from './middleware/nativeRateLimit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

// Without this, any uncaught exception anywhere in the request pipeline
// falls through to Hono's default handler, which returns a plain-text
// "Internal Server Error" body - not JSON, so every client-side caller
// expecting { error: { code, message } } breaks on top of the original
// failure (surfaced as apps/web's generic "Something went wrong" catch-all).
// Rule 4 (CLAUDE.md §18): never leak internals to the client, so the
// message stays generic and err only goes to the server-side console.
app.onError((err, c) => {
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  // TEMPORARY DEBUG: exposing err.message/stack to find the live /auth/login
  // 500 with no other log access. Revert to the generic message immediately
  // once diagnosed - never ship real error details to the client.
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: err.message, stack: err.stack } },
    500,
  );
});

app.use('*', requestId());
app.use('*', logger());
// CORS matters for local dev only (web on :3000, api on :8787 as separate processes).
// Production is same-origin via a Workers Service Binding — see phase-01-plan.md.
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
  }),
);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }),
);

// Native binding (fast, blunt flood guard) runs first; the precise KV-based
// 5/15min login rule (loginRateLimiter, mounted inside authRoutes on POST /login
// specifically) runs second, after dbMiddleware/authRoutes take over.
app.use('/auth/*', authFloodGuard);
app.use('/auth/*', dbMiddleware);
app.route('/auth', authRoutes);

app.use('/users/*', dbMiddleware);
app.route('/users', userRoutes);

export default app;

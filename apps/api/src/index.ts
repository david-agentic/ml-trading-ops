import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { dbMiddleware } from './middleware/db';
import { authFloodGuard } from './middleware/nativeRateLimit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

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

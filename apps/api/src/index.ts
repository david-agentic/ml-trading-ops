import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';

// Populated in Stage D as auth/DB pieces land: DATABASE_URL, JWT_SIGNING_KEY,
// JWT_REFRESH_KEY, RESEND_API_KEY, EMAIL_FROM, rate-limit KV binding, etc.
export type Env = Record<string, never>;

const app = new Hono<{ Bindings: Env }>();

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

export default app;

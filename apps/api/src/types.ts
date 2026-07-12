import type { Db } from '@ml-trading-ops/db';

export interface Bindings {
  DATABASE_URL: string;
  JWT_SIGNING_KEY: string;
  JWT_REFRESH_KEY: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_URL?: string;
  RATE_LIMIT_KV: KVNamespace;
  // Native Cloudflare Rate Limiting binding — fast first-line flood guard on
  // /auth/*, ahead of the precise KV-based 5/15min login rule. See
  // middleware/nativeRateLimit.ts and phase-01-plan.md's deviations section.
  AUTH_RATE_LIMITER: RateLimit;
}

export interface AuthedUser {
  sub: string;
  email: string;
  role: string;
}

export interface Variables {
  user: AuthedUser;
  db: Db;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

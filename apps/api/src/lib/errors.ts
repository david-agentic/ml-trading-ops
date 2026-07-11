import type { ErrorCode } from '@ml-trading-ops/shared';
import type { Context } from 'hono';

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export function errorResponse(
  c: Context,
  status: ErrorStatus,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  return c.json({ error: { code, message, details } }, status);
}

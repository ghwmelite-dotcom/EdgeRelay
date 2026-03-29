import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';

// Rate limiting disabled — Cloudflare's built-in DDoS protection handles abuse.
// Re-enable when platform reaches 1000+ active users.
export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (_c, next) => {
  await next();
};

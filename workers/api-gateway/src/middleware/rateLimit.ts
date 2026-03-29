import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';

const API_RATE_LIMIT = 600; // requests per minute

// Admin accounts exempt from rate limiting
const RATE_LIMIT_EXEMPT_USERS = new Set<string>();

export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const userId = c.get('userId');
  if (!userId) {
    // If no userId is set (unauthenticated route), skip rate limiting
    await next();
    return;
  }

  // Check exempt list (populated on first request)
  if (RATE_LIMIT_EXEMPT_USERS.has(userId)) {
    await next();
    return;
  }

  // Check if user is admin — cache the result
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  if (user?.email === 'oh84dev@gmail.com') {
    RATE_LIMIT_EXEMPT_USERS.add(userId);
    await next();
    return;
  }

  const now = new Date();
  const minuteKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  const key = `api-rate:${userId}:${minuteKey}`;

  const currentStr = await c.env.SESSIONS.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= API_RATE_LIMIT) {
    return c.json(
      {
        data: null,
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Maximum ${API_RATE_LIMIT} requests per minute.`,
        },
      },
      429,
    );
  }

  // Increment counter with 120s TTL (covers the current minute + buffer)
  await c.env.SESSIONS.put(key, String(current + 1), { expirationTtl: 120 });

  c.header('X-RateLimit-Limit', String(API_RATE_LIMIT));
  c.header('X-RateLimit-Remaining', String(API_RATE_LIMIT - current - 1));

  await next();
};

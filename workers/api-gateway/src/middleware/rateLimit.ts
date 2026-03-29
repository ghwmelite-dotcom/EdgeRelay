import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';

const API_RATE_LIMIT = 600; // requests per minute

// Hardcoded exempt emails — no DB lookup needed
const EXEMPT_EMAILS = new Set(['oh84dev@gmail.com']);

// Cache userId → exempt status in memory (survives within a single worker instance)
const exemptUserIds = new Set<string>();

export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const userId = c.get('userId');
  if (!userId) {
    await next();
    return;
  }

  // Fast path: already confirmed exempt
  if (exemptUserIds.has(userId)) {
    await next();
    return;
  }

  // Check DB once, cache forever in this worker instance
  try {
    const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
      .bind(userId)
      .first<{ email: string }>();

    if (user && EXEMPT_EMAILS.has(user.email)) {
      exemptUserIds.add(userId);
      await next();
      return;
    }
  } catch {
    // If DB fails, don't block — skip rate limiting for this request
    await next();
    return;
  }

  // Rate limit check
  const now = new Date();
  const minuteKey = `api-rate:${userId}:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  const currentStr = await c.env.SESSIONS.get(minuteKey);
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

  await c.env.SESSIONS.put(minuteKey, String(current + 1), { expirationTtl: 120 });

  c.header('X-RateLimit-Limit', String(API_RATE_LIMIT));
  c.header('X-RateLimit-Remaining', String(API_RATE_LIMIT - current - 1));

  await next();
};

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from './types.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { auth } from './routes/auth.js';
import { accounts } from './routes/accounts.js';
import { signals } from './routes/signals.js';
import { billing } from './routes/billing.js';
import { propguard } from './routes/propguard.js';
import { news } from './routes/news.js';

const app = new Hono<{ Bindings: Env }>();

// ── CORS ────────────────────────────────────────────────────────
app.use(
  '*',
  async (c, next) => {
    const origins = c.env.CORS_ORIGINS
      ? c.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000'];

    const corsMiddleware = cors({
      origin: origins,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });

    return corsMiddleware(c, next);
  },
);

// ── Global Error Handler ────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);

  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;

  return c.json<ApiResponse>(
    {
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: status === 500 ? 'An internal error occurred' : err.message,
      },
    },
    status as 400 | 401 | 403 | 404 | 500,
  );
});

// ── Health Check ────────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json<ApiResponse>({
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
  });
});

// ── Public Routes ───────────────────────────────────────────────
app.route('/v1/auth', auth);

// Paystack webhook + plans are public (verified via signature, not JWT)
// Auth-required routes (initialize, verify, subscription, cancel) apply authMiddleware internally
app.route('/v1/billing', billing);

// ── Protected Routes ────────────────────────────────────────────
const protectedApp = new Hono<{ Bindings: Env }>();
protectedApp.use('*', authMiddleware);
protectedApp.use('*', rateLimitMiddleware);

protectedApp.route('/accounts', accounts);
protectedApp.route('/signals', signals);
protectedApp.route('/propguard', propguard);
protectedApp.route('/news', news);

app.route('/v1', protectedApp);

// ── 404 Fallback ────────────────────────────────────────────────
app.notFound((c) => {
  return c.json<ApiResponse>(
    { data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } },
    404,
  );
});

export default app;

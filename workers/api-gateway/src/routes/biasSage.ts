// /v1/bias/sage/* — proxy SSE endpoints to the bias-sage worker.
//
// Auth runs in api-gateway. The bias-sage worker trusts the user_id
// it receives via query string because the only way to reach it is
// through this Service Binding.
import { Hono } from 'hono';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

export const biasSage = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

biasSage.use('*', authMiddleware);

// Returning the upstream Response object directly through a Hono handler
// causes the SSE body to be buffered (and a 204 to be silently flipped to 200
// with an empty body). Construct a fresh Response that explicitly forwards
// body + status + headers so the streaming chunks pass through untouched.
async function proxyToSage(c: { env: Env; get: (key: 'userId') => string }, path: '/sage/anchor' | '/sage/delta'): Promise<Response> {
  const userId = c.get('userId');
  const url = new URL(`https://internal${path}`);
  url.searchParams.set('user_id', userId);
  const upstream = await c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

biasSage.get('/anchor', (c) => proxyToSage(c, '/sage/anchor'));
biasSage.get('/delta', (c) => proxyToSage(c, '/sage/delta'));

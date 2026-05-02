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

biasSage.get('/anchor', async (c) => {
  const userId = c.get('userId');
  const url = new URL('https://internal/sage/anchor');
  url.searchParams.set('user_id', userId);
  return c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
});

biasSage.get('/delta', async (c) => {
  const userId = c.get('userId');
  const url = new URL('https://internal/sage/delta');
  url.searchParams.set('user_id', userId);
  return c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
});

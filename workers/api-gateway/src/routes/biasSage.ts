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

// SSE proxy — must explicitly pump bytes through a TransformStream because
// returning `upstream` (or even `new Response(upstream.body, ...)`) from a
// Hono handler lets the runtime buffer the body. We manually pipe the
// upstream ReadableStream into our own TransformStream and return that, which
// forces immediate flushing.
async function proxyToSage(
  c: { env: Env; get: (key: 'userId') => string },
  path: '/sage/anchor' | '/sage/delta',
): Promise<Response> {
  const userId = c.get('userId');
  const url = new URL(`https://internal${path}`);
  url.searchParams.set('user_id', userId);
  const upstream = await c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });

  // Forward 204 / non-streaming responses untouched.
  if (upstream.status === 204 || !upstream.body) {
    return new Response(null, {
      status: upstream.status,
      statusText: upstream.statusText,
    });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  // Don't await — let the pipe run in the background while we return the response.
  upstream.body.pipeTo(writable).catch(() => { /* swallow — client may disconnect */ });

  return new Response(readable, {
    status: upstream.status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}

biasSage.get('/anchor', (c) => proxyToSage(c, '/sage/anchor'));
biasSage.get('/delta', (c) => proxyToSage(c, '/sage/delta'));

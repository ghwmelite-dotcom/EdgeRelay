import { describe, it, expect } from 'vitest';
import { handleAnchor } from '../src/anchorHandler.js';
import type { Env } from '../src/types.js';

const FIXED_NOW = 1714636800; // 2024-05-02 06:00 UTC

function makeEnv(kv: Map<string, string>): Env {
  return {
    DB: {} as D1Database,
    BIAS_SAGE: {
      get: async (k: string) => kv.get(k) ?? null,
      put: async (k: string, v: string) => { kv.set(k, v); },
    } as unknown as KVNamespace,
    ANTHROPIC_API_KEY: 'sk-fake',
    SAGE_MODEL: 'claude-sonnet-4-6',
    DELTA_DAILY_CAP: '4',
    N_PLATFORM_DIVERGENCE_THRESHOLD: '50',
  };
}

describe('handleAnchor', () => {
  it('returns 200 SSE with cached brief', async () => {
    const kv = new Map<string, string>();
    kv.set('anchor:u1:2024-05-02', JSON.stringify({
      briefMd: 'Morning, Oz. Cached brief content.',
      intentJson: '{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}',
      level: 'L2',
      generatedAt: FIXED_NOW,
    }));
    const env = makeEnv(kv);
    const req = new Request('https://x/sage/anchor?user_id=u1');
    const res = await handleAnchor(req, env, FIXED_NOW);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('Cached brief content.');
    expect(body).toContain('event: done');
    expect(body).toContain('event: intent');
  });

  it('returns 400 when user_id missing', async () => {
    const res = await handleAnchor(
      new Request('https://x/sage/anchor'),
      makeEnv(new Map()),
      FIXED_NOW,
    );
    expect(res.status).toBe(400);
  });

  it('cache miss without LLM access surfaces error event in stream', async () => {
    // No KV entry, fetch will fail (sk-fake won't reach real anthropic).
    // Expect the stream to start, hit fetch, and emit an error event.
    // We do not assert on specifics of the error, only that it doesn't crash.
    const env = makeEnv(new Map());
    // Stub global fetch to return a synthetic 401
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('unauthorized', { status: 401 });
    try {
      // The handler will also try inputs.ts which queries DB.prepare — give it a minimal stub.
      env.DB = {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ id: 'u1', name: 'Oz' }),
            all: async () => ({ results: [] }),
          }),
        }),
      } as unknown as D1Database;
      const res = await handleAnchor(
        new Request('https://x/sage/anchor?user_id=u1'),
        env,
        FIXED_NOW,
      );
      expect(res.status).toBe(200); // SSE always opens 200; error is in-stream
      const body = await res.text();
      expect(body).toContain('event: error');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

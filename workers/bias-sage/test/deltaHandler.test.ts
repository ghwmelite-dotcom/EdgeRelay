import { describe, it, expect } from 'vitest';
import { handleDelta, generateDelta } from '../src/deltaHandler.js';
import type { Env } from '../src/types.js';

const FIXED_NOW = 1714680000;
const DAY = new Date(FIXED_NOW * 1000).toISOString().slice(0, 10);

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

describe('handleDelta', () => {
  it('returns 200 SSE with cached delta', async () => {
    const kv = new Map<string, string>();
    kv.set(`delta:u1:${DAY}`, JSON.stringify({
      briefMd: 'Quick note: XAU just flipped continuation.',
      intentJson: '{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}',
      generatedAt: FIXED_NOW,
      inputsHash: 'aaaa1111',
    }));
    const res = await handleDelta(
      new Request('https://x/sage/delta?user_id=u1'),
      makeEnv(kv),
      FIXED_NOW,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('XAU just flipped continuation.');
    expect(body).toContain('event: done');
  });

  it('returns 204 when no delta exists yet', async () => {
    const res = await handleDelta(
      new Request('https://x/sage/delta?user_id=u1'),
      makeEnv(new Map()),
      FIXED_NOW,
    );
    expect(res.status).toBe(204);
  });

  it('returns 204 when cached delta is malformed JSON', async () => {
    const kv = new Map<string, string>();
    kv.set(`delta:u1:${DAY}`, '{broken json');
    const res = await handleDelta(
      new Request('https://x/sage/delta?user_id=u1'),
      makeEnv(kv),
      FIXED_NOW,
    );
    expect(res.status).toBe(204);
  });

  it('returns 400 when user_id missing', async () => {
    const res = await handleDelta(
      new Request('https://x/sage/delta'),
      makeEnv(new Map()),
      FIXED_NOW,
    );
    expect(res.status).toBe(400);
  });
});

describe('generateDelta gating', () => {
  it('returns daily_cap when count >= cap', async () => {
    const kv = new Map<string, string>();
    kv.set(`delta:count:u1:${DAY}`, '4'); // at cap
    const env = makeEnv(kv);
    const r = await generateDelta(env, 'u1', ['phase_flip:EURUSD'], 'h1', FIXED_NOW);
    expect(r.generated).toBe(false);
    expect(r.reason).toBe('daily_cap');
  });

  it('returns hash_dedup when same hash within 60 min', async () => {
    const kv = new Map<string, string>();
    kv.set(`delta:u1:${DAY}`, JSON.stringify({
      briefMd: 'x',
      intentJson: '{}',
      generatedAt: FIXED_NOW - 60, // 1 min ago
      inputsHash: 'h1',
    }));
    const env = makeEnv(kv);
    const r = await generateDelta(env, 'u1', [], 'h1', FIXED_NOW);
    expect(r.generated).toBe(false);
    expect(r.reason).toBe('hash_dedup');
  });

  it('returns generated:true when fresh', async () => {
    const r = await generateDelta(makeEnv(new Map()), 'u1', ['phase_flip:EURUSD'], 'h1', FIXED_NOW);
    expect(r.generated).toBe(true);
  });

  it('does not dedup when same hash older than 60 min', async () => {
    const kv = new Map<string, string>();
    kv.set(`delta:u1:${DAY}`, JSON.stringify({
      briefMd: 'x',
      intentJson: '{}',
      generatedAt: FIXED_NOW - 3700, // > 60 min
      inputsHash: 'h1',
    }));
    const r = await generateDelta(makeEnv(kv), 'u1', [], 'h1', FIXED_NOW);
    expect(r.generated).toBe(true);
  });
});

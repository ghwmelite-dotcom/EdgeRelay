import type { Env } from './types.js';
import { dayKey } from './cache.js';

export interface CachedDelta {
  briefMd: string;
  intentJson: string;
  generatedAt: number;
  inputsHash: string;
}

export async function handleDelta(req: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return new Response('user_id required', { status: 400 });

  const day = dayKey(now);
  const raw = await env.BIAS_SAGE.get(`delta:${userId}:${day}`);
  if (!raw) return new Response(null, { status: 204 });

  let cached: CachedDelta;
  try {
    cached = JSON.parse(raw) as CachedDelta;
  } catch {
    return new Response(null, { status: 204 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: cached.briefMd })}\n\n`),
      );
      controller.enqueue(
        enc.encode(`event: intent\ndata: ${cached.intentJson}\n\n`),
      );
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}

/**
 * Gate function called by the materiality runner (Task 11).
 * Returns whether a new delta SHOULD be generated. The actual LLM call + cache
 * write is the caller's responsibility — this function is pure-ish (KV reads only).
 *
 * Skip if:
 *   - daily cap reached (env.DELTA_DAILY_CAP)
 *   - existing delta has same inputsHash AND was generated < 60 min ago
 */
export async function generateDelta(
  env: Env,
  userId: string,
  _triggers: string[],
  inputsHash: string,
  now: number,
): Promise<{ generated: boolean; reason?: string }> {
  const day = dayKey(now);
  const cap = parseInt(env.DELTA_DAILY_CAP, 10);

  const countKey = `delta:count:${userId}:${day}`;
  const countRaw = await env.BIAS_SAGE.get(countKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  if (count >= cap) return { generated: false, reason: 'daily_cap' };

  const existingRaw = await env.BIAS_SAGE.get(`delta:${userId}:${day}`);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw) as CachedDelta;
      if (existing.inputsHash === inputsHash && now - existing.generatedAt < 3600) {
        return { generated: false, reason: 'hash_dedup' };
      }
    } catch {
      // fall through, regenerate
    }
  }

  return { generated: true };
}

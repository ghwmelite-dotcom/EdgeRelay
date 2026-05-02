import type { Env } from './types.js';
import type { CachedAnchor } from './cache.js';
import { dayKey, getAnchor, putAnchor } from './cache.js';
import { buildPromptInputs } from './inputs.js';
import { buildAnchorMessages } from './prompt.js';
import { callSageStream } from './llm.js';
import { parseSageResponse } from './intentParser.js';

export async function handleAnchor(req: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return new Response('user_id required', { status: 400 });

  const day = dayKey(now);
  const cached = await getAnchor(env, userId, day);
  if (cached) {
    return sseFromCached(cached);
  }

  return generateAndStream(env, userId, day, now);
}

function sseFromCached(cached: CachedAnchor): Response {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: cached.briefMd })}\n\n`),
      );
      // Replay the intent block so the client gets greenlit assets etc.
      controller.enqueue(
        enc.encode(`event: intent\ndata: ${cached.intentJson}\n\n`),
      );
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
  return sseResponse(stream);
}

async function generateAndStream(
  env: Env,
  userId: string,
  day: string,
  now: number,
): Promise<Response> {
  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildAnchorMessages(inputs);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let full = '';
      try {
        for await (const chunk of callSageStream(messages, {
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.SAGE_MODEL,
        })) {
          if (chunk.type === 'text' && chunk.text) {
            full += chunk.text;
            controller.enqueue(
              enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: chunk.text })}\n\n`),
            );
          } else if (chunk.type === 'error') {
            controller.enqueue(
              enc.encode(`event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`),
            );
          }
        }
        const parsed = parseSageResponse(full);
        if (parsed.kind === 'ok') {
          await putAnchor(env, userId, day, {
            briefMd: parsed.briefMd,
            intentJson: JSON.stringify(parsed.intent),
            level: inputs.level,
            generatedAt: now,
          });
          controller.enqueue(
            enc.encode(`event: intent\ndata: ${JSON.stringify(parsed.intent)}\n\n`),
          );
        } else {
          controller.enqueue(
            enc.encode(`event: parse_error\ndata: ${JSON.stringify({ reason: parsed.reason })}\n\n`),
          );
        }
        controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      } catch (e) {
        controller.enqueue(
          enc.encode(`event: error\ndata: ${JSON.stringify({ error: (e as Error).message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });
  return sseResponse(stream);
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}

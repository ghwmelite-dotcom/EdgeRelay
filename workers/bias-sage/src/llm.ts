import type { AnchorMessages } from './prompt.js';

export interface LlmStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface CallSageOpts {
  ai: Ai;
  model: string;
  maxTokens?: number;
}

/**
 * Calls Cloudflare Workers AI with streaming. Yields text chunks as they arrive.
 * Uses the OpenAI-compatible messages format. Returns the model's full response
 * (including the <brief>...</brief><intent>...</intent> wrapper which the
 * system prompt instructs the model to emit literally).
 */
export async function* callSageStream(
  messages: AnchorMessages,
  opts: CallSageOpts,
): AsyncGenerator<LlmStreamChunk> {
  let stream: ReadableStream<Uint8Array>;
  try {
    const result = await opts.ai.run(
      opts.model as Parameters<Ai['run']>[0],
      {
        messages: [
          { role: 'system', content: messages.system },
          { role: 'user', content: messages.user },
        ],
        max_tokens: opts.maxTokens ?? 800,
        stream: true,
      },
    );
    // env.AI.run with stream:true returns a ReadableStream when called this way.
    stream = result as unknown as ReadableStream<Uint8Array>;
  } catch (e) {
    yield { type: 'error', error: (e as Error).message };
    return;
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload) as { response?: string };
        if (typeof obj.response === 'string' && obj.response.length > 0) {
          yield { type: 'text', text: obj.response };
        }
      } catch {
        // skip malformed line
      }
    }
  }
  yield { type: 'done' };
}

import type { AnchorMessages } from './prompt.js';

export interface LlmStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface CallSageOpts {
  apiKey: string;
  model: string;
  maxTokens?: number;
}

/**
 * Calls Anthropic Messages API with streaming. Yields text chunks. The assistant
 * prefill is re-emitted as the first text chunk so downstream consumers see the
 * complete response wrapper (Anthropic streams only the deltas after the prefill,
 * but our intent parser needs the full <brief>...</brief><intent>...</intent>).
 */
export async function* callSageStream(
  messages: AnchorMessages,
  opts: CallSageOpts,
): AsyncGenerator<LlmStreamChunk> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 800,
      stream: true,
      system: [
        { type: 'text', text: messages.system, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: messages.user },
        { role: 'assistant', content: messages.assistantPrefill },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', error: `HTTP ${res.status}: ${await res.text()}` };
    return;
  }

  // Re-emit the prefill so consumers get the full text including the opening <brief> tag.
  yield { type: 'text', text: messages.assistantPrefill };

  const reader = res.body.getReader();
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
        const obj = JSON.parse(payload) as {
          type: string;
          delta?: { type: string; text?: string };
        };
        if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta' && obj.delta.text) {
          yield { type: 'text', text: obj.delta.text };
        }
      } catch {
        // skip malformed line
      }
    }
  }
  yield { type: 'done' };
}

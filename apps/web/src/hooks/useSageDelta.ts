import { useEffect, useState } from 'react';
import type { SageBriefIntent } from '@edgerelay/shared';
import { useAuthStore } from '@/stores/auth';
import { API_BASE } from '@/lib/constants';

export interface SageDeltaState {
  briefMd: string;
  intent: SageBriefIntent | null;
  isStreaming: boolean;
  hasDelta: boolean;
  error: string | null;
}

const INITIAL: SageDeltaState = {
  briefMd: '',
  intent: null,
  isStreaming: true,
  hasDelta: false,
  error: null,
};

/**
 * Subscribes to /v1/bias/sage/delta SSE.
 * Returns hasDelta=false when server responds 204 (no material change since anchor).
 * pollKey lets the caller force a refetch (e.g. after a phase-flip event).
 */
export function useSageDelta(pollKey: number = 0): SageDeltaState {
  const token = useAuthStore((s) => s.token);
  const [state, setState] = useState<SageDeltaState>(INITIAL);

  useEffect(() => {
    if (!token) {
      setState({ briefMd: '', intent: null, isStreaming: false, hasDelta: false, error: null });
      return;
    }
    setState(INITIAL);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/bias/sage/delta`, {
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'text/event-stream',
          },
          signal: ctrl.signal,
        });
        if (res.status === 204) {
          setState({ briefMd: '', intent: null, isStreaming: false, hasDelta: false, error: null });
          return;
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        setState((s) => ({ ...s, hasDelta: true }));
        await consumeSSE(res.body, (evt, data) => {
          if (evt === 'text' && typeof data?.chunk === 'string') {
            setState((s) => ({ ...s, briefMd: s.briefMd + data.chunk }));
          } else if (evt === 'intent') {
            setState((s) => ({ ...s, intent: data as unknown as SageBriefIntent }));
          } else if (evt === 'done') {
            setState((s) => ({ ...s, isStreaming: false }));
          } else if (evt === 'error' || evt === 'parse_error') {
            setState((s) => ({
              ...s,
              isStreaming: false,
              error: (data?.error as string) ?? (data?.reason as string) ?? 'unknown',
            }));
          }
        });
        setState((s) => (s.isStreaming ? { ...s, isStreaming: false } : s));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setState((s) => ({ ...s, isStreaming: false, error: (e as Error).message }));
      }
    })();
    return () => ctrl.abort();
  }, [token, pollKey]);

  return state;
}

/** Parses the SSE event stream and dispatches each event to onEvent. */
async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: string, data: Record<string, unknown> | null) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split('\n\n');
    buf = events.pop() ?? '';
    for (const ev of events) {
      const m = /^event:\s*(\w+)\ndata:\s*(.*)$/m.exec(ev);
      if (!m) continue;
      const [, evt, dataStr] = m;
      let data: Record<string, unknown> | null = null;
      if (dataStr) {
        try {
          data = JSON.parse(dataStr) as Record<string, unknown>;
        } catch {
          data = null;
        }
      }
      onEvent(evt!, data);
    }
  }
}

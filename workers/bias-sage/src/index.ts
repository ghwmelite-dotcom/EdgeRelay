import { Hono } from 'hono';
import type { Env } from './types.js';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, worker: 'bias-sage' }));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Per-user wake-time generation lands in Task 11.
  },
};

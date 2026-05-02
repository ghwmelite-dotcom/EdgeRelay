import { Hono } from 'hono';
import type { Env } from './types.js';
import { handleAnchor } from './anchorHandler.js';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, worker: 'bias-sage' }));

app.get('/sage/anchor', (c) =>
  handleAnchor(c.req.raw, c.env, Math.floor(Date.now() / 1000)),
);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Wake-time generation lands in Task 11.
  },
};

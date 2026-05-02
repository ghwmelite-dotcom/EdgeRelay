import { Hono } from 'hono';
import type { Env } from './types.js';
import { handleAnchor } from './anchorHandler.js';
import { handleDelta } from './deltaHandler.js';
import { runWakeTimeScan, runDeltaScan } from './scheduler.js';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, worker: 'bias-sage' }));

app.get('/sage/anchor', (c) =>
  handleAnchor(c.req.raw, c.env, Math.floor(Date.now() / 1000)),
);

app.get('/sage/delta', (c) =>
  handleDelta(c.req.raw, c.env, Math.floor(Date.now() / 1000)),
);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await runWakeTimeScan(env, now, ctx);
    await runDeltaScan(env, now, ctx);
  },
};

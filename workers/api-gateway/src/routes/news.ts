import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const news = new Hono<{ Bindings: Env }>();

// GET /calendar — upcoming high-impact news events
news.get('/calendar', async (c) => {
  const currencies = c.req.query('currency')?.split(',') ?? ['USD', 'EUR', 'GBP'];
  const from = c.req.query('from') ?? new Date().toISOString().split('T')[0];
  const to =
    c.req.query('to') ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })();

  const placeholders = currencies.map(() => '?').join(',');
  const result = await c.env.DB.prepare(
    `SELECT * FROM news_events
     WHERE currency IN (${placeholders})
       AND event_time >= ? AND event_time <= ?
       AND impact IN ('high', 'medium')
     ORDER BY event_time ASC`,
  )
    .bind(...currencies, from, to + 'T23:59:59')
    .all();

  return c.json<ApiResponse>({ data: { events: result.results }, error: null });
});

// GET /check — quick check for imminent news
news.get('/check', async (c) => {
  const minutes = parseInt(c.req.query('minutes') ?? '5');
  const currencies = c.req.query('currency')?.split(',') ?? ['USD', 'EUR', 'GBP'];

  const now = new Date();
  const windowStart = new Date(now.getTime() - minutes * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  const placeholders = currencies.map(() => '?').join(',');
  const event = await c.env.DB.prepare(
    `SELECT * FROM news_events
     WHERE currency IN (${placeholders})
       AND event_time >= ? AND event_time <= ?
       AND impact = 'high'
     ORDER BY event_time ASC
     LIMIT 1`,
  )
    .bind(...currencies, windowStart, windowEnd)
    .first();

  return c.json<ApiResponse>({
    data: { blocked: !!event, event: event ?? null },
    error: null,
  });
});

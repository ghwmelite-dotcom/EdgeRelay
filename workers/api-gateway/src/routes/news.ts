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

// GET /events — news events within a time window (for Trade Autopsy)
news.get('/events', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_REQUEST', message: 'from and to query params required' } },
      400,
    );
  }

  const result = await c.env.DB.prepare(
    `SELECT event_name, currency, impact, event_time, forecast, previous, actual
     FROM news_events
     WHERE event_time >= ? AND event_time <= ?
     ORDER BY event_time ASC
     LIMIT 50`,
  )
    .bind(from, to)
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

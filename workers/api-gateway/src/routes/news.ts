import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const news = new Hono<{ Bindings: Env }>();

// GET /calendar â€” upcoming high-impact news events
news.get('/calendar', async (c) => {
  const currencies = c.req.query('currency')?.split(',') ?? ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY'];
  const from = c.req.query('from') ?? new Date().toISOString();
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
       AND datetime(event_time) >= datetime(?) AND datetime(event_time) <= datetime(?)
       AND impact = 'high'
     GROUP BY event_name, currency, datetime(event_time)
     ORDER BY datetime(event_time) ASC`,
  )
    .bind(...currencies, from, to + 'T23:59:59')
    .all();

  return c.json<ApiResponse>({ data: { events: result.results }, error: null });
});

// GET /events â€” news events within a time window (for Trade Autopsy)
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
     WHERE datetime(event_time) >= datetime(?) AND datetime(event_time) <= datetime(?)
     ORDER BY datetime(event_time) ASC
     LIMIT 50`,
  )
    .bind(from, to)
    .all();

  return c.json<ApiResponse>({ data: { events: result.results }, error: null });
});

// GET /check â€” quick check for imminent news
news.get('/check', async (c) => {
  const minutes = parseInt(c.req.query('minutes') ?? '5');
  const currencies = c.req.query('currency')?.split(',') ?? ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY'];

  const now = new Date();
  const windowStart = new Date(now.getTime() - minutes * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  const placeholders = currencies.map(() => '?').join(',');
  const event = await c.env.DB.prepare(
    `SELECT * FROM news_events
     WHERE currency IN (${placeholders})
       AND datetime(event_time) >= datetime(?) AND datetime(event_time) <= datetime(?)
       AND impact = 'high'
     GROUP BY event_name, currency, datetime(event_time)
     ORDER BY datetime(event_time) ASC
     LIMIT 1`,
  )
    .bind(...currencies, windowStart, windowEnd)
    .first();

  return c.json<ApiResponse>({
    data: { blocked: !!event, event: event ?? null },
    error: null,
  });
});

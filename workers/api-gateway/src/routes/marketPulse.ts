import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const marketPulse = new Hono<{ Bindings: Env }>();

// ── GET /calendar — Public economic calendar (no auth) ────────

marketPulse.get('/calendar', async (c) => {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const { results } = await c.env.DB.prepare(
    `SELECT event_name, currency, impact, event_time, forecast, previous, actual
     FROM news_events
     WHERE event_time >= ? AND event_time <= ?
       AND impact IN ('high', 'medium')
     ORDER BY event_time ASC
     LIMIT 100`,
  ).bind(from, to + 'T23:59:59').all();

  // Compute events by currency for heat map
  const byCurrency: Record<string, { high: number; medium: number; total: number }> = {};
  for (const e of (results || []) as Array<{ currency: string; impact: string }>) {
    if (!byCurrency[e.currency]) byCurrency[e.currency] = { high: 0, medium: 0, total: 0 };
    byCurrency[e.currency].total++;
    if (e.impact === 'high') byCurrency[e.currency].high++;
    else byCurrency[e.currency].medium++;
  }

  return new Response(JSON.stringify({ data: { events: results || [], byCurrency }, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, max-age=60',
    },
  });
});

// ── GET /headlines — Public latest headlines (no auth) ─────────

marketPulse.get('/headlines', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT headline, source, published_at, related_currencies, url
     FROM market_news
     ORDER BY published_at DESC
     LIMIT 15`,
  ).all();

  return new Response(JSON.stringify({ data: { headlines: results || [] }, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, max-age=60',
    },
  });
});

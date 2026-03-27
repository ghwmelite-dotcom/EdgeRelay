import { Hono } from 'hono';
import type { Env } from '../types.js';
import type { ApiResponse, MarketHeadline } from '@edgerelay/shared';

const marketNews = new Hono<{ Bindings: Env }>();

marketNews.get('/headlines', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const { results } = await c.env.DB.prepare(
    `SELECT id, headline, summary, source, url, sentiment, related_currencies, published_at
     FROM market_news ORDER BY published_at DESC LIMIT ?`,
  ).bind(safeLimit).all<MarketHeadline>();

  return c.json<ApiResponse<{ headlines: MarketHeadline[] }>>({
    data: { headlines: results || [] },
    error: null,
  });
});

export { marketNews };

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { selectMajorNews, type ApiResponse, type MarketHeadline } from '@edgerelay/shared';

const marketNews = new Hono<{ Bindings: Env }>();

marketNews.get('/headlines', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  const { results } = await c.env.DB.prepare(
    `SELECT id, headline, summary, source, url, sentiment, related_currencies, published_at
     FROM market_news WHERE datetime(published_at) >= datetime('now', '-24 hours') ORDER BY published_at DESC LIMIT 300`,
  ).all<MarketHeadline>();

  return c.json<ApiResponse<{ headlines: MarketHeadline[] }>>({
    data: { headlines: selectMajorNews(results || [], safeLimit) },
    error: null,
  });
});

export { marketNews };

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { verifyJwt } from '../middleware/auth.js';

export const social = new Hono<{ Bindings: Env }>();

// Helper: extract userId from Authorization header (for public-mounted routes)
async function getUserId(c: { req: { header: (name: string) => string | undefined }; env: { JWT_SECRET: string } }): Promise<string | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = await verifyJwt(auth.slice(7), c.env.JWT_SECRET);
    return payload?.sub || null;
  } catch { return null; }
}

// ── GET /social/feed — Public feed of posts ───────────────────

social.get('/feed', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const offset = parseInt(c.req.query('offset') || '0');
  const filter = c.req.query('type'); // setup, result, insight

  let where = '';
  const bindings: unknown[] = [];
  if (filter && ['setup', 'result', 'insight'].includes(filter)) {
    where = 'WHERE post_type = ?';
    bindings.push(filter);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_name, post_type, symbol, direction, content, pnl, pips,
            upvotes, downvotes, is_verified, created_at
     FROM social_posts ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...bindings, limit, offset).all();

  return c.json<ApiResponse>({ data: { posts: results || [] }, error: null });
});

// ── POST /social/posts — Create a post (auth required) ────────

social.post('/posts', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json<ApiResponse>({ data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, 401);
  const body = await c.req.json<{
    postType: 'setup' | 'result' | 'insight';
    symbol?: string;
    direction?: string;
    content: string;
    pnl?: number;
    pips?: number;
  }>();

  if (!body.content?.trim()) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_REQUEST', message: 'Content is required' } }, 400);
  }

  const user = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(userId).first<{ name: string }>();

  // Check if user is "verified" (100+ trades with positive total P&L)
  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) as trades, COALESCE(SUM(profit), 0) as pnl
     FROM journal_trades jt JOIN accounts a ON jt.account_id = a.id
     WHERE a.user_id = ? AND jt.deal_entry = 'out'`,
  ).bind(userId).first<{ trades: number; pnl: number }>();

  const isVerified = (stats?.trades || 0) >= 100 && (stats?.pnl || 0) > 0;

  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(
    `INSERT INTO social_posts (id, user_id, user_name, post_type, symbol, direction, content, pnl, pips, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, userId, user?.name || 'Trader', body.postType,
    body.symbol || null, body.direction || null,
    body.content.trim().slice(0, 500),
    body.pnl || null, body.pips || null,
    isVerified ? 1 : 0,
  ).run();

  return c.json<ApiResponse>({
    data: { id, verified: isVerified },
    error: null,
  });
});

// ── POST /social/posts/:id/vote — Upvote/downvote ────────────

social.post('/posts/:postId/vote', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json<ApiResponse>({ data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, 401);
  const postId = c.req.param('postId');
  const body = await c.req.json<{ vote: 1 | -1 }>();

  if (body.vote !== 1 && body.vote !== -1) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_REQUEST', message: 'Vote must be 1 or -1' } }, 400);
  }

  // Check if already voted
  const existing = await c.env.DB.prepare(
    'SELECT vote FROM social_votes WHERE user_id = ? AND post_id = ?',
  ).bind(userId, postId).first<{ vote: number }>();

  if (existing) {
    if (existing.vote === body.vote) {
      // Remove vote (toggle off)
      await c.env.DB.prepare('DELETE FROM social_votes WHERE user_id = ? AND post_id = ?').bind(userId, postId).run();
      const col = body.vote === 1 ? 'upvotes' : 'downvotes';
      await c.env.DB.prepare(`UPDATE social_posts SET ${col} = MAX(0, ${col} - 1) WHERE id = ?`).bind(postId).run();
      return c.json<ApiResponse>({ data: { action: 'removed' }, error: null });
    } else {
      // Switch vote
      await c.env.DB.prepare('UPDATE social_votes SET vote = ? WHERE user_id = ? AND post_id = ?').bind(body.vote, userId, postId).run();
      const addCol = body.vote === 1 ? 'upvotes' : 'downvotes';
      const subCol = body.vote === 1 ? 'downvotes' : 'upvotes';
      await c.env.DB.prepare(`UPDATE social_posts SET ${addCol} = ${addCol} + 1, ${subCol} = MAX(0, ${subCol} - 1) WHERE id = ?`).bind(postId).run();
      return c.json<ApiResponse>({ data: { action: 'switched' }, error: null });
    }
  }

  // New vote
  await c.env.DB.prepare(
    'INSERT INTO social_votes (id, user_id, post_id, vote) VALUES (lower(hex(randomblob(16))), ?, ?, ?)',
  ).bind(userId, postId, body.vote).run();

  const col = body.vote === 1 ? 'upvotes' : 'downvotes';
  await c.env.DB.prepare(`UPDATE social_posts SET ${col} = ${col} + 1 WHERE id = ?`).bind(postId).run();

  return c.json<ApiResponse>({ data: { action: 'voted' }, error: null });
});

// ── DELETE /social/posts/:id — Delete own post ────────────────

social.delete('/posts/:postId', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json<ApiResponse>({ data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } }, 401);
  const postId = c.req.param('postId');

  await c.env.DB.prepare('DELETE FROM social_votes WHERE post_id = ? AND post_id IN (SELECT id FROM social_posts WHERE user_id = ?)').bind(postId, userId).run();
  await c.env.DB.prepare('DELETE FROM social_posts WHERE id = ? AND user_id = ?').bind(postId, userId).run();

  return c.json<ApiResponse>({ data: { deleted: true }, error: null });
});

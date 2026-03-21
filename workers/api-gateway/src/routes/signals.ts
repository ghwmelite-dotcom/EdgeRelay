import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

const signals = new Hono<{ Bindings: Env }>();

// ── GET /signals ────────────────────────────────────────────────
signals.get('/', async (c) => {
  const userId = c.get('userId');
  const masterAccountId = c.req.query('master_account_id');
  const symbol = c.req.query('symbol');
  const action = c.req.query('action');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const cursor = c.req.query('cursor'); // cursor = received_at of last item

  // Build query dynamically with prepared statement bindings
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  // Only show signals for accounts owned by this user
  conditions.push('s.master_account_id IN (SELECT id FROM accounts WHERE user_id = ? AND role = ?)');
  bindings.push(userId, 'master');

  if (masterAccountId) {
    conditions.push('s.master_account_id = ?');
    bindings.push(masterAccountId);
  }

  if (symbol) {
    conditions.push('s.symbol = ?');
    bindings.push(symbol);
  }

  if (action) {
    conditions.push('s.action = ?');
    bindings.push(action);
  }

  if (cursor) {
    conditions.push('s.received_at < ?');
    bindings.push(cursor);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  bindings.push(limit + 1); // Fetch one extra to determine if there's a next page

  const result = await c.env.DB.prepare(
    `SELECT s.id, s.master_account_id, s.sequence_num, s.action, s.order_type,
            s.symbol, s.volume, s.price, s.sl, s.tp, s.magic_number, s.ticket,
            s.comment, s.received_at
     FROM signals s
     ${whereClause}
     ORDER BY s.received_at DESC
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  const hasMore = result.results.length > limit;
  const items = hasMore ? result.results.slice(0, limit) : result.results;
  const nextCursor = hasMore
    ? (items[items.length - 1] as Record<string, unknown> | undefined)?.received_at as string | undefined
    : undefined;

  return c.json<ApiResponse>({
    data: items,
    error: null,
    meta: {
      count: items.length,
      has_more: hasMore,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    },
  });
});

// ── GET /signals/:id ────────────────────────────────────────────
signals.get('/:id', async (c) => {
  const userId = c.get('userId');
  const signalId = c.req.param('id');

  const signal = await c.env.DB.prepare(
    `SELECT s.id, s.master_account_id, s.sequence_num, s.action, s.order_type,
            s.symbol, s.volume, s.price, s.sl, s.tp, s.magic_number, s.ticket,
            s.comment, s.received_at
     FROM signals s
     JOIN accounts a ON a.id = s.master_account_id
     WHERE s.id = ? AND a.user_id = ?`,
  )
    .bind(signalId, userId)
    .first();

  if (!signal) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Signal not found' } },
      404,
    );
  }

  // Fetch associated executions
  const executions = await c.env.DB.prepare(
    `SELECT e.id, e.follower_account_id, e.status, e.block_reason,
            e.executed_volume, e.executed_price, e.slippage_points,
            e.execution_time_ms, e.mt5_ticket, e.error_code, e.error_message,
            e.executed_at,
            a.alias as follower_alias
     FROM executions e
     JOIN accounts a ON a.id = e.follower_account_id
     WHERE e.signal_id = ?
     ORDER BY e.executed_at DESC`,
  )
    .bind(signalId)
    .all();

  return c.json<ApiResponse>({
    data: { ...signal, executions: executions.results },
    error: null,
  });
});

export { signals };

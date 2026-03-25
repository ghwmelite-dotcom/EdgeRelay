import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const journal = new Hono<{ Bindings: Env }>();

// ── Helper: verify account ownership ────────────────────────

async function verifyAccountOwnership(
  db: D1Database,
  accountId: string,
  userId: string,
): Promise<boolean> {
  const account = await db
    .prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .bind(accountId, userId)
    .first<{ id: string }>();
  return !!account;
}

// ── GET /trades/:accountId — List trades with cursor pagination ──

journal.get('/trades/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  // Parse query params
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const cursor = c.req.query('cursor'); // format: "<time>,<deal_ticket>"
  const symbol = c.req.query('symbol');
  const direction = c.req.query('direction');
  const sessionTag = c.req.query('session_tag');
  const magicNumber = c.req.query('magic_number');
  const from = c.req.query('from');
  const to = c.req.query('to');

  // Build dynamic WHERE clause
  const conditions: string[] = ['account_id = ?'];
  const bindings: unknown[] = [accountId];

  if (cursor) {
    const parts = cursor.split(',');
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      const cursorTime = parseInt(parts[0], 10);
      const cursorTicket = parseInt(parts[1], 10);
      conditions.push('(time < ? OR (time = ? AND deal_ticket < ?))');
      bindings.push(cursorTime, cursorTime, cursorTicket);
    }
  }

  if (symbol) {
    conditions.push('symbol = ?');
    bindings.push(symbol);
  }

  if (direction) {
    conditions.push('direction = ?');
    bindings.push(direction);
  }

  if (sessionTag) {
    conditions.push('session_tag = ?');
    bindings.push(sessionTag);
  }

  if (magicNumber) {
    conditions.push('magic_number = ?');
    bindings.push(parseInt(magicNumber, 10));
  }

  if (from) {
    conditions.push('time >= ?');
    bindings.push(parseInt(from, 10));
  }

  if (to) {
    conditions.push('time <= ?');
    bindings.push(parseInt(to, 10));
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  bindings.push(limit + 1); // Fetch one extra to determine has_more

  const result = await c.env.DB.prepare(
    `SELECT deal_ticket, order_ticket, position_id, symbol, direction, deal_entry,
            volume, price, sl, tp, time, profit, commission, swap,
            magic_number, comment, balance_at_trade, equity_at_trade,
            spread_at_entry, atr_at_entry, session_tag,
            duration_seconds, pips, risk_reward_ratio
     FROM journal_trades
     ${whereClause}
     ORDER BY time DESC, deal_ticket DESC
     LIMIT ?`,
  )
    .bind(...bindings)
    .all();

  const hasMore = result.results.length > limit;
  const trades = hasMore ? result.results.slice(0, limit) : result.results;

  let nextCursor: string | undefined;
  if (hasMore && trades.length > 0) {
    const last = trades[trades.length - 1] as Record<string, unknown>;
    nextCursor = `${last.time},${last.deal_ticket}`;
  }

  return c.json<ApiResponse>({
    data: {
      trades,
      next_cursor: nextCursor ?? null,
      has_more: hasMore,
    },
    error: null,
  });
});

// ── GET /trades/:accountId/:dealTicket — Single trade detail ──

journal.get('/trades/:accountId/:dealTicket', async (c) => {
  const accountId = c.req.param('accountId');
  const dealTicket = parseInt(c.req.param('dealTicket'), 10);
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const trade = await c.env.DB.prepare(
    `SELECT deal_ticket, order_ticket, position_id, symbol, direction, deal_entry,
            volume, price, sl, tp, time, profit, commission, swap,
            magic_number, comment, balance_at_trade, equity_at_trade,
            spread_at_entry, atr_at_entry, session_tag,
            duration_seconds, pips, risk_reward_ratio, synced_at
     FROM journal_trades
     WHERE account_id = ? AND deal_ticket = ?`,
  )
    .bind(accountId, dealTicket)
    .first();

  if (!trade) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Trade not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({ data: trade, error: null });
});

// ── Helper: build date range conditions ─────────────────────

function addDateRange(
  conditions: string[],
  bindings: unknown[],
  from?: string | null,
  to?: string | null,
): void {
  if (from) {
    conditions.push('time >= ?');
    bindings.push(parseInt(from, 10));
  }
  if (to) {
    conditions.push('time <= ?');
    bindings.push(parseInt(to, 10));
  }
}

// ── GET /stats/:accountId — Summary statistics ──────────────

journal.get('/stats/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const conditions: string[] = ["account_id = ?", "deal_entry = 'out'"];
  const bindings: unknown[] = [accountId];
  addDateRange(conditions, bindings, c.req.query('from'), c.req.query('to'));

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total_trades,
       SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as winning_trades,
       SUM(CASE WHEN profit <= 0 THEN 1 ELSE 0 END) as losing_trades,
       SUM(profit) as total_profit,
       SUM(commission) as total_commission,
       SUM(swap) as total_swap,
       AVG(CASE WHEN profit > 0 THEN profit END) as avg_winner,
       AVG(CASE WHEN profit <= 0 THEN profit END) as avg_loser,
       AVG(duration_seconds) as avg_duration_seconds,
       AVG(risk_reward_ratio) as avg_rr,
       MAX(profit) as best_trade,
       MIN(profit) as worst_trade,
       SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) as sum_winners,
       SUM(CASE WHEN profit <= 0 THEN profit ELSE 0 END) as sum_losers
     FROM journal_trades
     ${whereClause}`,
  )
    .bind(...bindings)
    .first<Record<string, number | null>>();

  if (!stats || !stats.total_trades) {
    return c.json<ApiResponse>({
      data: {
        total_trades: 0, winning_trades: 0, losing_trades: 0,
        win_rate: 0, total_profit: 0, total_commission: 0, total_swap: 0,
        net_profit: 0, avg_profit_per_trade: 0, avg_winner: 0, avg_loser: 0,
        profit_factor: 0, avg_duration_seconds: 0, avg_rr: 0,
        best_trade: 0, worst_trade: 0,
      },
      error: null,
    });
  }

  const totalTrades = stats.total_trades ?? 0;
  const winningTrades = stats.winning_trades ?? 0;
  const totalProfit = stats.total_profit ?? 0;
  const totalCommission = stats.total_commission ?? 0;
  const totalSwap = stats.total_swap ?? 0;
  const netProfit = totalProfit + totalCommission + totalSwap;
  const sumLosers = stats.sum_losers ?? 0;
  const sumWinners = stats.sum_winners ?? 0;

  return c.json<ApiResponse>({
    data: {
      total_trades: totalTrades,
      winning_trades: winningTrades,
      losing_trades: stats.losing_trades ?? 0,
      win_rate: totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 10000) / 100 : 0,
      total_profit: Math.round(totalProfit * 100) / 100,
      total_commission: Math.round(totalCommission * 100) / 100,
      total_swap: Math.round(totalSwap * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      avg_profit_per_trade: totalTrades > 0 ? Math.round((netProfit / totalTrades) * 100) / 100 : 0,
      avg_winner: Math.round((stats.avg_winner ?? 0) * 100) / 100,
      avg_loser: Math.round((stats.avg_loser ?? 0) * 100) / 100,
      profit_factor: sumLosers !== 0 ? Math.round(Math.abs(sumWinners / sumLosers) * 100) / 100 : 0,
      avg_duration_seconds: Math.round(stats.avg_duration_seconds ?? 0),
      avg_rr: Math.round((stats.avg_rr ?? 0) * 100) / 100,
      best_trade: Math.round((stats.best_trade ?? 0) * 100) / 100,
      worst_trade: Math.round((stats.worst_trade ?? 0) * 100) / 100,
    },
    error: null,
  });
});

// ── GET /stats/:accountId/by-symbol — P&L by symbol ─────────

journal.get('/stats/:accountId/by-symbol', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const conditions: string[] = ["account_id = ?", "deal_entry = 'out'"];
  const bindings: unknown[] = [accountId];
  addDateRange(conditions, bindings, c.req.query('from'), c.req.query('to'));

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await c.env.DB.prepare(
    `SELECT
       symbol,
       COUNT(*) as trades,
       ROUND(SUM(profit), 2) as profit,
       ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2) as win_rate
     FROM journal_trades
     ${whereClause}
     GROUP BY symbol
     ORDER BY SUM(profit) DESC`,
  )
    .bind(...bindings)
    .all();

  return c.json<ApiResponse>({
    data: { symbols: result.results },
    error: null,
  });
});

// ── GET /stats/:accountId/by-session — P&L by session ───────

journal.get('/stats/:accountId/by-session', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const conditions: string[] = ["account_id = ?", "deal_entry = 'out'"];
  const bindings: unknown[] = [accountId];
  addDateRange(conditions, bindings, c.req.query('from'), c.req.query('to'));

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await c.env.DB.prepare(
    `SELECT
       session_tag as session,
       COUNT(*) as trades,
       ROUND(SUM(profit), 2) as profit,
       ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2) as win_rate
     FROM journal_trades
     ${whereClause}
     GROUP BY session_tag
     ORDER BY SUM(profit) DESC`,
  )
    .bind(...bindings)
    .all();

  return c.json<ApiResponse>({
    data: { sessions: result.results },
    error: null,
  });
});

// ── GET /stats/:accountId/daily — Daily P&L for equity curve ──

journal.get('/stats/:accountId/daily', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const conditions: string[] = ["account_id = ?", "deal_entry = 'out'"];
  const bindings: unknown[] = [accountId];
  addDateRange(conditions, bindings, c.req.query('from'), c.req.query('to'));

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await c.env.DB.prepare(
    `SELECT
       date(time, 'unixepoch') as date,
       COUNT(*) as trades,
       ROUND(SUM(profit), 2) as profit
     FROM journal_trades
     ${whereClause}
     GROUP BY date(time, 'unixepoch')
     ORDER BY date ASC
     LIMIT 365`,
  )
    .bind(...bindings)
    .all();

  // Compute cumulative profit
  let cumulative = 0;
  const days = result.results.map((row: Record<string, unknown>) => {
    cumulative += (row.profit as number) ?? 0;
    return {
      date: row.date,
      trades: row.trades,
      profit: row.profit,
      cumulative_profit: Math.round(cumulative * 100) / 100,
    };
  });

  return c.json<ApiResponse>({
    data: { days },
    error: null,
  });
});

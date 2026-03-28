import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const analytics = new Hono<{ Bindings: Env }>();

// ── Helper: get all user's account IDs ──────────────────────────

async function getUserAccountIds(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = true')
    .bind(userId)
    .all<{ id: string }>();
  return results?.map((r) => r.id) ?? [];
}

// ── Helper: build IN clause for account IDs ─────────────────────

function inClause(ids: string[]): { placeholders: string; values: string[] } {
  return {
    placeholders: ids.map(() => '?').join(','),
    values: ids,
  };
}

// Day number to name mapping
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── GET /analytics/attribution ──────────────────────────────────

analytics.get('/attribution', async (c) => {
  const userId = c.get('userId');
  const accountIds = await getUserAccountIds(c.env.DB, userId);

  if (accountIds.length === 0) {
    return c.json<ApiResponse>({
      data: { by_session: [], by_day: [], by_symbol: [], by_direction: [], hour_heatmap: [], total_trades: 0, total_pnl: 0 },
      error: null,
    });
  }

  const { placeholders, values } = inClause(accountIds);
  const baseWhere = `account_id IN (${placeholders}) AND deal_entry = 'out'`;

  // By session
  const { results: bySession } = await c.env.DB.prepare(
    `SELECT session_tag as session,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY session_tag ORDER BY pnl DESC`,
  ).bind(...values).all();

  // By day of week
  const { results: byDay } = await c.env.DB.prepare(
    `SELECT CAST(strftime('%w', close_time) AS INTEGER) as day_num,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY day_num ORDER BY day_num`,
  ).bind(...values).all();

  // Map day numbers to names
  const byDayNamed = (byDay ?? []).map((d: Record<string, unknown>) => ({
    day: DAY_NAMES[(d.day_num as number) ?? 0],
    day_num: d.day_num,
    trades: d.trades,
    pnl: d.pnl,
    win_rate: d.win_rate,
  }));

  // By symbol
  const { results: bySymbol } = await c.env.DB.prepare(
    `SELECT symbol,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY symbol ORDER BY pnl DESC`,
  ).bind(...values).all();

  // By direction
  const { results: byDirection } = await c.env.DB.prepare(
    `SELECT direction,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY direction`,
  ).bind(...values).all();

  // Hour heatmap
  const { results: heatmap } = await c.env.DB.prepare(
    `SELECT CAST(strftime('%w', close_time) AS INTEGER) as day_num,
            CAST(strftime('%H', close_time) AS INTEGER) as hour,
            COALESCE(SUM(profit), 0) as pnl,
            COUNT(*) as trades
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY day_num, hour`,
  ).bind(...values).all();

  // Totals
  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_trades, COALESCE(SUM(profit), 0) as total_pnl
     FROM journal_trades WHERE ${baseWhere}`,
  ).bind(...values).first<{ total_trades: number; total_pnl: number }>();

  return c.json<ApiResponse>({
    data: {
      by_session: bySession ?? [],
      by_day: byDayNamed,
      by_symbol: bySymbol ?? [],
      by_direction: byDirection ?? [],
      hour_heatmap: heatmap ?? [],
      total_trades: totals?.total_trades ?? 0,
      total_pnl: totals?.total_pnl ?? 0,
    },
    error: null,
  });
});

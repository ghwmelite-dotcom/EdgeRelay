interface Env {
  DB: D1Database;
}

interface ProviderRow {
  id: string;
  master_account_id: string;
}

interface TradeAgg {
  total_trades: number;
  win_count: number;
  total_pnl: number;
  total_pips: number;
  total_duration_sec: number;
  gross_profit: number;
  gross_loss: number;
}

interface DailyBalance {
  day: string;
  balance: number;
}

const MIN_TRADES = 20;
const MIN_DAYS = 14;

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const { results: providers } = await env.DB.prepare(
      'SELECT id, master_account_id FROM provider_profiles',
    ).all<ProviderRow>();

    if (!providers || providers.length === 0) return;

    for (const provider of providers) {
      await computeStats(env.DB, provider);
    }
  },
};

async function computeStats(db: D1Database, provider: ProviderRow): Promise<void> {
  const accountId = provider.master_account_id;

  const agg = await db
    .prepare(
      `SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as win_count,
        COALESCE(SUM(profit), 0) as total_pnl,
        COALESCE(SUM(pips), 0) as total_pips,
        COALESCE(SUM(duration_seconds), 0) as total_duration_sec,
        COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) as gross_profit,
        COALESCE(ABS(SUM(CASE WHEN profit < 0 THEN profit ELSE 0 END)), 0) as gross_loss
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(accountId)
    .first<TradeAgg>();

  if (!agg) return;

  const totalTrades = agg.total_trades;
  const winRate = totalTrades > 0 ? (agg.win_count / totalTrades) * 100 : 0;
  const avgPips = totalTrades > 0 ? agg.total_pips / totalTrades : 0;
  const avgDuration = totalTrades > 0 ? Math.round(agg.total_duration_sec / totalTrades) : 0;
  const profitFactor = agg.gross_loss > 0 ? agg.gross_profit / agg.gross_loss : agg.gross_profit > 0 ? 999 : 0;

  const daysRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT DATE(close_time)) as active_days
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(accountId)
    .first<{ active_days: number }>();

  const activeDays = daysRow?.active_days ?? 0;

  const { results: dailyBalances } = await db
    .prepare(
      `SELECT DATE(close_time) as day, balance_at_trade as balance
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'
        AND close_time >= datetime('now', '-90 days')
      GROUP BY DATE(close_time)
      HAVING close_time = MAX(close_time)
      ORDER BY day`,
    )
    .bind(accountId)
    .all<DailyBalance>();

  const equityCurve = (dailyBalances ?? []).map((d) => ({
    date: d.day,
    balance: d.balance,
  }));

  let maxDrawdownPct = 0;
  if (equityCurve.length > 1) {
    let peak = equityCurve[0].balance;
    for (const point of equityCurve) {
      if (point.balance > peak) peak = point.balance;
      if (peak > 0) {
        const dd = ((peak - point.balance) / peak) * 100;
        if (dd > maxDrawdownPct) maxDrawdownPct = dd;
      }
    }
  }

  let sharpeRatio = 0;
  if (equityCurve.length > 2) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].balance;
      if (prev > 0) {
        dailyReturns.push((equityCurve[i].balance - prev) / prev);
      }
    }
    if (dailyReturns.length > 1) {
      const avg = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / dailyReturns.length;
      const stddev = Math.sqrt(variance);
      sharpeRatio = stddev > 0 ? (avg / stddev) * Math.sqrt(252) : 0;
    }
  }

  const subRow = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM marketplace_subscriptions
      WHERE provider_id = ? AND status = 'active'`,
    )
    .bind(provider.id)
    .first<{ cnt: number }>();

  const subscriberCount = subRow?.cnt ?? 0;

  await db
    .prepare(
      `INSERT INTO provider_stats (provider_id, total_trades, win_rate, total_pnl, avg_pips, max_drawdown_pct, sharpe_ratio, avg_trade_duration_sec, profit_factor, active_days, subscriber_count, equity_curve_json, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(provider_id) DO UPDATE SET
        total_trades = excluded.total_trades,
        win_rate = excluded.win_rate,
        total_pnl = excluded.total_pnl,
        avg_pips = excluded.avg_pips,
        max_drawdown_pct = excluded.max_drawdown_pct,
        sharpe_ratio = excluded.sharpe_ratio,
        avg_trade_duration_sec = excluded.avg_trade_duration_sec,
        profit_factor = excluded.profit_factor,
        active_days = excluded.active_days,
        subscriber_count = excluded.subscriber_count,
        equity_curve_json = excluded.equity_curve_json,
        computed_at = excluded.computed_at`,
    )
    .bind(
      provider.id,
      totalTrades,
      Math.round(winRate * 100) / 100,
      Math.round(agg.total_pnl * 100) / 100,
      Math.round(avgPips * 10) / 10,
      Math.round(maxDrawdownPct * 100) / 100,
      Math.round(sharpeRatio * 100) / 100,
      avgDuration,
      Math.round(profitFactor * 100) / 100,
      activeDays,
      subscriberCount,
      JSON.stringify(equityCurve),
    )
    .run();

  if (totalTrades < MIN_TRADES || activeDays < MIN_DAYS) {
    await db
      .prepare('UPDATE provider_profiles SET is_listed = false WHERE id = ?')
      .bind(provider.id)
      .run();
  }
}

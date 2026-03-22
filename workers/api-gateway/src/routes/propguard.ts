import { Hono } from 'hono';
import {
  type ApiResponse,
  PROP_FIRM_PRESETS,
  validatePropRuleSet,
  validateEquitySnapshot,
  validateBlockedTradeReport,
  validateEmergencyCloseReport,
} from '@edgerelay/shared';
import type { Env } from '../types.js';

export const propguard = new Hono<{ Bindings: Env }>();

// ── Helper: verify account ownership ────────────────────────────

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

// ── GET /presets ────────────────────────────────────────────────

propguard.get('/presets', (c) => {
  return c.json<ApiResponse>({ data: { presets: PROP_FIRM_PRESETS }, error: null });
});

// ── GET /rules/:accountId ──────────────────────────────────────

propguard.get('/rules/:accountId', async (c) => {
  const accountId = c.req.param('accountId');

  // Support both JWT auth (dashboard) and API key auth (EA)
  const userId = c.get('userId');
  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  const rules = await c.env.DB.prepare('SELECT * FROM prop_rules WHERE account_id = ?')
    .bind(accountId)
    .first();

  if (!rules) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No PropGuard rules configured' } },
      404,
    );
  }

  const parsed = {
    ...rules,
    allowed_symbols: JSON.parse((rules.allowed_symbols as string) || '[]'),
    blocked_symbols: JSON.parse((rules.blocked_symbols as string) || '[]'),
  };

  return c.json<ApiResponse>({ data: parsed, error: null });
});

// ── PUT /rules/:accountId ──────────────────────────────────────

propguard.put('/rules/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  const body = await c.req.json<unknown>();
  const parsed = validatePropRuleSet(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid rules',
          details: parsed.error.flatten() as Record<string, unknown>,
        },
      },
      400,
    );
  }

  const rules = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO prop_rules (
      account_id, preset_name, challenge_phase, initial_balance,
      profit_target_percent, max_daily_loss_percent, daily_loss_calculation,
      max_total_drawdown_percent, drawdown_type, trailing_drawdown_lock_at_breakeven,
      max_lot_size, max_open_positions, max_daily_trades, min_trading_days,
      consistency_rule_enabled, max_profit_from_single_day_percent,
      allowed_trading_start, allowed_trading_end,
      block_weekend_holding, block_during_news,
      news_block_minutes_before, news_block_minutes_after,
      allowed_symbols, blocked_symbols,
      warning_threshold_percent, critical_threshold_percent,
      auto_close_at_critical, challenge_start_date, challenge_end_date,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      preset_name = excluded.preset_name,
      challenge_phase = excluded.challenge_phase,
      initial_balance = excluded.initial_balance,
      profit_target_percent = excluded.profit_target_percent,
      max_daily_loss_percent = excluded.max_daily_loss_percent,
      daily_loss_calculation = excluded.daily_loss_calculation,
      max_total_drawdown_percent = excluded.max_total_drawdown_percent,
      drawdown_type = excluded.drawdown_type,
      trailing_drawdown_lock_at_breakeven = excluded.trailing_drawdown_lock_at_breakeven,
      max_lot_size = excluded.max_lot_size,
      max_open_positions = excluded.max_open_positions,
      max_daily_trades = excluded.max_daily_trades,
      min_trading_days = excluded.min_trading_days,
      consistency_rule_enabled = excluded.consistency_rule_enabled,
      max_profit_from_single_day_percent = excluded.max_profit_from_single_day_percent,
      allowed_trading_start = excluded.allowed_trading_start,
      allowed_trading_end = excluded.allowed_trading_end,
      block_weekend_holding = excluded.block_weekend_holding,
      block_during_news = excluded.block_during_news,
      news_block_minutes_before = excluded.news_block_minutes_before,
      news_block_minutes_after = excluded.news_block_minutes_after,
      allowed_symbols = excluded.allowed_symbols,
      blocked_symbols = excluded.blocked_symbols,
      warning_threshold_percent = excluded.warning_threshold_percent,
      critical_threshold_percent = excluded.critical_threshold_percent,
      auto_close_at_critical = excluded.auto_close_at_critical,
      challenge_start_date = excluded.challenge_start_date,
      challenge_end_date = excluded.challenge_end_date,
      updated_at = datetime('now')`,
  )
    .bind(
      accountId,
      rules.preset_name ?? null,
      rules.challenge_phase,
      rules.initial_balance,
      rules.profit_target_percent,
      rules.max_daily_loss_percent,
      rules.daily_loss_calculation,
      rules.max_total_drawdown_percent,
      rules.drawdown_type,
      rules.trailing_drawdown_lock_at_breakeven ? 1 : 0,
      rules.max_lot_size,
      rules.max_open_positions,
      rules.max_daily_trades,
      rules.min_trading_days,
      rules.consistency_rule_enabled ? 1 : 0,
      rules.max_profit_from_single_day_percent,
      rules.allowed_trading_start,
      rules.allowed_trading_end,
      rules.block_weekend_holding ? 1 : 0,
      rules.block_during_news ? 1 : 0,
      rules.news_block_minutes_before,
      rules.news_block_minutes_after,
      JSON.stringify(rules.allowed_symbols),
      JSON.stringify(rules.blocked_symbols),
      rules.warning_threshold_percent,
      rules.critical_threshold_percent,
      rules.auto_close_at_critical ? 1 : 0,
      rules.challenge_start_date ?? null,
      rules.challenge_end_date ?? null,
    )
    .run();

  return c.json<ApiResponse>({ data: rules, error: null });
});

// ── POST /rules/:accountId/apply-preset ────────────────────────

propguard.post('/rules/:accountId/apply-preset', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  const body = await c.req.json<{ preset_name: string; initial_balance: number }>();

  const preset = PROP_FIRM_PRESETS[body.preset_name];
  if (!preset) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INVALID_PRESET', message: `Unknown preset: ${body.preset_name}` } },
      400,
    );
  }

  // Merge preset with required fields and apply via the same upsert logic
  const fullRules = {
    ...preset,
    initial_balance: body.initial_balance,
    challenge_start_date: new Date().toISOString().split('T')[0],
  };

  const parsed = validatePropRuleSet(fullRules);
  if (!parsed.success) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Preset produced invalid rules' } },
      400,
    );
  }

  // Reuse the PUT logic inline
  const rules = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO prop_rules (
      account_id, preset_name, challenge_phase, initial_balance,
      profit_target_percent, max_daily_loss_percent, daily_loss_calculation,
      max_total_drawdown_percent, drawdown_type, trailing_drawdown_lock_at_breakeven,
      max_lot_size, max_open_positions, max_daily_trades, min_trading_days,
      consistency_rule_enabled, max_profit_from_single_day_percent,
      allowed_trading_start, allowed_trading_end,
      block_weekend_holding, block_during_news,
      news_block_minutes_before, news_block_minutes_after,
      allowed_symbols, blocked_symbols,
      warning_threshold_percent, critical_threshold_percent,
      auto_close_at_critical, challenge_start_date, challenge_end_date,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      preset_name = excluded.preset_name, challenge_phase = excluded.challenge_phase,
      initial_balance = excluded.initial_balance, profit_target_percent = excluded.profit_target_percent,
      max_daily_loss_percent = excluded.max_daily_loss_percent, daily_loss_calculation = excluded.daily_loss_calculation,
      max_total_drawdown_percent = excluded.max_total_drawdown_percent, drawdown_type = excluded.drawdown_type,
      trailing_drawdown_lock_at_breakeven = excluded.trailing_drawdown_lock_at_breakeven,
      max_lot_size = excluded.max_lot_size, max_open_positions = excluded.max_open_positions,
      max_daily_trades = excluded.max_daily_trades, min_trading_days = excluded.min_trading_days,
      consistency_rule_enabled = excluded.consistency_rule_enabled,
      max_profit_from_single_day_percent = excluded.max_profit_from_single_day_percent,
      allowed_trading_start = excluded.allowed_trading_start, allowed_trading_end = excluded.allowed_trading_end,
      block_weekend_holding = excluded.block_weekend_holding, block_during_news = excluded.block_during_news,
      news_block_minutes_before = excluded.news_block_minutes_before, news_block_minutes_after = excluded.news_block_minutes_after,
      allowed_symbols = excluded.allowed_symbols, blocked_symbols = excluded.blocked_symbols,
      warning_threshold_percent = excluded.warning_threshold_percent, critical_threshold_percent = excluded.critical_threshold_percent,
      auto_close_at_critical = excluded.auto_close_at_critical,
      challenge_start_date = excluded.challenge_start_date, challenge_end_date = excluded.challenge_end_date,
      updated_at = datetime('now')`,
  )
    .bind(
      accountId, rules.preset_name ?? null, rules.challenge_phase, rules.initial_balance,
      rules.profit_target_percent, rules.max_daily_loss_percent, rules.daily_loss_calculation,
      rules.max_total_drawdown_percent, rules.drawdown_type, rules.trailing_drawdown_lock_at_breakeven ? 1 : 0,
      rules.max_lot_size, rules.max_open_positions, rules.max_daily_trades, rules.min_trading_days,
      rules.consistency_rule_enabled ? 1 : 0, rules.max_profit_from_single_day_percent,
      rules.allowed_trading_start, rules.allowed_trading_end,
      rules.block_weekend_holding ? 1 : 0, rules.block_during_news ? 1 : 0,
      rules.news_block_minutes_before, rules.news_block_minutes_after,
      JSON.stringify(rules.allowed_symbols), JSON.stringify(rules.blocked_symbols),
      rules.warning_threshold_percent, rules.critical_threshold_percent,
      rules.auto_close_at_critical ? 1 : 0, rules.challenge_start_date ?? null, rules.challenge_end_date ?? null,
    )
    .run();

  return c.json<ApiResponse>({ data: rules, error: null });
});

// ── DELETE /rules/:accountId ───────────────────────────────────

propguard.delete('/rules/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  await c.env.DB.prepare('DELETE FROM prop_rules WHERE account_id = ?')
    .bind(accountId)
    .run();

  return c.body(null, 204);
});

// ── POST /equity/:accountId — EA equity sync ───────────────────

propguard.post('/equity/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const body = await c.req.json<unknown>();
  const parsed = validateEquitySnapshot(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid equity data' } },
      400,
    );
  }

  const snapshot = parsed.data;
  const today = new Date().toISOString().split('T')[0];

  await c.env.DB.prepare(
    `INSERT INTO daily_stats (
      account_id, date, balance_start_of_day, equity_high_of_day,
      equity_low_of_day, balance_end_of_day, daily_pnl, daily_pnl_percent,
      high_water_mark, total_drawdown_percent, trades_taken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, date) DO UPDATE SET
      equity_high_of_day = MAX(excluded.equity_high_of_day, daily_stats.equity_high_of_day),
      equity_low_of_day = MIN(excluded.equity_low_of_day, COALESCE(daily_stats.equity_low_of_day, excluded.equity_low_of_day)),
      balance_end_of_day = excluded.balance_end_of_day,
      daily_pnl = excluded.daily_pnl,
      daily_pnl_percent = excluded.daily_pnl_percent,
      high_water_mark = excluded.high_water_mark,
      total_drawdown_percent = excluded.total_drawdown_percent,
      trades_taken = excluded.trades_taken`,
  )
    .bind(
      accountId, today, snapshot.balance_start_of_day, snapshot.equity_high_of_day,
      snapshot.equity, snapshot.balance, snapshot.daily_pnl, snapshot.daily_pnl_percent,
      snapshot.high_water_mark, snapshot.total_drawdown_percent, snapshot.trades_today,
    )
    .run();

  return c.json<ApiResponse>({ data: { synced: true }, error: null });
});

// ── POST /blocked/:accountId — EA blocked trade log ────────────

propguard.post('/blocked/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const body = await c.req.json<unknown>();
  const parsed = validateBlockedTradeReport(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid blocked trade data' } },
      400,
    );
  }

  const report = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO blocked_trades (
      account_id, rule_violated, rule_details, attempted_action,
      attempted_symbol, attempted_volume, attempted_price,
      current_daily_loss_percent, current_total_drawdown_percent, current_equity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      accountId, report.rule_violated, report.rule_details, report.attempted_action,
      report.attempted_symbol, report.attempted_volume, report.attempted_price ?? null,
      report.current_daily_loss_percent ?? null, report.current_total_drawdown_percent ?? null,
      report.current_equity ?? null,
    )
    .run();

  const today = new Date().toISOString().split('T')[0];
  await c.env.DB.prepare(
    'UPDATE daily_stats SET trades_blocked = trades_blocked + 1 WHERE account_id = ? AND date = ?',
  )
    .bind(accountId, today)
    .run();

  return c.json<ApiResponse>({ data: { logged: true }, error: null }, 201);
});

// ── POST /emergency/:accountId — EA emergency close log ────────

propguard.post('/emergency/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const body = await c.req.json<unknown>();
  const parsed = validateEmergencyCloseReport(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid emergency report' } },
      400,
    );
  }

  const report = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO blocked_trades (
      account_id, rule_violated, rule_details, attempted_action,
      attempted_symbol, attempted_volume, current_equity
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      accountId, 'emergency_close', report.reason, 'emergency_close_all',
      'ALL', report.positions_closed, report.equity_at_close,
    )
    .run();

  const today = new Date().toISOString().split('T')[0];
  await c.env.DB.prepare(
    'UPDATE daily_stats SET critical_events = critical_events + 1 WHERE account_id = ? AND date = ?',
  )
    .bind(accountId, today)
    .run();

  return c.json<ApiResponse>({ data: { logged: true }, error: null }, 201);
});

// ── GET /blocked/:accountId — blocked trade history ────────────

propguard.get('/blocked/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = parseInt(c.req.query('offset') ?? '0');

  const result = await c.env.DB.prepare(
    'SELECT * FROM blocked_trades WHERE account_id = ? ORDER BY blocked_at DESC LIMIT ? OFFSET ?',
  )
    .bind(accountId, limit, offset)
    .all();

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM blocked_trades WHERE account_id = ?',
  )
    .bind(accountId)
    .first<{ total: number }>();

  return c.json<ApiResponse>({
    data: { blocked_trades: result.results, total: countResult?.total ?? 0 },
    error: null,
  });
});

// ── GET /daily-stats/:accountId ────────────────────────────────

propguard.get('/daily-stats/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  if (userId) {
    const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
    if (!owns) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404,
      );
    }
  }

  const from = c.req.query('from') ?? '2020-01-01';
  const to = c.req.query('to') ?? new Date().toISOString().split('T')[0];

  const result = await c.env.DB.prepare(
    'SELECT * FROM daily_stats WHERE account_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
  )
    .bind(accountId, from, to)
    .all();

  return c.json<ApiResponse>({ data: { stats: result.results }, error: null });
});

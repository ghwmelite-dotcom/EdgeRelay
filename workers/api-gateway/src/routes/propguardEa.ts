/**
 * PropGuard EA-facing endpoints — authenticated via X-API-Key header (not JWT).
 * These are called by the MQL5 Follower EA for equity sync, blocked trade logging,
 * and emergency close reporting.
 */
import { Hono } from 'hono';
import {
  type ApiResponse,
  validateEquitySnapshot,
  validateBlockedTradeReport,
  validateEmergencyCloseReport,
} from '@edgerelay/shared';
import type { Env } from '../types.js';

export const propguardEa = new Hono<{ Bindings: Env }>();

// ── API Key verification middleware ──────────────────────────

async function verifyApiKey(
  db: D1Database,
  apiKey: string,
): Promise<{ id: string; role: string } | null> {
  return db
    .prepare('SELECT id, role FROM accounts WHERE api_key = ? AND is_active = 1 LIMIT 1')
    .bind(apiKey)
    .first<{ id: string; role: string }>();
}

// ── POST /equity/:accountId — EA equity sync ────────────────

propguardEa.post('/equity/:accountId', async (c) => {
  try {
    const accountId = c.req.param('accountId');
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'X-API-Key header required' } },
        401,
      );
    }

    const account = await verifyApiKey(c.env.DB, apiKey);
    if (!account || account.id !== accountId) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid API key or account mismatch' } },
        401,
      );
    }

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Equity sync error:', msg);
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: msg } },
      500,
    );
  }
});

// ── POST /blocked/:accountId — EA blocked trade log ─────────

propguardEa.post('/blocked/:accountId', async (c) => {
  try {
    const accountId = c.req.param('accountId');
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'X-API-Key header required' } },
        401,
      );
    }

    const account = await verifyApiKey(c.env.DB, apiKey);
    if (!account || account.id !== accountId) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid API key or account mismatch' } },
        401,
      );
    }

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Blocked trade log error:', msg);
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: msg } },
      500,
    );
  }
});

// ── POST /emergency/:accountId — EA emergency close log ─────

propguardEa.post('/emergency/:accountId', async (c) => {
  try {
    const accountId = c.req.param('accountId');
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'X-API-Key header required' } },
        401,
      );
    }

    const account = await verifyApiKey(c.env.DB, apiKey);
    if (!account || account.id !== accountId) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid API key or account mismatch' } },
        401,
      );
    }

    const body = await c.req.json<unknown>();
    const parsed = validateEmergencyCloseReport(body);

    if (!parsed.success) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid emergency close data' } },
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Emergency close log error:', msg);
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: msg } },
      500,
    );
  }
});

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { evaluateHealth, mapDailyLossType } from '../lib/healthEngine.js';
import type { HealthInput } from '../lib/healthEngine.js';

export const command = new Hono<{ Bindings: Env }>();

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

// ── Helper: build HealthInput from DB rows ──────────────────

interface PropRulesRow {
  firm_template_id: string | null;
  template_version: number | null;
  initial_balance: number;
  challenge_start_date: string | null;
}

interface FirmTemplateRow {
  id: string;
  firm_name: string;
  plan_name: string;
  challenge_phase: string;
  initial_balance: number;
  profit_target_percent: number | null;
  profit_target_amount: number | null;
  daily_loss_percent: number;
  max_drawdown_percent: number;
  max_drawdown_amount: number | null;
  daily_loss_type: string;
  drawdown_type: string;
  min_trading_days: number | null;
  max_calendar_days: number | null;
  version: number;
}

interface DailyStatsRow {
  date: string;
  balance_start_of_day: number | null;
  balance_end_of_day: number | null;
  equity_high_of_day: number | null;
  daily_pnl: number | null;
  high_water_mark: number | null;
  trades_taken: number | null;
}

function buildHealthInput(
  propRules: PropRulesRow,
  template: FirmTemplateRow,
  stats: DailyStatsRow | null,
  tradingDaysCount: number,
): HealthInput {
  const balance = stats?.balance_end_of_day ?? propRules.initial_balance;
  const equity = balance; // best estimate without live data
  const dailyPnl = stats?.daily_pnl ?? 0;
  const hwm = stats?.high_water_mark ?? propRules.initial_balance;
  const totalPnl = balance - template.initial_balance;

  return {
    current_balance: balance,
    current_equity: equity,
    starting_balance: propRules.initial_balance,
    daily_pnl: dailyPnl,
    total_pnl: totalPnl,
    high_water_mark: hwm,
    initial_balance: template.initial_balance,
    daily_loss_percent: template.daily_loss_percent,
    max_drawdown_percent: template.max_drawdown_percent,
    max_drawdown_amount: template.max_drawdown_amount,
    daily_loss_type: template.daily_loss_type,
    drawdown_type: template.drawdown_type,
    profit_target_percent: template.profit_target_percent,
    profit_target_amount: template.profit_target_amount,
    min_trading_days: template.min_trading_days,
    max_calendar_days: template.max_calendar_days,
    start_date: propRules.challenge_start_date,
    trading_days_completed: tradingDaysCount,
  };
}

// ── GET /health/:accountId — Evaluate single account health ──

command.get('/health/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  // Get prop_rules for this account
  const propRules = await c.env.DB.prepare(
    `SELECT firm_template_id, template_version, initial_balance, challenge_start_date
     FROM prop_rules WHERE account_id = ?`,
  )
    .bind(accountId)
    .first<PropRulesRow>();

  if (!propRules?.firm_template_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Account not linked to a firm template' } },
      400,
    );
  }

  // Get the firm template
  const template = await c.env.DB.prepare(
    `SELECT id, firm_name, plan_name, challenge_phase, initial_balance,
            profit_target_percent, profit_target_amount,
            daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
            daily_loss_type, drawdown_type,
            min_trading_days, max_calendar_days, version
     FROM firm_templates WHERE id = ?`,
  )
    .bind(propRules.firm_template_id)
    .first<FirmTemplateRow>();

  if (!template) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Linked firm template no longer exists' } },
      404,
    );
  }

  // Get latest daily_stats
  const latestStats = await c.env.DB.prepare(
    `SELECT date, balance_start_of_day, balance_end_of_day, equity_high_of_day,
            daily_pnl, high_water_mark, trades_taken
     FROM daily_stats WHERE account_id = ? ORDER BY date DESC LIMIT 1`,
  )
    .bind(accountId)
    .first<DailyStatsRow>();

  // Count trading days
  const tradingDaysResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM daily_stats WHERE account_id = ? AND trades_taken > 0`,
  )
    .bind(accountId)
    .first<{ cnt: number }>();

  const tradingDays = tradingDaysResult?.cnt ?? 0;

  const input = buildHealthInput(propRules, template, latestStats ?? null, tradingDays);
  const health = evaluateHealth(input);

  return c.json<ApiResponse>({
    data: {
      account_id: accountId,
      firm_name: template.firm_name,
      plan_name: template.plan_name,
      health,
    },
    error: null,
  });
});

// ── GET /health — Evaluate ALL accounts for authenticated user ──

command.get('/health', async (c) => {
  const userId = c.get('userId');

  // Get all accounts for user
  const accountsResult = await c.env.DB.prepare(
    `SELECT a.id, a.alias FROM accounts a WHERE a.user_id = ?`,
  )
    .bind(userId)
    .all<{ id: string; alias: string | null }>();

  const accounts: Array<{
    account_id: string;
    alias: string | null;
    firm_name: string;
    plan_name: string;
    health: ReturnType<typeof evaluateHealth>;
  }> = [];

  for (const account of accountsResult.results) {
    // Check if account has a linked firm template
    const propRules = await c.env.DB.prepare(
      `SELECT firm_template_id, template_version, initial_balance, challenge_start_date
       FROM prop_rules WHERE account_id = ?`,
    )
      .bind(account.id)
      .first<PropRulesRow>();

    if (!propRules?.firm_template_id) continue;

    const template = await c.env.DB.prepare(
      `SELECT id, firm_name, plan_name, challenge_phase, initial_balance,
              profit_target_percent, profit_target_amount,
              daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
              daily_loss_type, drawdown_type,
              min_trading_days, max_calendar_days, version
       FROM firm_templates WHERE id = ?`,
    )
      .bind(propRules.firm_template_id)
      .first<FirmTemplateRow>();

    if (!template) continue;

    const latestStats = await c.env.DB.prepare(
      `SELECT date, balance_start_of_day, balance_end_of_day, equity_high_of_day,
              daily_pnl, high_water_mark, trades_taken
       FROM daily_stats WHERE account_id = ? ORDER BY date DESC LIMIT 1`,
    )
      .bind(account.id)
      .first<DailyStatsRow>();

    const tradingDaysResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM daily_stats WHERE account_id = ? AND trades_taken > 0`,
    )
      .bind(account.id)
      .first<{ cnt: number }>();

    const tradingDays = tradingDaysResult?.cnt ?? 0;
    const input = buildHealthInput(propRules, template, latestStats ?? null, tradingDays);
    const health = evaluateHealth(input);

    accounts.push({
      account_id: account.id,
      alias: account.alias,
      firm_name: template.firm_name,
      plan_name: template.plan_name,
      health,
    });
  }

  return c.json<ApiResponse>({
    data: { accounts },
    error: null,
  });
});

// ── POST /link/:accountId — Link account to firm template ──

command.post('/link/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const userId = c.get('userId');

  const owns = await verifyAccountOwnership(c.env.DB, accountId, userId);
  if (!owns) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Account not found or not owned by user' } },
      403,
    );
  }

  const body = await c.req.json() as Record<string, unknown>;
  const template_id = typeof body.template_id === 'string' && body.template_id.length > 0
    ? body.template_id
    : null;

  if (!template_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'template_id is required' } },
      400,
    );
  }

  // Get the firm template (must exist and be verified)
  const template = await c.env.DB.prepare(
    `SELECT id, firm_name, plan_name, challenge_phase, initial_balance,
            profit_target_percent, profit_target_amount,
            daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
            daily_loss_type, drawdown_type,
            min_trading_days, max_calendar_days,
            news_trading_restricted, news_minutes_before, news_minutes_after,
            weekend_holding_allowed, max_lot_size,
            consistency_rule, max_daily_profit_percent,
            version
     FROM firm_templates WHERE id = ? AND verified = 1`,
  )
    .bind(template_id)
    .first<FirmTemplateRow & {
      news_trading_restricted: number;
      news_minutes_before: number;
      news_minutes_after: number;
      weekend_holding_allowed: number;
      max_lot_size: number | null;
      consistency_rule: number;
      max_daily_profit_percent: number | null;
    }>();

  if (!template) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Firm template not found or not verified' } },
      404,
    );
  }

  // Map template values to prop_rules columns
  const dailyLossCalc = mapDailyLossType(template.daily_loss_type);
  const effectiveDrawdownPercent = template.max_drawdown_amount
    ? (template.max_drawdown_amount / template.initial_balance) * 100
    : template.max_drawdown_percent;

  // UPSERT prop_rules
  await c.env.DB.prepare(
    `INSERT INTO prop_rules (
       account_id, preset_name, challenge_phase, initial_balance,
       profit_target_percent, max_daily_loss_percent, daily_loss_calculation,
       max_total_drawdown_percent, drawdown_type,
       max_lot_size, min_trading_days,
       consistency_rule_enabled, max_profit_from_single_day_percent,
       block_weekend_holding, block_during_news,
       news_block_minutes_before, news_block_minutes_after,
       firm_template_id, template_version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       preset_name = excluded.preset_name,
       challenge_phase = excluded.challenge_phase,
       initial_balance = excluded.initial_balance,
       profit_target_percent = excluded.profit_target_percent,
       max_daily_loss_percent = excluded.max_daily_loss_percent,
       daily_loss_calculation = excluded.daily_loss_calculation,
       max_total_drawdown_percent = excluded.max_total_drawdown_percent,
       drawdown_type = excluded.drawdown_type,
       max_lot_size = excluded.max_lot_size,
       min_trading_days = excluded.min_trading_days,
       consistency_rule_enabled = excluded.consistency_rule_enabled,
       max_profit_from_single_day_percent = excluded.max_profit_from_single_day_percent,
       block_weekend_holding = excluded.block_weekend_holding,
       block_during_news = excluded.block_during_news,
       news_block_minutes_before = excluded.news_block_minutes_before,
       news_block_minutes_after = excluded.news_block_minutes_after,
       firm_template_id = excluded.firm_template_id,
       template_version = excluded.template_version,
       updated_at = datetime('now')`,
  )
    .bind(
      accountId,
      `${template.firm_name} - ${template.plan_name}`,
      template.challenge_phase,
      template.initial_balance,
      template.profit_target_percent,
      template.daily_loss_percent,
      dailyLossCalc,
      effectiveDrawdownPercent,
      template.drawdown_type,
      template.max_lot_size,
      template.min_trading_days ?? 0,
      template.consistency_rule ? 1 : 0,
      template.max_daily_profit_percent ?? 30.0,
      template.weekend_holding_allowed ? 0 : 1, // inverted: template says "allowed", prop_rules says "block"
      template.news_trading_restricted ? 1 : 0,
      template.news_minutes_before,
      template.news_minutes_after,
      template.id,
      template.version,
    )
    .run();

  return c.json<ApiResponse>({
    data: {
      linked: true,
      firm_name: template.firm_name,
      plan_name: template.plan_name,
    },
    error: null,
  });
});

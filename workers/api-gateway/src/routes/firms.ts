import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import { FirmTemplateSubmission } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

export const firms = new Hono<{ Bindings: Env }>();

// ── GET / — List unique firm names with plan count (public) ──

firms.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT firm_name, COUNT(*) as plan_count
     FROM firm_templates
     WHERE verified = 1
     GROUP BY firm_name
     ORDER BY firm_name`,
  ).all<{ firm_name: string; plan_count: number }>();

  return c.json<ApiResponse>({
    data: { firms: result.results },
    error: null,
  });
});

// ── GET /:firmName/templates — List all templates for a firm (public) ──

firms.get('/:firmName/templates', async (c) => {
  const firmName = decodeURIComponent(c.req.param('firmName'));

  const result = await c.env.DB.prepare(
    `SELECT id, firm_name, plan_name, challenge_phase, initial_balance,
            profit_target_percent, profit_target_amount,
            daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
            daily_loss_type, drawdown_type,
            min_trading_days, max_calendar_days,
            news_trading_restricted, news_minutes_before, news_minutes_after,
            weekend_holding_allowed, max_lot_size,
            consistency_rule, max_daily_profit_percent,
            source_url, verified, version
     FROM firm_templates
     WHERE firm_name = ? AND verified = 1
     ORDER BY initial_balance, challenge_phase`,
  )
    .bind(firmName)
    .all();

  return c.json<ApiResponse>({
    data: { templates: result.results },
    error: null,
  });
});

// ── GET /templates/:templateId — Single template by ID (public) ──

firms.get('/templates/:templateId', async (c) => {
  const templateId = c.req.param('templateId');

  const template = await c.env.DB.prepare(
    `SELECT id, firm_name, plan_name, challenge_phase, initial_balance,
            profit_target_percent, profit_target_amount,
            daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
            daily_loss_type, drawdown_type,
            min_trading_days, max_calendar_days,
            news_trading_restricted, news_minutes_before, news_minutes_after,
            weekend_holding_allowed, max_lot_size,
            consistency_rule, max_daily_profit_percent,
            source_url, verified, version
     FROM firm_templates
     WHERE id = ?`,
  )
    .bind(templateId)
    .first();

  if (!template) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Template not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({ data: template, error: null });
});

// ── POST /templates — Submit new template (auth required) ──

firms.post('/templates', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const parsed = FirmTemplateSubmission.safeParse(body);
  if (!parsed.success) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      400,
    );
  }

  const t = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO firm_templates (
       firm_name, plan_name, challenge_phase, initial_balance,
       profit_target_percent, profit_target_amount,
       daily_loss_percent, max_drawdown_percent, max_drawdown_amount,
       daily_loss_type, drawdown_type,
       min_trading_days, max_calendar_days,
       news_trading_restricted, news_minutes_before, news_minutes_after,
       weekend_holding_allowed, max_lot_size,
       consistency_rule, max_daily_profit_percent,
       source_url, verified, submitted_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  )
    .bind(
      t.firm_name,
      t.plan_name,
      t.challenge_phase,
      t.initial_balance,
      t.profit_target_percent ?? null,
      t.profit_target_amount ?? null,
      t.daily_loss_percent,
      t.max_drawdown_percent,
      t.max_drawdown_amount ?? null,
      t.daily_loss_type,
      t.drawdown_type,
      t.min_trading_days ?? null,
      t.max_calendar_days ?? null,
      t.news_trading_restricted ? 1 : 0,
      t.news_minutes_before,
      t.news_minutes_after,
      t.weekend_holding_allowed ? 1 : 0,
      t.max_lot_size ?? null,
      t.consistency_rule ? 1 : 0,
      t.max_daily_profit_percent ?? null,
      t.source_url,
      userId,
    )
    .run();

  return c.json<ApiResponse>(
    { data: { submitted: true }, error: null },
    201,
  );
});

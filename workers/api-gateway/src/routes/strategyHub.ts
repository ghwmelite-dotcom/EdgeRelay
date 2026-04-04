import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const strategyHub = new Hono<{ Bindings: Env }>();
export const strategyHubPublic = new Hono<{ Bindings: Env }>();

// ── Helpers ─────────────────────────────────────────────────────

/** Deterministic magic number from a slug string */
function magicFromSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 900000 + 100000; // 6-digit number
}

interface ParamSchema {
  key: string;
  label: string;
  type: 'int' | 'double' | 'bool' | 'enum';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  labels?: string[];
  tooltip?: string;
}

function validateParam(schema: ParamSchema, value: unknown): { valid: boolean; coerced: unknown; error?: string } {
  switch (schema.type) {
    case 'int': {
      const n = Number(value);
      if (!Number.isInteger(n)) return { valid: false, coerced: null, error: `${schema.key} must be an integer` };
      if (schema.min !== undefined && n < schema.min) return { valid: false, coerced: null, error: `${schema.key} must be >= ${schema.min}` };
      if (schema.max !== undefined && n > schema.max) return { valid: false, coerced: null, error: `${schema.key} must be <= ${schema.max}` };
      return { valid: true, coerced: n };
    }
    case 'double': {
      const n = Number(value);
      if (isNaN(n)) return { valid: false, coerced: null, error: `${schema.key} must be a number` };
      if (schema.min !== undefined && n < schema.min) return { valid: false, coerced: null, error: `${schema.key} must be >= ${schema.min}` };
      if (schema.max !== undefined && n > schema.max) return { valid: false, coerced: null, error: `${schema.key} must be <= ${schema.max}` };
      return { valid: true, coerced: n };
    }
    case 'bool': {
      if (typeof value === 'boolean') return { valid: true, coerced: value };
      if (value === 'true' || value === 1) return { valid: true, coerced: true };
      if (value === 'false' || value === 0) return { valid: true, coerced: false };
      return { valid: false, coerced: null, error: `${schema.key} must be a boolean` };
    }
    case 'enum': {
      if (!schema.options?.includes(String(value))) {
        return { valid: false, coerced: null, error: `${schema.key} must be one of: ${schema.options?.join(', ')}` };
      }
      return { valid: true, coerced: String(value) };
    }
    default:
      return { valid: true, coerced: value };
  }
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════════

// ── GET /strategy-hub/strategies — List all published strategies ─
strategyHubPublic.get('/strategies', async (c) => {
  const category = c.req.query('category');
  const difficulty = c.req.query('difficulty');

  let whereClause = 'WHERE is_published = true';
  const binds: unknown[] = [];

  if (category && ['trend', 'reversal', 'breakout', 'scalp', 'swing'].includes(category)) {
    whereClause += ' AND category = ?';
    binds.push(category);
  }
  if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    whereClause += ' AND difficulty = ?';
    binds.push(difficulty);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json, is_published, created_at
     FROM strategy_templates
     ${whereClause}
     ORDER BY
       CASE difficulty WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 END,
       name ASC`,
  )
    .bind(...binds)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});

// ── GET /strategy-hub/strategies/:slug — Single strategy detail ──
strategyHubPublic.get('/strategies/:slug', async (c) => {
  const slug = c.req.param('slug');

  const strategy = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json, is_published, created_at
     FROM strategy_templates
     WHERE slug = ? AND is_published = true`,
  )
    .bind(slug)
    .first();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({ data: strategy, error: null });
});

// ══════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (auth required)
// ══════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────
const FREE_GENERATIONS = 3;
const PRICE_PER_GENERATION = 1.99;

// Admin/exempt accounts — unlimited generations
const EXEMPT_EMAILS = ['oh84dev@gmail.com'];

/** Check if user email is in the exempt list. */
async function isExemptUser(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  return user ? EXEMPT_EMAILS.includes(user.email) : false;
}

/** Get total generated count and purchased credits for a user. */
async function getGenerationCounts(db: D1Database, userId: string) {
  const [genRow, creditRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as cnt FROM ea_generations WHERE user_id = ?').bind(userId).first<{ cnt: number }>(),
    db.prepare('SELECT COUNT(*) as cnt FROM ea_generation_credits WHERE user_id = ?').bind(userId).first<{ cnt: number }>(),
  ]);
  const totalGenerated = genRow?.cnt ?? 0;
  const totalCredits = creditRow?.cnt ?? 0;
  const allowed = FREE_GENERATIONS + totalCredits;
  const freeRemaining = Math.max(0, allowed - totalGenerated);
  return { totalGenerated, totalCredits, allowed, freeRemaining };
}

// ── GET /strategy-hub/generation-status — Check free/paid status ─
strategyHub.get('/generation-status', async (c) => {
  const userId = c.get('userId');

  // Admin exemption — unlimited generations
  if (await isExemptUser(c.env.DB, userId)) {
    return c.json<ApiResponse>({
      data: {
        total_generated: 0,
        free_remaining: 999,
        free_limit: FREE_GENERATIONS,
        price_per_generation: PRICE_PER_GENERATION,
        requires_payment: false,
        exempt: true,
      },
      error: null,
    });
  }

  const { totalGenerated, freeRemaining } = await getGenerationCounts(c.env.DB, userId);

  return c.json<ApiResponse>({
    data: {
      total_generated: totalGenerated,
      free_remaining: freeRemaining,
      free_limit: FREE_GENERATIONS,
      price_per_generation: PRICE_PER_GENERATION,
      requires_payment: freeRemaining <= 0,
    },
    error: null,
  });
});

// ── Helpers for optimize (reused from analytics pattern) ─────────

async function getUserAccountIds(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = true')
    .bind(userId)
    .all<{ id: string }>();
  return results?.map((r) => r.id) ?? [];
}

function inClause(ids: string[]): { placeholders: string; values: string[] } {
  return {
    placeholders: ids.map(() => '?').join(','),
    values: ids,
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── POST /strategy-hub/optimize — AI Strategy Optimizer ──────────

strategyHub.post('/optimize', async (c) => {
  const userId = c.get('userId');

  const body = await c.req.json<{ generation_id: string }>();
  if (!body.generation_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'generation_id is required' } },
      400,
    );
  }

  // 1. Look up the generation record
  const generation = await c.env.DB.prepare(
    'SELECT id, strategy_id, parameters_json FROM ea_generations WHERE id = ? AND user_id = ?',
  )
    .bind(body.generation_id, userId)
    .first<{ id: string; strategy_id: string; parameters_json: string }>();

  if (!generation) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Generation not found' } },
      404,
    );
  }

  // 2. Look up the strategy template
  const strategy = await c.env.DB.prepare(
    'SELECT id, name, slug, parameters_json FROM strategy_templates WHERE id = ?',
  )
    .bind(generation.strategy_id)
    .first<{ id: string; name: string; slug: string; parameters_json: string }>();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy template not found' } },
      404,
    );
  }

  // 3. Get user's account IDs
  const accountIds = await getUserAccountIds(c.env.DB, userId);
  if (accountIds.length === 0) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NO_DATA', message: 'No active accounts found. Set up an account first.' } },
      404,
    );
  }

  const { placeholders, values } = inClause(accountIds);
  const baseWhere = `account_id IN (${placeholders}) AND deal_entry = 'out'`;

  // 4. Check minimum trade count
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM journal_trades WHERE ${baseWhere}`,
  ).bind(...values).first<{ cnt: number }>();

  const totalTrades = countRow?.cnt ?? 0;
  if (totalTrades < 10) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INSUFFICIENT_DATA', message: 'Need at least 10 closed trades to optimize' } },
      400,
    );
  }

  // 5. Compute analysis stats — all aggregate queries in parallel
  const [
    { results: bySession },
    { results: byDay },
    { results: bySymbol },
    overallStats,
    { results: streakTrades },
    durationStats,
  ] = await Promise.all([
    // By session
    c.env.DB.prepare(
      `SELECT session_tag as session,
              COUNT(*) as trades,
              COALESCE(SUM(profit), 0) as pnl,
              ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
       FROM journal_trades WHERE ${baseWhere}
       GROUP BY session_tag ORDER BY pnl DESC`,
    ).bind(...values).all(),

    // By day of week
    c.env.DB.prepare(
      `SELECT CAST(strftime('%w', datetime(time, 'unixepoch')) AS INTEGER) as day_num,
              COUNT(*) as trades,
              COALESCE(SUM(profit), 0) as pnl,
              ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
       FROM journal_trades WHERE ${baseWhere}
       GROUP BY day_num ORDER BY day_num`,
    ).bind(...values).all(),

    // By symbol
    c.env.DB.prepare(
      `SELECT symbol,
              COUNT(*) as trades,
              COALESCE(SUM(profit), 0) as pnl,
              ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
       FROM journal_trades WHERE ${baseWhere}
       GROUP BY symbol ORDER BY pnl DESC`,
    ).bind(...values).all(),

    // Overall stats
    c.env.DB.prepare(
      `SELECT COUNT(*) as total_trades,
              COALESCE(SUM(profit), 0) as total_pnl,
              ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate,
              ROUND(AVG(CASE WHEN profit > 0 THEN profit END), 2) as avg_winner,
              ROUND(AVG(CASE WHEN profit < 0 THEN profit END), 2) as avg_loser,
              COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) as gross_profit,
              COALESCE(ABS(SUM(CASE WHEN profit < 0 THEN profit ELSE 0 END)), 0) as gross_loss
       FROM journal_trades WHERE ${baseWhere}`,
    ).bind(...values).first<{
      total_trades: number; total_pnl: number; win_rate: number;
      avg_winner: number; avg_loser: number; gross_profit: number; gross_loss: number;
    }>(),

    // Win/loss streak data (just profit column ordered by time)
    c.env.DB.prepare(
      `SELECT profit FROM journal_trades WHERE ${baseWhere} ORDER BY time ASC`,
    ).bind(...values).all<{ profit: number }>(),

    // Trade duration: avg duration of winners vs losers
    c.env.DB.prepare(
      `SELECT
        ROUND(AVG(CASE WHEN profit > 0 THEN duration_seconds END)) as avg_winner_duration,
        ROUND(AVG(CASE WHEN profit < 0 THEN duration_seconds END)) as avg_loser_duration
       FROM journal_trades WHERE ${baseWhere} AND duration_seconds IS NOT NULL`,
    ).bind(...values).first<{ avg_winner_duration: number | null; avg_loser_duration: number | null }>(),
  ]);

  // Compute win/loss streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  for (const t of streakTrades ?? []) {
    if (t.profit > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  }

  const profitFactor = (overallStats?.gross_loss ?? 0) > 0
    ? Math.round(((overallStats?.gross_profit ?? 0) / (overallStats?.gross_loss ?? 1)) * 100) / 100
    : (overallStats?.gross_profit ?? 0) > 0 ? 999 : 0;

  const expectancy = totalTrades > 0
    ? Math.round(((overallStats?.total_pnl ?? 0) / totalTrades) * 100) / 100
    : 0;

  const avgWinner = overallStats?.avg_winner ?? 0;
  const avgLoser = overallStats?.avg_loser ?? 0;
  const riskReward = avgLoser !== 0 ? Math.round((Math.abs(avgWinner) / Math.abs(avgLoser)) * 100) / 100 : 0;

  const stats = {
    overall: {
      total_trades: totalTrades,
      total_pnl: overallStats?.total_pnl ?? 0,
      win_rate: overallStats?.win_rate ?? 0,
      profit_factor: profitFactor,
      expectancy,
    },
    sl_tp_effectiveness: {
      avg_winner: avgWinner,
      avg_loser: avgLoser,
      risk_reward_ratio: riskReward,
    },
    streaks: {
      max_consecutive_wins: maxWinStreak,
      max_consecutive_losses: maxLossStreak,
    },
    duration: {
      avg_winner_seconds: durationStats?.avg_winner_duration ?? null,
      avg_loser_seconds: durationStats?.avg_loser_duration ?? null,
    },
    by_session: bySession ?? [],
    by_day: (byDay ?? []).map((d: Record<string, unknown>) => ({
      day: DAY_NAMES[(d.day_num as number) ?? 0],
      ...d,
    })),
    by_symbol: bySymbol ?? [],
  };

  const currentParams = JSON.parse(generation.parameters_json);
  const paramSchema: ParamSchema[] = JSON.parse(strategy.parameters_json);

  // 6. Build AI prompt
  const systemPrompt = `You are an expert forex EA optimizer. You are given a trader's current EA parameters and their actual trading results. Analyze the performance data and recommend specific parameter changes to improve profitability and stability.

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "One paragraph overall assessment of current performance",
  "recommendations": [
    {
      "param_key": "SL_PIPS",
      "current_value": 50,
      "recommended_value": 75,
      "reason": "68% of losing trades reversed within 5 pips of SL. Widening to 75 pips would have saved 12 trades worth $340."
    }
  ],
  "projected_improvement": {
    "estimated_win_rate_change": "+8%",
    "estimated_pf_change": "+0.4",
    "confidence": "medium"
  }
}

Rules:
- Only recommend changes to parameters that exist in the schema
- Respect min/max ranges from the schema
- Use specific numbers from the trading data to justify each recommendation
- Maximum 6 recommendations
- Be conservative — small changes that are well-supported by data
- If performance is already good, say so and suggest minor tweaks`;

  const userPrompt = JSON.stringify({
    strategy_name: strategy.name,
    current_parameters: currentParams,
    parameter_schema: paramSchema.map((p) => ({
      key: p.key,
      label: p.label,
      type: p.type,
      current_value: currentParams[p.key],
      min: p.min,
      max: p.max,
      options: p.options,
      tooltip: p.tooltip,
    })),
    trading_stats: stats,
  }, null, 2);

  let result: { summary: string; recommendations: unknown[]; projected_improvement: unknown } | null = null;
  let modelUsed = '';

  // 7. Call Workers AI
  try {
    const aiResponse = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as Parameters<typeof c.env.AI.run>[0],
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
      },
    );

    const text = typeof aiResponse === 'string'
      ? aiResponse
      : (aiResponse as { response?: string }).response ?? '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && Array.isArray(parsed.recommendations)) {
        result = parsed;
        modelUsed = 'llama-3.3-70b-instruct-fp8-fast';
      }
    }
  } catch {
    // Fall through to fallback
  }

  // 8. Fallback template recommendations
  if (!result) {
    modelUsed = 'template-fallback';
    const recommendations: { param_key: string; current_value: unknown; recommended_value: unknown; reason: string }[] = [];
    const winRate = overallStats?.win_rate ?? 0;

    // If win rate < 50%: recommend widening SL by 20%
    if (winRate < 50 && currentParams.SL_PIPS != null) {
      const slSchema = paramSchema.find((p) => p.key === 'SL_PIPS');
      const currentSL = Number(currentParams.SL_PIPS);
      const newSL = Math.round(currentSL * 1.2);
      const clampedSL = slSchema?.max ? Math.min(newSL, slSchema.max) : newSL;
      recommendations.push({
        param_key: 'SL_PIPS',
        current_value: currentSL,
        recommended_value: clampedSL,
        reason: `Win rate is ${winRate}%. Widening stop loss by 20% may prevent premature exits.`,
      });
    }

    // If avg loser > 2x avg winner: tighten SL or widen TP
    if (Math.abs(avgLoser) > 2 * Math.abs(avgWinner) && currentParams.TP_PIPS != null) {
      const tpSchema = paramSchema.find((p) => p.key === 'TP_PIPS');
      const currentTP = Number(currentParams.TP_PIPS);
      const newTP = Math.round(currentTP * 1.3);
      const clampedTP = tpSchema?.max ? Math.min(newTP, tpSchema.max) : newTP;
      recommendations.push({
        param_key: 'TP_PIPS',
        current_value: currentTP,
        recommended_value: clampedTP,
        reason: `Average loser ($${Math.abs(avgLoser).toFixed(2)}) is more than 2x average winner ($${avgWinner.toFixed(2)}). Widening TP may improve risk-reward.`,
      });
    }

    // If one session is negative: recommend enabling session filter
    const negativeSession = (bySession ?? []).find((s: Record<string, unknown>) => (s.pnl as number) < 0);
    if (negativeSession && currentParams.USE_SESSION_FILTER !== undefined) {
      recommendations.push({
        param_key: 'USE_SESSION_FILTER',
        current_value: currentParams.USE_SESSION_FILTER,
        recommended_value: true,
        reason: `${String(negativeSession.session)} session is losing money (${negativeSession.pnl} P&L). Enable session filter to avoid unprofitable hours.`,
      });
    }

    // If consecutive losses > 5: recommend reducing lot size
    if (maxLossStreak > 5 && currentParams.LOT_SIZE != null) {
      const lotSchema = paramSchema.find((p) => p.key === 'LOT_SIZE');
      const currentLot = Number(currentParams.LOT_SIZE);
      const newLot = Math.round(currentLot * 0.7 * 100) / 100;
      const clampedLot = lotSchema?.min ? Math.max(newLot, lotSchema.min) : newLot;
      recommendations.push({
        param_key: 'LOT_SIZE',
        current_value: currentLot,
        recommended_value: clampedLot,
        reason: `Max consecutive losses is ${maxLossStreak}. Reducing lot size by 30% will limit drawdown during losing streaks.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        param_key: 'LOT_SIZE',
        current_value: currentParams.LOT_SIZE ?? 0.01,
        recommended_value: currentParams.LOT_SIZE ?? 0.01,
        reason: 'Performance looks reasonable. Consider maintaining current settings and collecting more data.',
      });
    }

    result = {
      summary: `Analysis of ${totalTrades} trades shows a ${winRate}% win rate with profit factor ${profitFactor}. ${winRate >= 50 ? 'Performance is acceptable' : 'Win rate needs improvement'}. ${maxLossStreak > 5 ? `Max losing streak of ${maxLossStreak} suggests risk management adjustments.` : ''}`,
      recommendations,
      projected_improvement: {
        estimated_win_rate_change: winRate < 50 ? '+5-10%' : '+1-3%',
        estimated_pf_change: profitFactor < 1.5 ? '+0.2-0.5' : '+0.1-0.2',
        confidence: 'low',
      },
    };
  }

  return c.json<ApiResponse>({
    data: {
      summary: result.summary,
      recommendations: result.recommendations,
      projected_improvement: result.projected_improvement,
      current_params: currentParams,
      stats,
      model: modelUsed,
    },
    error: null,
  });
});

// ── POST /strategy-hub/generate — Generate an EA .mq5 file ──────
strategyHub.post('/generate', async (c) => {
  const userId = c.get('userId');

  // Admin exemption — skip limit check entirely
  const exempt = await isExemptUser(c.env.DB, userId);

  if (!exempt) {
    // Check generation limit (free + purchased credits)
    const { totalGenerated, freeRemaining } = await getGenerationCounts(c.env.DB, userId);

    if (freeRemaining <= 0) {
      return c.json<ApiResponse>(
        {
          data: {
            requires_payment: true,
            price: PRICE_PER_GENERATION,
            total_generated: totalGenerated,
            free_limit: FREE_GENERATIONS,
          },
          error: {
            code: 'GENERATION_LIMIT',
            message: `You've used all ${FREE_GENERATIONS} free EA generations. Each additional generation costs $${PRICE_PER_GENERATION.toFixed(2)}.`,
          },
        },
        402,
      );
    }
  }

  const body = await c.req.json<{
    strategy_id: string;
    parameters: Record<string, unknown>;
  }>();

  if (!body.strategy_id || !body.parameters) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'strategy_id and parameters are required' } },
      400,
    );
  }

  // Fetch strategy template (including template_body + integration_block)
  const strategy = await c.env.DB.prepare(
    `SELECT id, name, slug, parameters_json, template_body, integration_block
     FROM strategy_templates
     WHERE id = ? AND is_published = true`,
  )
    .bind(body.strategy_id)
    .first<{
      id: string;
      name: string;
      slug: string;
      parameters_json: string;
      template_body: string;
      integration_block: string;
    }>();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }

  // Parse parameter schema and validate each submitted param
  const schema: ParamSchema[] = JSON.parse(strategy.parameters_json);
  const validated: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const param of schema) {
    const value = body.parameters[param.key] ?? param.default;
    const result = validateParam(param, value);
    if (!result.valid) {
      errors.push(result.error!);
    } else {
      validated[param.key] = result.coerced;
    }
  }

  if (errors.length > 0) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } },
      400,
    );
  }

  // Get user's master account for ACCOUNT_ID and API_KEY
  const masterAccount = await c.env.DB.prepare(
    "SELECT id, api_key FROM accounts WHERE user_id = ? AND role = 'master' AND is_active = true ORDER BY created_at ASC LIMIT 1",
  )
    .bind(userId)
    .first<{ id: string; api_key: string }>();

  if (!masterAccount) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No active master account found. Set up an account first.' } },
      404,
    );
  }

  // Build the .mq5 file via string substitution
  let output = strategy.template_body;

  // 1. Inject integration block
  output = output.replace('{{TRADEMETRICS_BLOCK}}', strategy.integration_block);

  // 2. Replace strategy name
  output = output.replace(/\{\{STRATEGY_NAME\}\}/g, strategy.name);

  // 3. Generate UNIQUE magic number per user + strategy (prevents conflicts)
  const magicNumber = magicFromSlug(userId + ':' + strategy.slug);
  output = output.replace(/\{\{MAGIC_NUMBER\}\}/g, String(magicNumber));

  // 4. Auto-fill account credentials
  output = output.replace(/\{\{ACCOUNT_ID\}\}/g, masterAccount.id);
  output = output.replace(/\{\{API_KEY\}\}/g, masterAccount.api_key);

  // 5. Add unique file header with generation metadata
  const generationId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const timestamp = new Date().toISOString();
  const uniqueHeader = `//+------------------------------------------------------------------+\n//| Generated: ${timestamp}                       |\n//| User: ${userId.slice(0, 8)}...  Build: ${generationId}          |\n//+------------------------------------------------------------------+\n`;
  output = uniqueHeader + output;

  // 5. Replace all parameter placeholders
  for (const [key, value] of Object.entries(validated)) {
    const placeholder = `{{${key}}}`;
    output = output.split(placeholder).join(String(value));
  }

  // Record generation in ea_generations
  await c.env.DB.prepare(
    'INSERT INTO ea_generations (user_id, strategy_id, parameters_json) VALUES (?, ?, ?)',
  )
    .bind(userId, strategy.id, JSON.stringify(validated))
    .run();

  // Return .mq5 as file download
  const filename = `${strategy.slug}-${Date.now()}.mq5`;

  return new Response(output, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// ── POST /strategy-hub/generate-custom — AI-powered custom EA generation ──

const CUSTOM_EA_SCAFFOLD = `//+------------------------------------------------------------------+
//| {{EA_NAME}}.mq5
//| Custom Expert Advisor — TradeMetrics Pro
//| Generated: {{TIMESTAMP}}
//| Build: {{BUILD_ID}}
//+------------------------------------------------------------------+
#property copyright "TradeMetrics Pro"
#property link      "https://trademetrics.pro"
#property version   "1.00"
#property strict
#property description "{{EA_DESCRIPTION}}"

#include <Trade\\Trade.mqh>

//--- Input Parameters
input group "=== Trade Management ==="
input double InpLotSize       = {{LOT_SIZE}};       // Lot Size
input int    InpSlPips         = {{SL_PIPS}};        // Stop Loss (pips)
input int    InpTpPips         = {{TP_PIPS}};        // Take Profit (pips)
input int    InpMagicNumber    = {{MAGIC_NUMBER}};   // Magic Number
input int    InpMaxSpread      = {{MAX_SPREAD}};     // Max Spread (points)

input group "=== Risk Management ==="
input double InpMaxDailyLoss   = {{MAX_DAILY_LOSS}}; // Max Daily Loss ($)
input bool   InpTrailingStop   = {{TRAILING_STOP}};  // Use Trailing Stop
input int    InpTrailingPips   = {{TRAILING_PIPS}};  // Trailing Distance (pips)
input bool   InpCloseFriday    = {{CLOSE_FRIDAY}};   // Close Before Weekend
input int    InpFridayHour     = 20;                 // Friday Close Hour

input group "=== Session Filter ==="
input bool   InpUseSession     = {{USE_SESSION}};    // Enable Session Filter
input int    InpSessionStart   = {{SESSION_START}};  // Session Start (hour)
input int    InpSessionEnd     = {{SESSION_END}};    // Session End (hour)

input group "=== Strategy Parameters ==="
{{STRATEGY_INPUTS}}

//--- Global Variables
CTrade trade;
int barsTotal;
double dailyPnL;
datetime lastDayChecked;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviations(10);
   trade.SetTypeFilling(ORDER_FILLING_IOC);
   barsTotal = iBars(_Symbol, PERIOD_CURRENT);
   dailyPnL = 0;
   lastDayChecked = 0;

   Print("{{EA_NAME}} initialized on ", _Symbol, " | Magic: ", InpMagicNumber);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                    |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("{{EA_NAME}} removed. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                                |
//+------------------------------------------------------------------+
void OnTick()
{
   //--- Check new bar
   int bars = iBars(_Symbol, PERIOD_CURRENT);
   if(bars == barsTotal) return;
   barsTotal = bars;

   //--- Daily P&L check
   if(!CheckDailyLoss()) return;

   //--- Spread check
   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpread) return;

   //--- Session filter
   if(InpUseSession && !IsWithinSession()) return;

   //--- Friday close check
   if(InpCloseFriday && IsFridayClose())
   {
      CloseAllPositions();
      return;
   }

   //--- Trailing stop management
   if(InpTrailingStop) ManageTrailingStop();

   //--- Strategy logic
   int signal = GetSignal();

   if(signal == 1 && !HasOpenPosition(POSITION_TYPE_BUY))
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl  = ask - InpSlPips * _Point * 10;
      double tp  = ask + InpTpPips * _Point * 10;
      trade.Buy(InpLotSize, _Symbol, ask, sl, tp, "{{EA_NAME}}");
   }
   else if(signal == -1 && !HasOpenPosition(POSITION_TYPE_SELL))
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl  = bid + InpSlPips * _Point * 10;
      double tp  = bid - InpTpPips * _Point * 10;
      trade.Sell(InpLotSize, _Symbol, bid, sl, tp, "{{EA_NAME}}");
   }
}

//+------------------------------------------------------------------+
//| STRATEGY SIGNAL LOGIC — AI Generated                               |
//+------------------------------------------------------------------+
{{SIGNAL_LOGIC}}

//+------------------------------------------------------------------+
//| Helper Functions                                                    |
//+------------------------------------------------------------------+
bool HasOpenPosition(ENUM_POSITION_TYPE type)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetInteger(POSITION_TYPE) == type)
         return true;
   }
   return false;
}

void CloseAllPositions()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
      {
         trade.PositionClose(PositionGetTicket(i));
      }
   }
}

bool IsWithinSession()
{
   MqlDateTime dt;
   TimeCurrent(dt);
   if(InpSessionStart < InpSessionEnd)
      return (dt.hour >= InpSessionStart && dt.hour < InpSessionEnd);
   else
      return (dt.hour >= InpSessionStart || dt.hour < InpSessionEnd);
}

bool IsFridayClose()
{
   MqlDateTime dt;
   TimeCurrent(dt);
   return (dt.day_of_week == 5 && dt.hour >= InpFridayHour);
}

bool CheckDailyLoss()
{
   if(InpMaxDailyLoss <= 0) return true;

   MqlDateTime dt;
   TimeCurrent(dt);
   datetime today = StringToTime(StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day));

   if(today != lastDayChecked)
   {
      dailyPnL = 0;
      lastDayChecked = today;
   }

   //--- Sum closed P&L today
   double todayPnl = 0;
   HistorySelect(today, TimeCurrent());
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol &&
         HistoryDealGetInteger(ticket, DEAL_MAGIC) == InpMagicNumber &&
         HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
      {
         todayPnl += HistoryDealGetDouble(ticket, DEAL_PROFIT)
                   + HistoryDealGetDouble(ticket, DEAL_COMMISSION)
                   + HistoryDealGetDouble(ticket, DEAL_SWAP);
      }
   }

   //--- Add floating P&L
   double floatingPnl = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol &&
         PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
      {
         floatingPnl += PositionGetDouble(POSITION_PROFIT)
                      + PositionGetDouble(POSITION_SWAP);
      }
   }

   dailyPnL = todayPnl + floatingPnl;

   if(dailyPnL <= -InpMaxDailyLoss)
   {
      Print("Daily loss limit reached: ", dailyPnL);
      CloseAllPositions();
      return false;
   }
   return true;
}

void ManageTrailingStop()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      ulong ticket = PositionGetTicket(i);
      double openPrice  = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSl  = PositionGetDouble(POSITION_SL);
      double tp         = PositionGetDouble(POSITION_TP);
      double trailDist  = InpTrailingPips * _Point * 10;

      if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
      {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double newSl = bid - trailDist;
         if(newSl > currentSl && newSl > openPrice)
            trade.PositionModify(ticket, newSl, tp);
      }
      else
      {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double newSl = ask + trailDist;
         if((newSl < currentSl || currentSl == 0) && newSl < openPrice)
            trade.PositionModify(ticket, newSl, tp);
      }
   }
}
//+------------------------------------------------------------------+
`;

strategyHub.post('/generate-custom', async (c) => {
  const userId = c.get('userId');

  // Limit check (same as regular generate)
  const exempt = await isExemptUser(c.env.DB, userId);
  if (!exempt) {
    const { freeRemaining } = await getGenerationCounts(c.env.DB, userId);
    if (freeRemaining <= 0) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'GENERATION_LIMIT', message: 'Generation limit reached.' } },
        402,
      );
    }
  }

  const body = await c.req.json<{
    name: string;
    description: string;
    indicators: string[];
    entry_conditions: string;
    exit_conditions: string;
    timeframe: string;
    pairs: string[];
    lot_size: number;
    sl_pips: number;
    tp_pips: number;
    max_spread: number;
    max_daily_loss: number;
    trailing_stop: boolean;
    trailing_pips: number;
    close_friday: boolean;
    use_session: boolean;
    session_start: number;
    session_end: number;
  }>();

  if (!body.name || !body.entry_conditions) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Name and entry conditions are required.' } },
      400,
    );
  }

  // Fetch master account for magic number
  const masterAccount = await c.env.DB.prepare(
    `SELECT id, api_key FROM accounts WHERE user_id = ? AND role = 'master' LIMIT 1`,
  ).bind(userId).first<{ id: string; api_key: string }>();

  const magicNumber = magicFromSlug(`${userId}:custom:${body.name}`);

  // Build AI prompt for signal logic generation
  const indicatorList = body.indicators.length > 0 ? body.indicators.join(', ') : 'None specified';
  const systemPrompt = `You are an expert MQL5 programmer. Generate ONLY the signal logic functions for a MetaTrader 5 Expert Advisor. Your output must be valid, compilable MQL5 code.

CRITICAL RULES:
- Output ONLY MQL5 code — no markdown, no explanations, no code fences
- You MUST define: int GetSignal() that returns 1 for buy, -1 for sell, 0 for no signal
- You may define additional helper functions and indicator handles as needed
- Use OnInit-style initialization for indicator handles via a separate InitIndicators() function called from GetSignal on first run
- All indicator handles must be declared as static or global int variables
- Use iCustom(), iMA(), iRSI(), iBands(), iATR(), iMACD(), iStochastic(), iCCI(), iADX() etc.
- Use CopyBuffer() to read indicator values into arrays
- Set ArraySetAsSeries(buffer, true) before reading
- NEVER use undeclared variables
- NEVER use deprecated MQL4 functions
- Always check array bounds before access
- If using multiple indicators, declare each handle as a static int initialized to INVALID_HANDLE`;

  const userPrompt = `Generate the signal logic for this custom EA:

EA Name: ${body.name}
Description: ${body.description || 'Custom strategy'}
Timeframe: ${body.timeframe}
Pairs: ${body.pairs.join(', ')}
Indicators to use: ${indicatorList}

ENTRY CONDITIONS (BUY):
${body.entry_conditions}

EXIT CONDITIONS / SELL:
${body.exit_conditions || 'Opposite of buy conditions'}

Generate the GetSignal() function and any required indicator initialization. Output ONLY valid MQL5 code.`;

  let signalLogic = '';
  let modelUsed = 'template';

  try {
    const aiResponse = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as Parameters<typeof c.env.AI.run>[0],
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      },
    );

    const raw = (aiResponse as { response?: string })?.response || '';
    // Strip any markdown fences the model might add
    signalLogic = raw
      .replace(/```mql5?\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    if (signalLogic.length > 50 && signalLogic.includes('GetSignal')) {
      modelUsed = 'llama-3.3-70b';
    } else {
      throw new Error('AI output did not contain valid GetSignal function');
    }
  } catch (err) {
    console.error('AI generation failed, using fallback:', err);
    // Fallback: generate a basic signal logic from the described indicators
    signalLogic = generateFallbackSignal(body.indicators, body.entry_conditions);
    modelUsed = 'fallback-template';
  }

  // Build strategy-specific input parameters from indicators
  const strategyInputs = generateStrategyInputs(body.indicators);

  // Assemble the final .mq5 file
  const buildId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const timestamp = new Date().toISOString();

  let output = CUSTOM_EA_SCAFFOLD;
  output = output.replace(/\{\{EA_NAME\}\}/g, sanitizeMql5String(body.name));
  output = output.replace(/\{\{EA_DESCRIPTION\}\}/g, sanitizeMql5String(body.description || 'Custom EA'));
  output = output.replace(/\{\{TIMESTAMP\}\}/g, timestamp);
  output = output.replace(/\{\{BUILD_ID\}\}/g, buildId);
  output = output.replace(/\{\{MAGIC_NUMBER\}\}/g, String(magicNumber));
  output = output.replace(/\{\{LOT_SIZE\}\}/g, String(body.lot_size || 0.1));
  output = output.replace(/\{\{SL_PIPS\}\}/g, String(body.sl_pips || 50));
  output = output.replace(/\{\{TP_PIPS\}\}/g, String(body.tp_pips || 100));
  output = output.replace(/\{\{MAX_SPREAD\}\}/g, String(body.max_spread || 30));
  output = output.replace(/\{\{MAX_DAILY_LOSS\}\}/g, String(body.max_daily_loss || 500));
  output = output.replace(/\{\{TRAILING_STOP\}\}/g, body.trailing_stop ? 'true' : 'false');
  output = output.replace(/\{\{TRAILING_PIPS\}\}/g, String(body.trailing_pips || 20));
  output = output.replace(/\{\{CLOSE_FRIDAY\}\}/g, body.close_friday ? 'true' : 'false');
  output = output.replace(/\{\{USE_SESSION\}\}/g, body.use_session ? 'true' : 'false');
  output = output.replace(/\{\{SESSION_START\}\}/g, String(body.session_start || 8));
  output = output.replace(/\{\{SESSION_END\}\}/g, String(body.session_end || 20));
  output = output.replace(/\{\{STRATEGY_INPUTS\}\}/g, strategyInputs);
  output = output.replace(/\{\{SIGNAL_LOGIC\}\}/g, signalLogic);

  // Record generation
  await c.env.DB.prepare(
    'INSERT INTO ea_generations (user_id, strategy_id, parameters_json) VALUES (?, ?, ?)',
  )
    .bind(userId, 'custom-ea', JSON.stringify({ ...body, model: modelUsed }))
    .run();

  const safeName = body.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `custom-${safeName}-${Date.now()}.mq5`;

  return new Response(output, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

function sanitizeMql5String(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 200);
}

function generateStrategyInputs(indicators: string[]): string {
  const lines: string[] = [];
  for (const ind of indicators) {
    const lower = ind.toLowerCase();
    if (lower.includes('ma') || lower.includes('moving average')) {
      lines.push('input int    InpMaPeriodFast  = 14;     // Fast MA Period');
      lines.push('input int    InpMaPeriodSlow  = 50;     // Slow MA Period');
      lines.push('input ENUM_MA_METHOD InpMaMethod = MODE_EMA; // MA Method');
    } else if (lower.includes('rsi')) {
      lines.push('input int    InpRsiPeriod     = 14;     // RSI Period');
      lines.push('input double InpRsiOverbought = 70;     // RSI Overbought');
      lines.push('input double InpRsiOversold   = 30;     // RSI Oversold');
    } else if (lower.includes('bollinger') || lower.includes('bands')) {
      lines.push('input int    InpBbPeriod      = 20;     // Bollinger Period');
      lines.push('input double InpBbDeviation   = 2.0;    // Bollinger Deviation');
    } else if (lower.includes('macd')) {
      lines.push('input int    InpMacdFast      = 12;     // MACD Fast');
      lines.push('input int    InpMacdSlow      = 26;     // MACD Slow');
      lines.push('input int    InpMacdSignal    = 9;      // MACD Signal');
    } else if (lower.includes('stochastic') || lower.includes('stoch')) {
      lines.push('input int    InpStochK        = 14;     // Stochastic %K');
      lines.push('input int    InpStochD        = 3;      // Stochastic %D');
      lines.push('input int    InpStochSlowing  = 3;      // Stochastic Slowing');
    } else if (lower.includes('atr')) {
      lines.push('input int    InpAtrPeriod     = 14;     // ATR Period');
      lines.push('input double InpAtrMultiplier = 1.5;    // ATR Multiplier');
    } else if (lower.includes('adx')) {
      lines.push('input int    InpAdxPeriod     = 14;     // ADX Period');
      lines.push('input double InpAdxThreshold  = 25.0;   // ADX Threshold');
    } else if (lower.includes('cci')) {
      lines.push('input int    InpCciPeriod     = 14;     // CCI Period');
      lines.push('input double InpCciOverbought = 100;    // CCI Overbought');
      lines.push('input double InpCciOversold   = -100;   // CCI Oversold');
    }
  }
  return lines.length > 0 ? lines.join('\n') : '// No additional strategy parameters';
}

function generateFallbackSignal(indicators: string[], entryConditions: string): string {
  // Generate a basic MA crossover as fallback
  return `// Fallback signal logic — customize in MetaEditor
static int maFastHandle = INVALID_HANDLE;
static int maSlowHandle = INVALID_HANDLE;

int GetSignal()
{
   if(maFastHandle == INVALID_HANDLE)
   {
      maFastHandle = iMA(_Symbol, PERIOD_CURRENT, 14, 0, MODE_EMA, PRICE_CLOSE);
      maSlowHandle = iMA(_Symbol, PERIOD_CURRENT, 50, 0, MODE_EMA, PRICE_CLOSE);
   }

   double fastMa[3], slowMa[3];
   ArraySetAsSeries(fastMa, true);
   ArraySetAsSeries(slowMa, true);

   if(CopyBuffer(maFastHandle, 0, 0, 3, fastMa) < 3) return 0;
   if(CopyBuffer(maSlowHandle, 0, 0, 3, slowMa) < 3) return 0;

   // Crossover detection
   if(fastMa[1] > slowMa[1] && fastMa[2] <= slowMa[2]) return 1;   // Buy
   if(fastMa[1] < slowMa[1] && fastMa[2] >= slowMa[2]) return -1;  // Sell

   return 0;
}`;
}

// ── GET /strategy-hub/my-generations — User's generation history ─
strategyHub.get('/my-generations', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT eg.id, eg.strategy_id, eg.parameters_json, eg.generated_at,
            st.name as strategy_name, st.slug as strategy_slug, st.category
     FROM ea_generations eg
     JOIN strategy_templates st ON st.id = eg.strategy_id
     WHERE eg.user_id = ?
     ORDER BY eg.generated_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});

// ── POST /strategy-hub/purchase — Initialize a $1.99 Paystack payment for one EA generation ─
strategyHub.post('/purchase', async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  // Initialize Paystack one-time transaction for $1.99 (199 cents USD)
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: 199,
      currency: 'USD',
      callback_url: 'https://trademetricspro.com/app/strategy-hub',
      metadata: {
        user_id: userId,
        type: 'ea_generation',
        credits: '1',
      },
    }),
  });

  const result = await res.json() as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!result.status || !result.data) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PAYMENT_ERROR', message: result.message || 'Failed to initialize payment' } },
      502,
    );
  }

  return c.json<ApiResponse>({
    data: {
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    },
    error: null,
  });
});

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';

const accounts = new Hono<{ Bindings: Env }>();

// ── Helpers ─────────────────────────────────────────────────────

function generateRandomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey(): string {
  return `er_${generateRandomHex(24)}`;
}

function generateApiSecret(): string {
  return generateRandomHex(32);
}

// ── GET /accounts ───────────────────────────────────────────────
accounts.get('/', async (c) => {
  const userId = c.get('userId');

  const result = await c.env.DB.prepare(
    `SELECT id, role, alias, broker_name, mt5_login, api_key, master_account_id,
            is_active, last_heartbeat, last_signal_at, signals_today, created_at
     FROM accounts WHERE user_id = ? ORDER BY created_at DESC`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({
    data: result.results,
    error: null,
    meta: { count: result.results.length },
  });
});

// ── POST /accounts ──────────────────────────────────────────────
accounts.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    role?: string;
    alias?: string;
    broker_name?: string;
    mt5_login?: string;
    master_account_id?: string;
  }>();

  if (!body.role || !body.alias) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'role and alias are required' } },
      400,
    );
  }

  if (body.role !== 'master' && body.role !== 'follower') {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'role must be "master" or "follower"' } },
      400,
    );
  }

  // Check plan limits
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?')
    .bind(userId)
    .first<{ plan: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  const planLimits: Record<string, { masters: number; followers: number }> = {
    free: { masters: 1, followers: 1 },
    starter: { masters: 1, followers: 3 },
    pro: { masters: 1, followers: 10 },
    unlimited: { masters: 5, followers: 999 },
    provider: { masters: 10, followers: 999 },
  };

  const limits = planLimits[user.plan] ?? planLimits['free']!;

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM accounts WHERE user_id = ? AND role = ? AND is_active = true',
  )
    .bind(userId, body.role)
    .first<{ cnt: number }>();

  const currentCount = countResult?.cnt ?? 0;
  const maxAllowed = body.role === 'master' ? limits.masters : limits.followers;

  if (currentCount >= maxAllowed) {
    return c.json<ApiResponse>(
      {
        data: null,
        error: {
          code: 'PLAN_LIMIT',
          message: `Your ${user.plan} plan allows a maximum of ${maxAllowed} ${body.role} account(s)`,
        },
      },
      403,
    );
  }

  // If follower, validate master_account_id
  if (body.role === 'follower') {
    if (!body.master_account_id) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'master_account_id is required for follower accounts' } },
        400,
      );
    }

    const master = await c.env.DB.prepare(
      'SELECT id FROM accounts WHERE id = ? AND role = ? AND is_active = true',
    )
      .bind(body.master_account_id, 'master')
      .first();

    if (!master) {
      return c.json<ApiResponse>(
        { data: null, error: { code: 'NOT_FOUND', message: 'Master account not found or inactive' } },
        404,
      );
    }
  }

  const apiKey = generateApiKey();
  const apiSecret = generateApiSecret();

  const account = await c.env.DB.prepare(
    `INSERT INTO accounts (user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id, role, alias, broker_name, mt5_login, api_key, master_account_id, is_active, created_at`,
  )
    .bind(
      userId,
      body.role,
      body.alias.trim(),
      body.broker_name?.trim() || null,
      body.mt5_login?.trim() || null,
      apiKey,
      apiSecret,
      body.role === 'follower' ? body.master_account_id! : null,
    )
    .first();

  if (!account) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' } },
      500,
    );
  }

  // If follower, create default follower_config
  if (body.role === 'follower') {
    await c.env.DB.prepare(
      'INSERT INTO follower_config (account_id) VALUES (?)',
    )
      .bind((account as Record<string, unknown>).id as string)
      .run();
  }

  return c.json<ApiResponse>(
    {
      data: { ...account, api_secret: apiSecret },
      error: null,
    },
    201,
  );
});

// ── GET /accounts/usage/summary ──────────────────────────────────
// Returns aggregate usage across all user's accounts
accounts.get('/usage/summary', authMiddleware, async (c) => {
  const userId = c.get('userId');

  // Get all user's master accounts
  const masterAccounts = await c.env.DB.prepare(
    `SELECT id, alias, signals_today, last_signal_at, last_heartbeat
     FROM accounts WHERE user_id = ? AND role = 'master' AND is_active = true`,
  )
    .bind(userId)
    .all();

  const masterIds = masterAccounts.results.map((a: Record<string, unknown>) => a.id as string);

  if (masterIds.length === 0) {
    return c.json<ApiResponse>({
      data: {
        total_signals_today: 0,
        total_signals_7d: 0,
        execution_summary: { executed: 0, blocked: 0, failed: 0, skipped: 0 },
        avg_latency: 0,
        active_accounts: 0,
        total_accounts: 0,
        accounts: [],
      },
      error: null,
    });
  }

  // Build placeholders for IN clause
  const placeholders = masterIds.map(() => '?').join(',');

  // Aggregate signals today
  const totalSignalsToday = masterAccounts.results.reduce(
    (sum: number, a: Record<string, unknown>) => sum + ((a.signals_today as number) ?? 0),
    0,
  );

  // Total signals in last 7 days
  const signals7d = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM signals WHERE master_account_id IN (${placeholders}) AND received_at >= datetime('now', '-7 days')`,
  )
    .bind(...masterIds)
    .first<{ count: number }>();

  // Execution summary
  const execSummary = await c.env.DB.prepare(
    `SELECT status, COUNT(*) as count
     FROM executions e
     JOIN signals s ON e.signal_id = s.id
     WHERE s.master_account_id IN (${placeholders})
     AND e.executed_at >= datetime('now', '-7 days')
     GROUP BY status`,
  )
    .bind(...masterIds)
    .all();

  const executionMap: Record<string, number> = {};
  for (const row of execSummary.results) {
    const r = row as Record<string, unknown>;
    executionMap[r.status as string] = r.count as number;
  }

  // Average latency across all accounts
  const latency = await c.env.DB.prepare(
    `SELECT AVG(execution_time_ms) as avg_latency
     FROM executions e
     JOIN signals s ON e.signal_id = s.id
     WHERE s.master_account_id IN (${placeholders})
     AND e.executed_at >= datetime('now', '-24 hours')
     AND e.status = 'executed'`,
  )
    .bind(...masterIds)
    .first<{ avg_latency: number | null }>();

  // Active accounts (heartbeat within 30s)
  const now = Date.now();
  const activeAccounts = masterAccounts.results.filter((a: Record<string, unknown>) => {
    const hb = a.last_heartbeat as string | null;
    if (!hb) return false;
    return now - new Date(hb).getTime() < 30_000;
  }).length;

  return c.json<ApiResponse>({
    data: {
      total_signals_today: totalSignalsToday,
      total_signals_7d: signals7d?.count ?? 0,
      execution_summary: {
        executed: executionMap['executed'] ?? 0,
        blocked: executionMap['blocked'] ?? 0,
        failed: executionMap['failed'] ?? 0,
        skipped: executionMap['skipped'] ?? 0,
      },
      avg_latency: latency?.avg_latency ?? 0,
      active_accounts: activeAccounts,
      total_accounts: masterAccounts.results.length,
      accounts: masterAccounts.results,
    },
    error: null,
  });
});

// ── GET /accounts/:id/usage ─────────────────────────────────────
// Returns API usage stats for an account
accounts.get('/:id/usage', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');

  // Verify ownership
  const account = await c.env.DB.prepare(
    'SELECT id, role, alias, signals_today, last_signal_at, last_heartbeat FROM accounts WHERE id = ? AND user_id = ? AND is_active = true',
  )
    .bind(accountId, userId)
    .first();

  if (!account) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  // Get signal counts for last 7 days
  const dailySignals = await c.env.DB.prepare(`
    SELECT date(received_at) as day, COUNT(*) as count
    FROM signals
    WHERE master_account_id = ?
    AND received_at >= datetime('now', '-7 days')
    GROUP BY date(received_at)
    ORDER BY day DESC
  `)
    .bind(accountId)
    .all();

  // Get execution stats for last 7 days
  const executionStats = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count
    FROM executions e
    JOIN signals s ON e.signal_id = s.id
    WHERE s.master_account_id = ?
    AND e.executed_at >= datetime('now', '-7 days')
    GROUP BY status
  `)
    .bind(accountId)
    .all();

  // Get average latency
  const latencyStats = await c.env.DB.prepare(`
    SELECT
      AVG(execution_time_ms) as avg_latency,
      MIN(execution_time_ms) as min_latency,
      MAX(execution_time_ms) as max_latency,
      COUNT(*) as total_executions
    FROM executions e
    JOIN signals s ON e.signal_id = s.id
    WHERE s.master_account_id = ?
    AND e.executed_at >= datetime('now', '-24 hours')
    AND e.status = 'executed'
  `)
    .bind(accountId)
    .first();

  // Current rate limit status (from KV)
  const currentMinute = Math.floor(Date.now() / 60000);
  const rateKey = `rate:${accountId}:${currentMinute}`;
  const currentRate = await c.env.SESSIONS.get(rateKey);

  return c.json<ApiResponse>({
    data: {
      account: {
        id: (account as Record<string, unknown>).id,
        alias: (account as Record<string, unknown>).alias,
        role: (account as Record<string, unknown>).role,
        signals_today: (account as Record<string, unknown>).signals_today,
        last_signal_at: (account as Record<string, unknown>).last_signal_at,
        last_heartbeat: (account as Record<string, unknown>).last_heartbeat,
      },
      rate_limit: {
        current_minute_usage: currentRate ? parseInt(currentRate) : 0,
        limit_per_minute: 60,
        remaining: 60 - (currentRate ? parseInt(currentRate) : 0),
      },
      daily_signals: dailySignals.results,
      execution_stats: executionStats.results,
      latency: latencyStats ?? {
        avg_latency: 0,
        min_latency: 0,
        max_latency: 0,
        total_executions: 0,
      },
    },
    error: null,
  });
});

// ── GET /accounts/:id ───────────────────────────────────────────
accounts.get('/:id', async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');

  const account = await c.env.DB.prepare(
    `SELECT id, role, alias, broker_name, mt5_login, api_key, master_account_id,
            is_active, last_heartbeat, last_signal_at, signals_today, created_at
     FROM accounts WHERE id = ? AND user_id = ?`,
  )
    .bind(accountId, userId)
    .first();

  if (!account) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  // If follower, include follower_config
  let config = null;
  if ((account as Record<string, unknown>).role === 'follower') {
    config = await c.env.DB.prepare(
      `SELECT lot_mode, lot_value, max_daily_loss_percent, max_total_drawdown_percent,
              respect_news_filter, max_slippage_points, symbol_suffix,
              copy_buys, copy_sells, copy_pendings, invert_direction,
              created_at, updated_at
       FROM follower_config WHERE account_id = ?`,
    )
      .bind(accountId)
      .first();

    // Also get symbol mappings
    const mappings = await c.env.DB.prepare(
      'SELECT id, master_symbol, follower_symbol FROM symbol_mappings WHERE account_id = ?',
    )
      .bind(accountId)
      .all();

    return c.json<ApiResponse>({
      data: { ...account, follower_config: config, symbol_mappings: mappings.results },
      error: null,
    });
  }

  return c.json<ApiResponse>({ data: account, error: null });
});

// ── PUT /accounts/:id ───────────────────────────────────────────
accounts.put('/:id', async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');

  // Verify ownership
  const existing = await c.env.DB.prepare(
    'SELECT id, role FROM accounts WHERE id = ? AND user_id = ?',
  )
    .bind(accountId, userId)
    .first<{ id: string; role: string }>();

  if (!existing) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  const body = await c.req.json<{
    alias?: string;
    broker_name?: string;
    mt5_login?: string;
    follower_config?: {
      lot_mode?: string;
      lot_value?: number;
      max_daily_loss_percent?: number;
      max_total_drawdown_percent?: number;
      respect_news_filter?: boolean;
      max_slippage_points?: number;
      symbol_suffix?: string;
      copy_buys?: boolean;
      copy_sells?: boolean;
      copy_pendings?: boolean;
      invert_direction?: boolean;
    };
    symbol_mappings?: Array<{ master_symbol: string; follower_symbol: string }>;
  }>();

  // Update account fields
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.alias !== undefined) {
    updates.push('alias = ?');
    values.push(body.alias.trim());
  }
  if (body.broker_name !== undefined) {
    updates.push('broker_name = ?');
    values.push(body.broker_name.trim());
  }
  if (body.mt5_login !== undefined) {
    updates.push('mt5_login = ?');
    values.push(body.mt5_login.trim());
  }

  if (updates.length > 0) {
    values.push(accountId, userId);
    await c.env.DB.prepare(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    )
      .bind(...values)
      .run();
  }

  // Update follower_config if follower
  if (existing.role === 'follower' && body.follower_config) {
    const fc = body.follower_config;
    const cfgUpdates: string[] = [];
    const cfgValues: unknown[] = [];

    if (fc.lot_mode !== undefined) { cfgUpdates.push('lot_mode = ?'); cfgValues.push(fc.lot_mode); }
    if (fc.lot_value !== undefined) { cfgUpdates.push('lot_value = ?'); cfgValues.push(fc.lot_value); }
    if (fc.max_daily_loss_percent !== undefined) { cfgUpdates.push('max_daily_loss_percent = ?'); cfgValues.push(fc.max_daily_loss_percent); }
    if (fc.max_total_drawdown_percent !== undefined) { cfgUpdates.push('max_total_drawdown_percent = ?'); cfgValues.push(fc.max_total_drawdown_percent); }
    if (fc.respect_news_filter !== undefined) { cfgUpdates.push('respect_news_filter = ?'); cfgValues.push(fc.respect_news_filter); }
    if (fc.max_slippage_points !== undefined) { cfgUpdates.push('max_slippage_points = ?'); cfgValues.push(fc.max_slippage_points); }
    if (fc.symbol_suffix !== undefined) { cfgUpdates.push('symbol_suffix = ?'); cfgValues.push(fc.symbol_suffix); }
    if (fc.copy_buys !== undefined) { cfgUpdates.push('copy_buys = ?'); cfgValues.push(fc.copy_buys); }
    if (fc.copy_sells !== undefined) { cfgUpdates.push('copy_sells = ?'); cfgValues.push(fc.copy_sells); }
    if (fc.copy_pendings !== undefined) { cfgUpdates.push('copy_pendings = ?'); cfgValues.push(fc.copy_pendings); }
    if (fc.invert_direction !== undefined) { cfgUpdates.push('invert_direction = ?'); cfgValues.push(fc.invert_direction); }

    if (cfgUpdates.length > 0) {
      cfgUpdates.push("updated_at = datetime('now')");
      cfgValues.push(accountId);
      await c.env.DB.prepare(
        `UPDATE follower_config SET ${cfgUpdates.join(', ')} WHERE account_id = ?`,
      )
        .bind(...cfgValues)
        .run();
    }
  }

  // Update symbol_mappings if provided
  if (existing.role === 'follower' && body.symbol_mappings !== undefined) {
    // Delete existing mappings and re-insert
    await c.env.DB.prepare('DELETE FROM symbol_mappings WHERE account_id = ?')
      .bind(accountId)
      .run();

    for (const mapping of body.symbol_mappings) {
      await c.env.DB.prepare(
        'INSERT INTO symbol_mappings (account_id, master_symbol, follower_symbol) VALUES (?, ?, ?)',
      )
        .bind(accountId, mapping.master_symbol, mapping.follower_symbol)
        .run();
    }
  }

  return c.json<ApiResponse>({ data: { id: accountId, updated: true }, error: null });
});

// ── DELETE /accounts/:id ────────────────────────────────────────
accounts.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');

  const result = await c.env.DB.prepare(
    'UPDATE accounts SET is_active = false WHERE id = ? AND user_id = ? RETURNING id',
  )
    .bind(accountId, userId)
    .first();

  if (!result) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({ data: { id: accountId, deactivated: true }, error: null });
});

// ── POST /accounts/:id/regenerate-keys ──────────────────────────
accounts.post('/:id/regenerate-keys', async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');

  const newApiKey = generateApiKey();
  const newApiSecret = generateApiSecret();

  const result = await c.env.DB.prepare(
    'UPDATE accounts SET api_key = ?, api_secret = ? WHERE id = ? AND user_id = ? RETURNING id, api_key',
  )
    .bind(newApiKey, newApiSecret, accountId, userId)
    .first();

  if (!result) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  return c.json<ApiResponse>({
    data: { id: accountId, api_key: newApiKey, api_secret: newApiSecret },
    error: null,
  });
});

// ── GET /accounts/:id/ea-download/:type ─────────────────────
// Serves the compiled .ex5 EA file from R2
accounts.get('/:id/ea-download/:type', async (c) => {
  const userId = c.get('userId');
  const accountId = c.req.param('id');
  const eaType = c.req.param('type'); // 'master' or 'follower'

  if (eaType !== 'master' && eaType !== 'follower') {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Type must be master or follower' } },
      400,
    );
  }

  // Verify ownership
  const account = await c.env.DB.prepare(
    'SELECT id, role FROM accounts WHERE id = ? AND user_id = ? AND is_active = true',
  )
    .bind(accountId, userId)
    .first();

  if (!account) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Account not found' } },
      404,
    );
  }

  const key = `ea-builds/EdgeRelay_${eaType === 'master' ? 'Master' : 'Follower'}.ex5`;
  const object = await c.env.STORAGE.get(key);

  if (!object) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'EA file not yet available. Please check back soon.' } },
      404,
    );
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="EdgeRelay_${eaType === 'master' ? 'Master' : 'Follower'}.ex5"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

export { accounts };

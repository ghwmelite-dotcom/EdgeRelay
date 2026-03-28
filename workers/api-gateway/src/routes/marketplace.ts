import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const marketplace = new Hono<{ Bindings: Env }>();

// ── Helpers ─────────────────────────────────────────────────────

function generateRandomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const MIN_TRADES = 20;
const MIN_DAYS = 14;

interface QualificationResult {
  qualified: boolean;
  trade_count: number;
  active_days: number;
  required_trades: number;
  required_days: number;
}

async function checkQualification(
  db: D1Database,
  masterAccountId: string,
): Promise<QualificationResult> {
  const stats = await db
    .prepare(
      `SELECT
        COUNT(*) as trade_count,
        COUNT(DISTINCT DATE(close_time)) as active_days
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(masterAccountId)
    .first<{ trade_count: number; active_days: number }>();

  const tradeCount = stats?.trade_count ?? 0;
  const activeDays = stats?.active_days ?? 0;

  return {
    qualified: tradeCount >= MIN_TRADES && activeDays >= MIN_DAYS,
    trade_count: tradeCount,
    active_days: activeDays,
    required_trades: MIN_TRADES,
    required_days: MIN_DAYS,
  };
}

// ── POST /marketplace/provider — Become a provider ──────────────

marketplace.post('/provider', async (c) => {
  const userId = c.get('userId');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ id: string }>();

  if (existing) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'ALREADY_EXISTS', message: 'You already have a provider profile' } },
      409,
    );
  }

  const body = await c.req.json<{
    display_name?: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    master_account_id?: string;
  }>();

  if (!body.display_name?.trim() || !body.master_account_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'display_name and master_account_id are required' } },
      400,
    );
  }

  const master = await c.env.DB.prepare(
    'SELECT id FROM accounts WHERE id = ? AND user_id = ? AND role = ? AND is_active = true',
  )
    .bind(body.master_account_id, userId, 'master')
    .first<{ id: string }>();

  if (!master) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Master account not found or not active' } },
      404,
    );
  }

  const qualification = await checkQualification(c.env.DB, body.master_account_id);

  const validStyles = ['scalper', 'swing', 'position', 'mixed'];
  const style = validStyles.includes(body.strategy_style ?? '') ? body.strategy_style : 'mixed';

  const profile = await c.env.DB.prepare(
    `INSERT INTO provider_profiles (user_id, master_account_id, display_name, bio, instruments, strategy_style, is_listed, listed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(
      userId,
      body.master_account_id,
      body.display_name.trim(),
      body.bio?.trim() || null,
      body.instruments?.trim() || null,
      style,
      qualification.qualified,
      qualification.qualified ? new Date().toISOString() : null,
    )
    .first();

  if (!profile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create provider profile' } },
      500,
    );
  }

  await c.env.DB.prepare(
    'INSERT INTO provider_stats (provider_id) VALUES (?)',
  )
    .bind((profile as Record<string, unknown>).id as string)
    .run();

  return c.json<ApiResponse>(
    { data: { profile, qualification }, error: null },
    201,
  );
});

// ── PUT /marketplace/provider — Update own profile ──────────────

marketplace.put('/provider', async (c) => {
  const userId = c.get('userId');

  const profile = await c.env.DB.prepare(
    'SELECT id, is_listed FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ id: string; is_listed: number }>();

  if (!profile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No provider profile found' } },
      404,
    );
  }

  const body = await c.req.json<{
    display_name?: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    is_listed?: boolean;
  }>();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.display_name?.trim()) {
    updates.push('display_name = ?');
    values.push(body.display_name.trim());
  }
  if (body.bio !== undefined) {
    updates.push('bio = ?');
    values.push(body.bio?.trim() || null);
  }
  if (body.instruments !== undefined) {
    updates.push('instruments = ?');
    values.push(body.instruments?.trim() || null);
  }
  if (body.strategy_style) {
    const validStyles = ['scalper', 'swing', 'position', 'mixed'];
    if (validStyles.includes(body.strategy_style)) {
      updates.push('strategy_style = ?');
      values.push(body.strategy_style);
    }
  }
  if (body.is_listed !== undefined) {
    updates.push('is_listed = ?');
    values.push(body.is_listed);
    if (body.is_listed && !profile.is_listed) {
      updates.push('listed_at = ?');
      values.push(new Date().toISOString());
    }
  }

  if (updates.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } }, 400);
  }

  values.push(profile.id);

  const updated = await c.env.DB.prepare(
    `UPDATE provider_profiles SET ${updates.join(', ')} WHERE id = ? RETURNING *`,
  )
    .bind(...values)
    .first();

  return c.json<ApiResponse>({ data: updated, error: null });
});

// ── GET /marketplace/provider/me — Own profile + stats ──────────

marketplace.get('/provider/me', async (c) => {
  const userId = c.get('userId');

  const profile = await c.env.DB.prepare(
    'SELECT * FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first();

  if (!profile) {
    return c.json<ApiResponse>({ data: null, error: null });
  }

  const stats = await c.env.DB.prepare(
    'SELECT * FROM provider_stats WHERE provider_id = ?',
  )
    .bind((profile as Record<string, unknown>).id as string)
    .first();

  const qualification = await checkQualification(
    c.env.DB,
    (profile as Record<string, unknown>).master_account_id as string,
  );

  return c.json<ApiResponse>({
    data: { profile, stats, qualification },
    error: null,
  });
});

// ── POST /marketplace/subscribe/:providerId — Subscribe to a provider ──

marketplace.post('/subscribe/:providerId', async (c) => {
  const userId = c.get('userId');
  const providerId = c.req.param('providerId');

  // Validate provider exists and is listed
  const provider = await c.env.DB.prepare(
    'SELECT id, master_account_id, display_name FROM provider_profiles WHERE id = ? AND is_listed = true',
  )
    .bind(providerId)
    .first<{ id: string; master_account_id: string; display_name: string }>();

  if (!provider) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Provider not found or not listed' } },
      404,
    );
  }

  // Check not subscribing to self
  const ownProfile = await c.env.DB.prepare(
    'SELECT id FROM provider_profiles WHERE id = ? AND user_id = ?',
  )
    .bind(providerId, userId)
    .first();

  if (ownProfile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'You cannot copy your own signals' } },
      400,
    );
  }

  // Check no existing active subscription
  const existingSub = await c.env.DB.prepare(
    "SELECT id FROM marketplace_subscriptions WHERE subscriber_user_id = ? AND provider_id = ? AND status = 'active'",
  )
    .bind(userId, providerId)
    .first();

  if (existingSub) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'ALREADY_EXISTS', message: 'Already subscribed to this provider' } },
      409,
    );
  }

  // Check plan limits for follower accounts
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?')
    .bind(userId)
    .first<{ plan: string }>();

  const planLimits: Record<string, number> = {
    free: 999, starter: 999, pro: 999, unlimited: 999, provider: 999,
  };
  const maxFollowers = planLimits[user?.plan ?? 'free'] ?? 999;

  const followerCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM accounts WHERE user_id = ? AND role = 'follower' AND is_active = true",
  )
    .bind(userId)
    .first<{ cnt: number }>();

  if ((followerCount?.cnt ?? 0) >= maxFollowers) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'PLAN_LIMIT', message: `Your plan allows max ${maxFollowers} follower account(s)` } },
      403,
    );
  }

  // Get broker/MT5 details from request body or existing account
  const body = await c.req.json<{
    broker_name?: string;
    mt5_login?: string;
  }>().catch(() => ({} as { broker_name?: string; mt5_login?: string }));

  let brokerName = body.broker_name?.trim() || null;
  let mt5Login = body.mt5_login?.trim() || null;

  if (!mt5Login) {
    // Try to find existing account with MT5 details
    const existing = await c.env.DB.prepare(
      'SELECT broker_name, mt5_login FROM accounts WHERE user_id = ? AND mt5_login IS NOT NULL ORDER BY created_at DESC LIMIT 1',
    )
      .bind(userId)
      .first<{ broker_name: string | null; mt5_login: string }>();

    if (existing) {
      brokerName = brokerName || existing.broker_name;
      mt5Login = existing.mt5_login;
    } else {
      return c.json<ApiResponse>({
        data: { needs_setup: true },
        error: null,
      });
    }
  }

  // Generate API credentials
  const apiKey = `er_${generateRandomHex(24)}`;
  const apiSecret = generateRandomHex(32);

  // Create follower account linked to provider's master
  const follower = await c.env.DB.prepare(
    `INSERT INTO accounts (user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id)
     VALUES (?, 'follower', ?, ?, ?, ?, ?, ?)
     RETURNING id, role, alias, broker_name, mt5_login, api_key, master_account_id, is_active, created_at`,
  )
    .bind(
      userId,
      `Copy: ${provider.display_name}`,
      brokerName,
      mt5Login,
      apiKey,
      apiSecret,
      provider.master_account_id,
    )
    .first();

  if (!follower) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create follower account' } },
      500,
    );
  }

  const followerId = (follower as Record<string, unknown>).id as string;

  // Create follower_config defaults
  await c.env.DB.prepare('INSERT INTO follower_config (account_id) VALUES (?)').bind(followerId).run();

  // Create marketplace subscription
  await c.env.DB.prepare(
    "INSERT INTO marketplace_subscriptions (subscriber_user_id, provider_id, follower_account_id, status) VALUES (?, ?, ?, 'active')",
  )
    .bind(userId, providerId, followerId)
    .run();

  return c.json<ApiResponse>(
    {
      data: {
        subscription: { provider_id: providerId, provider_name: provider.display_name, status: 'active' },
        follower: { ...follower, api_secret: apiSecret },
      },
      error: null,
    },
    201,
  );
});

// ── DELETE /marketplace/subscribe/:providerId — Unsubscribe ─────

marketplace.delete('/subscribe/:providerId', async (c) => {
  const userId = c.get('userId');
  const providerId = c.req.param('providerId');

  const sub = await c.env.DB.prepare(
    "SELECT id, follower_account_id FROM marketplace_subscriptions WHERE subscriber_user_id = ? AND provider_id = ? AND status = 'active'",
  )
    .bind(userId, providerId)
    .first<{ id: string; follower_account_id: string }>();

  if (!sub) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No active subscription found' } },
      404,
    );
  }

  // Cancel subscription
  await c.env.DB.prepare(
    "UPDATE marketplace_subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?",
  )
    .bind(sub.id)
    .run();

  // Deactivate follower account
  await c.env.DB.prepare(
    'UPDATE accounts SET is_active = false WHERE id = ?',
  )
    .bind(sub.follower_account_id)
    .run();

  return c.json<ApiResponse>({ data: { unsubscribed: true }, error: null });
});

// ── GET /marketplace/subscriptions — List user's subscriptions ──

marketplace.get('/subscriptions', async (c) => {
  const userId = c.get('userId');

  const { results } = await c.env.DB.prepare(
    `SELECT ms.id, ms.provider_id, ms.status, ms.subscribed_at, ms.cancelled_at,
            pp.display_name as provider_name, pp.strategy_style, pp.instruments,
            ps.win_rate, ps.total_pnl, ps.subscriber_count
     FROM marketplace_subscriptions ms
     JOIN provider_profiles pp ON pp.id = ms.provider_id
     LEFT JOIN provider_stats ps ON ps.provider_id = pp.id
     WHERE ms.subscriber_user_id = ?
     ORDER BY ms.subscribed_at DESC`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});

// ══════════════════════════════════════════════════════════════════
// PUBLIC MARKETPLACE ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════════

export const marketplacePublic = new Hono<{ Bindings: Env }>();

// ── GET /marketplace/providers — Leaderboard ────────────────────

marketplacePublic.get('/providers', async (c) => {
  const sort = c.req.query('sort') ?? 'total_pnl';
  const instrument = c.req.query('instrument');
  const strategy = c.req.query('strategy');
  const minDays = parseInt(c.req.query('min_days') ?? '0', 10);
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  const validSorts: Record<string, string> = {
    total_pnl: 'ps.total_pnl DESC',
    win_rate: 'ps.win_rate DESC',
    subscribers: 'ps.subscriber_count DESC',
    newest: 'pp.listed_at DESC',
    drawdown: 'ps.max_drawdown_pct ASC',
    trades: 'ps.total_trades DESC',
  };
  const orderBy = validSorts[sort] ?? validSorts['total_pnl'];

  let whereClause = 'WHERE pp.is_listed = true';
  const binds: unknown[] = [];

  if (instrument) {
    whereClause += ' AND pp.instruments LIKE ?';
    binds.push(`%${instrument}%`);
  }
  if (strategy && ['scalper', 'swing', 'position', 'mixed'].includes(strategy)) {
    whereClause += ' AND pp.strategy_style = ?';
    binds.push(strategy);
  }
  if (minDays > 0) {
    whereClause += ' AND ps.active_days >= ?';
    binds.push(minDays);
  }

  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(
    `SELECT
      pp.id, pp.display_name, pp.bio, pp.instruments, pp.strategy_style, pp.listed_at,
      ps.total_trades, ps.win_rate, ps.total_pnl, ps.avg_pips, ps.max_drawdown_pct,
      ps.sharpe_ratio, ps.avg_trade_duration_sec, ps.profit_factor, ps.active_days,
      ps.subscriber_count, ps.equity_curve_json, ps.computed_at
    FROM provider_profiles pp
    LEFT JOIN provider_stats ps ON ps.provider_id = pp.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`,
  )
    .bind(...binds)
    .all();

  // Get total count for pagination
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM provider_profiles pp
    LEFT JOIN provider_stats ps ON ps.provider_id = pp.id
    ${whereClause.replace(/ LIMIT.*/, '')}`,
  )
    .bind(...binds.slice(0, -2))
    .first<{ total: number }>();

  return c.json<ApiResponse>({
    data: results ?? [],
    error: null,
    meta: { total: countRow?.total ?? 0, limit, offset },
  });
});

// ── GET /marketplace/providers/:id — Provider detail ────────────

marketplacePublic.get('/providers/:id', async (c) => {
  const providerId = c.req.param('id');

  const profile = await c.env.DB.prepare(
    'SELECT * FROM provider_profiles WHERE id = ? AND is_listed = true',
  )
    .bind(providerId)
    .first();

  if (!profile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Provider not found' } },
      404,
    );
  }

  const stats = await c.env.DB.prepare(
    'SELECT * FROM provider_stats WHERE provider_id = ?',
  )
    .bind(providerId)
    .first();

  // Recent 5 closed trades
  const { results: recentTrades } = await c.env.DB.prepare(
    `SELECT symbol, direction, volume, profit, pips, duration_seconds, close_time
    FROM journal_trades
    WHERE account_id = ? AND deal_entry = 'out'
    ORDER BY close_time DESC
    LIMIT 5`,
  )
    .bind((profile as Record<string, unknown>).master_account_id as string)
    .all();

  return c.json<ApiResponse>({
    data: { profile, stats, recent_trades: recentTrades ?? [] },
    error: null,
  });
});

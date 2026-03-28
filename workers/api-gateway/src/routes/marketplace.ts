import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const marketplace = new Hono<{ Bindings: Env }>();

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

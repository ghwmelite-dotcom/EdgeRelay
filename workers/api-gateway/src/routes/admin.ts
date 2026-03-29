import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { hashPassword } from '../middleware/auth.js';

export const admin = new Hono<{ Bindings: Env }>();

// ── Admin guard middleware ────────────────────────────────────────

const ADMIN_EMAILS = ['oh84dev@gmail.com'];

async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>();

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      403,
    );
  }
  await next();
}

admin.use('*', requireAdmin);

// ── POST /admin/users — Create a new user ────────────────────────

admin.post('/users', async (c) => {
  const body = await c.req.json<{ email: string; password: string; name?: string; plan?: string }>();

  if (!body.email || !body.password) {
    return c.json<ApiResponse>({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const passwordHash = await hashPassword(body.password);
  const name = body.name?.trim() || null;
  const plan = body.plan || 'free';

  try {
    const user = await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, name, plan) VALUES (?, ?, ?, ?) RETURNING id, email, name, plan, created_at`,
    ).bind(email, passwordHash, name, plan).first();

    return c.json<ApiResponse>({ data: user, error: null }, 201);
  } catch (err) {
    return c.json<ApiResponse>({ data: null, error: { code: 'CONFLICT', message: 'Email already exists' } }, 409);
  }
});

// ── DELETE /admin/users/:id — Delete a user ──────────────────────

admin.delete('/users/:id', async (c) => {
  const userId = c.req.param('id');

  // Don't allow deleting yourself
  if (userId === c.get('userId')) {
    return c.json<ApiResponse>({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Cannot delete your own account' } }, 400);
  }

  // Deactivate all user's accounts
  await c.env.DB.prepare('UPDATE accounts SET is_active = false WHERE user_id = ?').bind(userId).run();

  // Delete the user
  const result = await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  if (result.meta.changes === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  return c.json<ApiResponse>({ data: { deleted: true }, error: null });
});

// ── GET /admin/overview ──────────────────────────────────────────

admin.get('/overview', async (c) => {
  try {
    const db = c.env.DB;

    const [
      totalUsers,
      newUsersWeek,
      accountsByRole,
      totalSignals,
      signalsToday,
      totalTrades,
      totalGenerations,
      creditStats,
      totalProviders,
      activeSubscriptions,
      totalStrategies,
    ] = await Promise.all([
      db.prepare('SELECT COUNT(*) as total_users FROM users').first<{ total_users: number }>(),
      db.prepare("SELECT COUNT(*) as new_users_week FROM users WHERE created_at >= datetime('now', '-7 days')").first<{ new_users_week: number }>(),
      db.prepare("SELECT role, COUNT(*) as count FROM accounts WHERE is_active = true GROUP BY role").all<{ role: string; count: number }>(),
      db.prepare('SELECT COUNT(*) as total_signals FROM signals').first<{ total_signals: number }>(),
      db.prepare("SELECT COUNT(*) as signals_today FROM signals WHERE received_at >= datetime('now', 'start of day')").first<{ signals_today: number }>(),
      db.prepare('SELECT COUNT(*) as total_trades FROM journal_trades').first<{ total_trades: number }>(),
      db.prepare('SELECT COUNT(*) as total_generations FROM ea_generations').first<{ total_generations: number }>(),
      db.prepare('SELECT COUNT(*) as purchases, COALESCE(SUM(amount_cents), 0) as revenue_cents FROM ea_generation_credits').first<{ purchases: number; revenue_cents: number }>(),
      db.prepare("SELECT COUNT(*) as total_providers FROM provider_profiles WHERE is_listed = true").first<{ total_providers: number }>(),
      db.prepare("SELECT COUNT(*) as active_subscriptions FROM marketplace_subscriptions WHERE status = 'active'").first<{ active_subscriptions: number }>(),
      db.prepare("SELECT COUNT(*) as total_strategies FROM strategy_templates WHERE is_published = true").first<{ total_strategies: number }>(),
    ]);

    const roleMap: Record<string, number> = {};
    for (const row of accountsByRole.results ?? []) {
      roleMap[row.role] = row.count;
    }

    return c.json<ApiResponse>({
      data: {
        total_users: totalUsers?.total_users ?? 0,
        new_users_week: newUsersWeek?.new_users_week ?? 0,
        master_accounts: roleMap['master'] ?? 0,
        follower_accounts: roleMap['follower'] ?? 0,
        total_signals: totalSignals?.total_signals ?? 0,
        signals_today: signalsToday?.signals_today ?? 0,
        total_trades: totalTrades?.total_trades ?? 0,
        total_generations: totalGenerations?.total_generations ?? 0,
        ea_purchases: creditStats?.purchases ?? 0,
        ea_revenue_cents: creditStats?.revenue_cents ?? 0,
        total_providers: totalProviders?.total_providers ?? 0,
        active_subscriptions: activeSubscriptions?.active_subscriptions ?? 0,
        total_strategies: totalStrategies?.total_strategies ?? 0,
      },
      error: null,
    });
  } catch (err) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      500,
    );
  }
});

// ── GET /admin/users ─────────────────────────────────────────────

admin.get('/users', async (c) => {
  try {
    const search = c.req.query('search') || null;
    const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 200);
    const offset = parseInt(c.req.query('offset') ?? '0', 10) || 0;

    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.plan, u.created_at,
              (SELECT COUNT(*) FROM accounts WHERE user_id = u.id AND is_active = true) as account_count,
              (SELECT COUNT(*) FROM ea_generations WHERE user_id = u.id) as ea_count
       FROM users u
       WHERE (?1 IS NULL OR u.email LIKE '%' || ?1 || '%' OR u.name LIKE '%' || ?1 || '%')
       ORDER BY u.created_at DESC
       LIMIT ?2 OFFSET ?3`,
    )
      .bind(search, limit, offset)
      .all();

    const total = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users u
       WHERE (?1 IS NULL OR u.email LIKE '%' || ?1 || '%' OR u.name LIKE '%' || ?1 || '%')`,
    )
      .bind(search)
      .first<{ count: number }>();

    return c.json<ApiResponse>({
      data: { users: results ?? [], total: total?.count ?? 0 },
      error: null,
    });
  } catch (err) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      500,
    );
  }
});

// ── GET /admin/providers ─────────────────────────────────────────

admin.get('/providers', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT pp.*, ps.total_trades, ps.win_rate, ps.total_pnl, ps.subscriber_count,
              u.email as user_email
       FROM provider_profiles pp
       JOIN users u ON u.id = pp.user_id
       LEFT JOIN provider_stats ps ON ps.provider_id = pp.id
       ORDER BY ps.subscriber_count DESC`,
    ).all();

    return c.json<ApiResponse>({
      data: { providers: results ?? [] },
      error: null,
    });
  } catch (err) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      500,
    );
  }
});

// ── GET /admin/generations ───────────────────────────────────────

admin.get('/generations', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT eg.id, eg.generated_at, eg.parameters_json,
              u.email as user_email,
              st.name as strategy_name, st.slug
       FROM ea_generations eg
       JOIN users u ON u.id = eg.user_id
       JOIN strategy_templates st ON st.id = eg.strategy_id
       ORDER BY eg.generated_at DESC
       LIMIT 50`,
    ).all();

    return c.json<ApiResponse>({
      data: { generations: results ?? [] },
      error: null,
    });
  } catch (err) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      500,
    );
  }
});

// ── GET /admin/revenue ───────────────────────────────────────────

admin.get('/revenue', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT ec.id, ec.user_id, ec.reference, ec.amount_cents, ec.credited_at,
              u.email as user_email
       FROM ea_generation_credits ec
       JOIN users u ON u.id = ec.user_id
       ORDER BY ec.credited_at DESC
       LIMIT 50`,
    ).all();

    return c.json<ApiResponse>({
      data: { payments: results ?? [] },
      error: null,
    });
  } catch (err) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      500,
    );
  }
});

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const founderAnalytics = new Hono<{ Bindings: Env }>();

const ADMIN_EMAILS = ['oh84dev@gmail.com'];

// ── Middleware: admin-only ─────────────────────────────────────

async function isAdmin(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  return user ? ADMIN_EMAILS.includes(user.email) : false;
}

// ── POST /analytics/track — Lightweight event tracker ─────────
// Public endpoint — no auth required (fire-and-forget from frontend)

founderAnalytics.post('/track', async (c) => {
  const body = await c.req.json<{ eventType: string; page?: string; userId?: string; metadata?: string }>();
  if (!body.eventType) return c.json({ ok: true }); // Silently ignore bad events

  try {
    await c.env.DB.prepare(
      `INSERT INTO analytics_events (id, user_id, event_type, page, metadata)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`,
    ).bind(body.userId || null, body.eventType, body.page || null, body.metadata || null).run();
  } catch {}

  return c.json({ ok: true });
});

// ── GET /analytics/founder — Dashboard data (admin only) ──────

founderAnalytics.get('/founder', async (c) => {
  const userId = c.get('userId');
  if (!userId || !(await isAdmin(c.env.DB, userId))) {
    return c.json<ApiResponse>({ data: null, error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  }

  // 1. Signups per day (last 30 days)
  const { results: signups } = await c.env.DB.prepare(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM users WHERE created_at >= datetime('now', '-30 days')
     GROUP BY DATE(created_at) ORDER BY date DESC`,
  ).all<{ date: string; count: number }>();

  // 2. Total users
  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();

  // 3. Page views (last 7 days)
  const { results: pageViews } = await c.env.DB.prepare(
    `SELECT page, COUNT(*) as views
     FROM analytics_events WHERE event_type = 'page_view' AND created_at >= datetime('now', '-7 days')
     GROUP BY page ORDER BY views DESC LIMIT 20`,
  ).all<{ page: string; views: number }>();

  // 4. Feature usage (last 7 days)
  const { results: featureUsage } = await c.env.DB.prepare(
    `SELECT event_type, COUNT(*) as count
     FROM analytics_events WHERE event_type != 'page_view' AND created_at >= datetime('now', '-7 days')
     GROUP BY event_type ORDER BY count DESC LIMIT 20`,
  ).all<{ event_type: string; count: number }>();

  // 5. Active users (last 7 days — users with at least 1 event)
  const activeUsers = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as c FROM analytics_events
     WHERE user_id IS NOT NULL AND created_at >= datetime('now', '-7 days')`,
  ).first<{ c: number }>();

  // 6. Academy progress stats
  const academyStats = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as users_started,
       SUM(CASE WHEN quiz_passed = 1 THEN 1 ELSE 0 END) as lessons_completed,
       COUNT(*) as total_attempts
     FROM academy_progress`,
  ).first<{ users_started: number; lessons_completed: number; total_attempts: number }>();

  // 7. Accounts created
  const totalAccounts = await c.env.DB.prepare('SELECT COUNT(*) as c FROM accounts').first<{ c: number }>();

  // 8. Trades journaled
  const totalTrades = await c.env.DB.prepare('SELECT COUNT(*) as c FROM journal_trades').first<{ c: number }>();

  // 9. Counselor sessions
  const totalCounselorSessions = await c.env.DB.prepare('SELECT COUNT(*) as c FROM counselor_sessions').first<{ c: number }>();

  // 10. Social posts
  const totalPosts = await c.env.DB.prepare('SELECT COUNT(*) as c FROM social_posts').first<{ c: number }>();

  // 11. EA generations
  const totalEAs = await c.env.DB.prepare('SELECT COUNT(*) as c FROM ea_generations').first<{ c: number }>();

  // 12. Telegram connections
  const telegramUsers = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM notification_preferences WHERE channel = 'telegram'`,
  ).first<{ c: number }>();

  return c.json<ApiResponse>({
    data: {
      signups: signups || [],
      totalUsers: totalUsers?.c || 0,
      activeUsers7d: activeUsers?.c || 0,
      pageViews: pageViews || [],
      featureUsage: featureUsage || [],
      academy: academyStats || {},
      totals: {
        accounts: totalAccounts?.c || 0,
        trades: totalTrades?.c || 0,
        counselorSessions: totalCounselorSessions?.c || 0,
        socialPosts: totalPosts?.c || 0,
        eaGenerations: totalEAs?.c || 0,
        telegramUsers: telegramUsers?.c || 0,
      },
    },
    error: null,
  });
});

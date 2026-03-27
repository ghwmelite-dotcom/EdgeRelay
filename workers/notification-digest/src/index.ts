import { sendTelegramMessage } from '@edgerelay/shared';

interface Env {
  DB: D1Database;
  BOT_STATE: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
}

interface PrefRow {
  user_id: string;
  daily_summary: number;
  weekly_digest: number;
  timezone: string;
  summary_hour: number;
}

interface JournalStats {
  total_pnl: number;
  trade_count: number;
  win_count: number;
  best_symbol: string | null;
  best_pnl: number;
  worst_symbol: string | null;
  worst_pnl: number;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const isFriday = now.getUTCDay() === 5;

    // Get all users with summaries enabled
    const { results } = await env.DB.prepare(
      'SELECT user_id, daily_summary, weekly_digest, timezone, summary_hour FROM notification_preferences WHERE daily_summary = 1 OR weekly_digest = 1',
    ).all<PrefRow>();

    if (!results || results.length === 0) return;

    for (const pref of results) {
      // Calculate the user's current hour
      const userHour = getUserHour(utcHour, pref.timezone);
      if (userHour !== pref.summary_hour) continue;

      // Get chatId
      const raw = await env.BOT_STATE.get(`user:${pref.user_id}:tg`);
      if (!raw) continue;

      let chatId: string;
      try {
        const parsed = JSON.parse(raw) as { chatId?: unknown };
        chatId = String(parsed.chatId);
      } catch {
        chatId = raw;
      }

      // Daily summary
      if (pref.daily_summary) {
        const dedupKey = `digest-sent:${pref.user_id}:daily:${now.toISOString().slice(0, 10)}`;
        const alreadySent = await env.BOT_STATE.get(dedupKey);
        if (!alreadySent) {
          const stats = await getDailyStats(env.DB, pref.user_id);
          if (stats) {
            const msg = formatDailySummary(stats, now);
            ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));
            await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
          }
        }
      }

      // Weekly digest (Friday only)
      if (pref.weekly_digest && isFriday) {
        const weekKey = getWeekKey(now);
        const dedupKey = `digest-sent:${pref.user_id}:weekly:${weekKey}`;
        const alreadySent = await env.BOT_STATE.get(dedupKey);
        if (!alreadySent) {
          const stats = await getWeeklyStats(env.DB, pref.user_id);
          if (stats) {
            const activeAccounts = await getActiveAccountCount(env.DB, pref.user_id);
            const msg = formatWeeklyDigest(stats, activeAccounts, now);
            ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));
            await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 604800 });
          }
        }
      }
    }
  },
};

function getUserHour(utcHour: number, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const now = new Date();
    now.setUTCHours(utcHour, 0, 0, 0);
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : utcHour;
  } catch {
    return utcHour; // Fallback to UTC if timezone invalid
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Sunday of this week
  return d.toISOString().slice(0, 10);
}

async function getDailyStats(db: D1Database, userId: string): Promise<JournalStats | null> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare(
      `SELECT
        COALESCE(SUM(profit), 0) as total_pnl,
        COUNT(*) as trade_count,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as win_count
      FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) = ?`,
    )
    .bind(userId, today)
    .first<{ total_pnl: number; trade_count: number; win_count: number }>();

  if (!row || row.trade_count === 0) return null;

  // Best and worst trades
  const best = await db
    .prepare(
      `SELECT symbol, profit FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) = ?
      ORDER BY profit DESC LIMIT 1`,
    )
    .bind(userId, today)
    .first<{ symbol: string; profit: number }>();

  const worst = await db
    .prepare(
      `SELECT symbol, profit FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) = ?
      ORDER BY profit ASC LIMIT 1`,
    )
    .bind(userId, today)
    .first<{ symbol: string; profit: number }>();

  return {
    total_pnl: row.total_pnl,
    trade_count: row.trade_count,
    win_count: row.win_count,
    best_symbol: best?.symbol ?? null,
    best_pnl: best?.profit ?? 0,
    worst_symbol: worst?.symbol ?? null,
    worst_pnl: worst?.profit ?? 0,
  };
}

async function getWeeklyStats(db: D1Database, userId: string): Promise<JournalStats | null> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const startDate = weekAgo.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  const row = await db
    .prepare(
      `SELECT
        COALESCE(SUM(profit), 0) as total_pnl,
        COUNT(*) as trade_count,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as win_count
      FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) BETWEEN ? AND ?`,
    )
    .bind(userId, startDate, endDate)
    .first<{ total_pnl: number; trade_count: number; win_count: number }>();

  if (!row || row.trade_count === 0) return null;

  const best = await db
    .prepare(
      `SELECT symbol, SUM(profit) as total FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) BETWEEN ? AND ?
      GROUP BY symbol ORDER BY total DESC LIMIT 1`,
    )
    .bind(userId, startDate, endDate)
    .first<{ symbol: string; total: number }>();

  return {
    total_pnl: row.total_pnl,
    trade_count: row.trade_count,
    win_count: row.win_count,
    best_symbol: best?.symbol ?? null,
    best_pnl: best?.total ?? 0,
    worst_symbol: null,
    worst_pnl: 0,
  };
}

async function getActiveAccountCount(
  db: D1Database,
  userId: string,
): Promise<{ active: number; total: number }> {
  const { results } = await db
    .prepare('SELECT last_heartbeat FROM accounts WHERE user_id = ?')
    .bind(userId)
    .all<{ last_heartbeat: string | null }>();

  const total = results?.length ?? 0;
  const twoMinAgo = Date.now() - 120_000;
  const active =
    results?.filter((a) => {
      if (!a.last_heartbeat) return false;
      const ts = parseFloat(a.last_heartbeat);
      const ms =
        !isNaN(ts) && ts > 1e9 && ts < 1e12 ? ts * 1000 : new Date(a.last_heartbeat).getTime();
      return !isNaN(ms) && ms > twoMinAgo;
    }).length ?? 0;

  return { active, total };
}

function formatDailySummary(stats: JournalStats, now: Date): string {
  const date = now.toISOString().slice(0, 10);
  const winRate = stats.trade_count > 0 ? Math.round((stats.win_count / stats.trade_count) * 100) : 0;
  const pnlSign = stats.total_pnl >= 0 ? '+' : '';
  const lines = [
    `📊 <b>Daily Summary — ${date}</b>`,
    '',
    `P&L: <b>${pnlSign}$${stats.total_pnl.toFixed(2)}</b>`,
    `Trades: ${stats.trade_count}`,
    `Win Rate: ${winRate}%`,
  ];
  if (stats.best_symbol) lines.push(`Best: ${stats.best_symbol} +$${stats.best_pnl.toFixed(2)}`);
  if (stats.worst_symbol) lines.push(`Worst: ${stats.worst_symbol} $${stats.worst_pnl.toFixed(2)}`);
  return lines.join('\n');
}

function formatWeeklyDigest(
  stats: JournalStats,
  accounts: { active: number; total: number },
  now: Date,
): string {
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - 7);
  const winRate = stats.trade_count > 0 ? Math.round((stats.win_count / stats.trade_count) * 100) : 0;
  const pnlSign = stats.total_pnl >= 0 ? '+' : '';
  const lines = [
    `📈 <b>Weekly Recap — ${startDate.toISOString().slice(0, 10)} to ${endDate}</b>`,
    '',
    `Total P&L: <b>${pnlSign}$${stats.total_pnl.toFixed(2)}</b>`,
    `Trades: ${stats.trade_count}`,
    `Win Rate: ${winRate}%`,
  ];
  if (stats.best_symbol) lines.push(`Top Symbol: ${stats.best_symbol}`);
  lines.push(`Active Accounts: ${accounts.active}/${accounts.total} online`);
  return lines.join('\n');
}

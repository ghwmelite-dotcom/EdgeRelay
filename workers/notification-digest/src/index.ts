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
  morning_brief: number;
  news_alerts: number;
  session_alerts: number;
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

const SESSION_TIMES = [
  { name: 'Sydney', openHour: 21, closeHour: 6 },
  { name: 'Tokyo', openHour: 0, closeHour: 9 },
  { name: 'London', openHour: 7, closeHour: 16 },
  { name: 'New York', openHour: 12, closeHour: 21 },
];

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date();

    // Pre-event alerts (every minute)
    await checkPreEventAlerts(env, ctx);

    // Breaking news push (every minute — pushes new FinancialJuice headlines)
    await checkBreakingNews(env, ctx);

    // Session alerts (every minute, fires only at exact session times)
    await checkSessionAlerts(env, ctx);

    // Daily/weekly/morning summaries (only at the top of each hour)
    if (now.getUTCMinutes() === 0) {
      console.log(`[digest] Top-of-hour cron fired at ${now.toISOString()}`);
      await sendDigests(env, ctx, now);
    }
  },
};

async function checkPreEventAlerts(env: Env, ctx: ExecutionContext): Promise<void> {
  const now = new Date();

  // Find HIGH-impact events starting in 30±1 or 5±1 minutes
  for (const minutesBefore of [30, 5]) {
    const targetTime = new Date(now.getTime() + minutesBefore * 60000);
    const windowStart = new Date(targetTime.getTime() - 60000).toISOString();
    const windowEnd = new Date(targetTime.getTime() + 60000).toISOString();

    const { results: events } = await env.DB.prepare(
      `SELECT id, event_name, currency, event_time, forecast, previous
       FROM news_events
       WHERE impact = 'high' AND event_time >= ? AND event_time <= ?`,
    )
      .bind(windowStart, windowEnd)
      .all<{
        id: string;
        event_name: string;
        currency: string;
        event_time: string;
        forecast: string | null;
        previous: string | null;
      }>();

    if (!events || events.length === 0) continue;

    // Get all users with news_alerts enabled
    const { results: users } = await env.DB.prepare(
      `SELECT user_id FROM notification_preferences WHERE news_alerts = 1`,
    ).all<{ user_id: string }>();

    if (!users) continue;

    for (const event of events) {
      for (const user of users) {
        const dedupKey = `alert-sent:${user.user_id}:${event.id}:${minutesBefore}`;
        const alreadySent = await env.BOT_STATE.get(dedupKey);
        if (alreadySent) continue;

        const raw = await env.BOT_STATE.get(`user:${user.user_id}:tg`);
        if (!raw) continue;

        let chatId: string;
        try {
          chatId = String((JSON.parse(raw) as { chatId?: unknown }).chatId);
        } catch {
          chatId = raw;
        }

        const emoji = minutesBefore === 30 ? '⚠️' : '🚨';
        const label = minutesBefore === 30 ? 'Heads Up' : 'Imminent';
        const forecastInfo = event.forecast ? ` (forecast: ${event.forecast})` : '';

        const msg = `${emoji} <b>${label}: ${event.event_name}</b> in ${minutesBefore} min${forecastInfo}\n\nCurrency: ${event.currency}\nTime: ${event.event_time}`;

        ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));
        await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 3600 });
      }
    }
  }
}

/**
 * Pushes new FinancialJuice headlines to users with news_alerts enabled.
 * Runs every minute. Uses KV dedup to ensure each headline is sent only once per user.
 * Batches up to 5 headlines per message to avoid spam.
 */
async function checkBreakingNews(env: Env, ctx: ExecutionContext): Promise<void> {
  // Fetch news items from the last 20 minutes (covers 15-min cron + buffer)
  const { results: newsItems } = await env.DB.prepare(
    `SELECT id, headline, source, related_currencies, published_at, url
     FROM market_news
     WHERE source = 'FinancialJuice'
       AND published_at >= datetime('now', '-20 minutes')
     ORDER BY published_at DESC
     LIMIT 10`,
  ).all<{
    id: string;
    headline: string;
    source: string;
    related_currencies: string | null;
    published_at: string;
    url: string | null;
  }>();

  if (!newsItems || newsItems.length === 0) return;

  // Get all users with news_alerts enabled
  const { results: users } = await env.DB.prepare(
    `SELECT user_id FROM notification_preferences WHERE news_alerts = 1`,
  ).all<{ user_id: string }>();

  if (!users || users.length === 0) return;

  for (const user of users) {
    const raw = await env.BOT_STATE.get(`user:${user.user_id}:tg`);
    if (!raw) continue;

    let chatId: string;
    try {
      chatId = String((JSON.parse(raw) as { chatId?: unknown }).chatId);
    } catch {
      chatId = raw;
    }

    // Filter to only unsent headlines for this user
    const unsent: typeof newsItems = [];
    for (const item of newsItems) {
      const dedupKey = `news-push:${user.user_id}:${item.id}`;
      const alreadySent = await env.BOT_STATE.get(dedupKey);
      if (!alreadySent) unsent.push(item);
    }

    if (unsent.length === 0) continue;

    // Build a batched message (max 5 headlines)
    const batch = unsent.slice(0, 5);
    const lines: string[] = ['📰 <b>Breaking News</b>', ''];

    for (const item of batch) {
      const time = item.published_at.slice(11, 16);
      const currencies = item.related_currencies
        ? ` [${item.related_currencies}]`
        : '';
      lines.push(`• <b>${escapeHtml(item.headline)}</b>${currencies}`);
      lines.push(`  <i>${time} UTC — ${item.source}</i>`);
      lines.push('');
    }

    if (unsent.length > 5) {
      lines.push(`<i>+${unsent.length - 5} more headlines</i>`);
    }

    const msg = lines.join('\n').trim();
    ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));

    // Mark all as sent (TTL 6 hours to prevent re-sending)
    for (const item of batch) {
      const dedupKey = `news-push:${user.user_id}:${item.id}`;
      await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 21600 });
    }

    console.log(`[digest] Pushed ${batch.length} FinancialJuice headlines to user ${user.user_id}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function checkSessionAlerts(env: Env, ctx: ExecutionContext): Promise<void> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  // Only fire on the exact top of the hour
  if (utcMinute !== 0) return;

  const today = now.toISOString().slice(0, 10);
  // Skip weekends
  const day = now.getUTCDay();
  if (day === 6 || (day === 0 && utcHour < 21) || (day === 5 && utcHour >= 21)) return;

  for (const session of SESSION_TIMES) {
    let type: 'open' | 'close' | null = null;
    if (utcHour === session.openHour) type = 'open';
    if (utcHour === session.closeHour) type = 'close';
    if (!type) continue;

    const { results: users } = await env.DB.prepare(
      `SELECT user_id FROM notification_preferences WHERE session_alerts = 1`,
    ).all<{ user_id: string }>();
    if (!users) continue;

    for (const user of users) {
      const dedupKey = `session-alert:${user.user_id}:${session.name}:${type}:${today}`;
      const alreadySent = await env.BOT_STATE.get(dedupKey);
      if (alreadySent) continue;

      const raw = await env.BOT_STATE.get(`user:${user.user_id}:tg`);
      if (!raw) continue;

      let chatId: string;
      try {
        chatId = String((JSON.parse(raw) as { chatId?: unknown }).chatId);
      } catch {
        chatId = raw;
      }

      const emoji = type === 'open' ? '🟢' : '🔴';
      const msg = `${emoji} <b>${session.name} Session ${type === 'open' ? 'Open' : 'Closed'}</b> (${String(utcHour).padStart(2, '0')}:00 UTC)`;

      ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));
      await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
    }
  }
}

async function formatMorningBrief(db: D1Database, now: Date): Promise<string | null> {
  const today = now.toISOString().slice(0, 10);
  const utcHour = now.getUTCHours();

  // Sessions status
  const sessions = SESSION_TIMES.map((s) => {
    const open =
      s.openHour <= s.closeHour
        ? utcHour >= s.openHour && utcHour < s.closeHour
        : utcHour >= s.openHour || utcHour < s.closeHour;
    return `${s.name} ${open ? '🟢' : '🔴'}`;
  });

  // Today's high-impact events
  const { results: events } = await db
    .prepare(
      `SELECT event_name, currency, event_time, forecast FROM news_events
       WHERE impact = 'high' AND DATE(event_time) = ? ORDER BY event_time`,
    )
    .bind(today)
    .all<{ event_name: string; currency: string; event_time: string; forecast: string | null }>();

  // Top 3 headlines
  const { results: news } = await db
    .prepare(`SELECT headline, source FROM market_news ORDER BY published_at DESC LIMIT 3`)
    .all<{ headline: string; source: string }>();

  const lines = [
    `🌅 <b>Market Brief — ${today}</b>`,
    '',
    `📊 Sessions: ${sessions.join(' • ')}`,
  ];

  if (events && events.length > 0) {
    lines.push('', `⚡ ${events.length} high-impact event${events.length > 1 ? 's' : ''} today:`);
    for (const e of events) {
      const time = e.event_time.slice(11, 16);
      const forecast = e.forecast ? ` (forecast: ${e.forecast})` : '';
      lines.push(`• ${time} UTC — ${e.event_name}${forecast}`);
    }
  } else {
    lines.push('', '✅ No high-impact events today');
  }

  if (news && news.length > 0) {
    lines.push('', '📰 Latest:');
    for (const n of news) {
      lines.push(`• ${n.headline.slice(0, 80)} — ${n.source}`);
    }
  }

  return lines.join('\n');
}

async function sendDigests(env: Env, _ctx: ExecutionContext, now: Date): Promise<void> {
  const utcHour = now.getUTCHours();
  // Send weekly on Friday OR Saturday (catches missed Friday digests)
  const dayOfWeek = now.getUTCDay();
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;

  // Get all users with any digest/alert pref enabled
  const { results } = await env.DB.prepare(
    `SELECT user_id, daily_summary, weekly_digest, morning_brief, news_alerts, session_alerts, timezone, summary_hour
     FROM notification_preferences
     WHERE daily_summary = 1 OR weekly_digest = 1 OR morning_brief = 1 OR news_alerts = 1 OR session_alerts = 1`,
  ).all<PrefRow>();

  if (!results || results.length === 0) {
    console.log('[digest] No users with digest prefs enabled');
    return;
  }

  console.log(`[digest] Processing ${results.length} user(s) at UTC hour ${utcHour}`);

  for (const pref of results) {
    // Only send hourly digests when the user's local hour matches their preference
    const userHour = getUserHour(utcHour, pref.timezone);
    if (userHour !== pref.summary_hour) continue;

    console.log(`[digest] User ${pref.user_id}: local hour ${userHour} matches summary_hour ${pref.summary_hour}`);

    // Get chatId
    const raw = await env.BOT_STATE.get(`user:${pref.user_id}:tg`);
    if (!raw) {
      console.log(`[digest] User ${pref.user_id}: no Telegram link found in KV`);
      continue;
    }

    let chatId: string;
    try {
      const parsed = JSON.parse(raw) as { chatId?: unknown };
      chatId = String(parsed.chatId);
    } catch {
      chatId = raw;
    }

    // Resolve the user's local date for trade queries (may differ from UTC date)
    const userDate = getUserLocalDate(now, pref.timezone);

    // Daily summary
    if (pref.daily_summary) {
      const dedupKey = `digest-sent:${pref.user_id}:daily:${userDate}`;
      const alreadySent = await env.BOT_STATE.get(dedupKey);
      if (!alreadySent) {
        try {
          const stats = await getDailyStats(env.DB, pref.user_id, userDate);
          const msg = formatDailySummary(stats, now);
          const sent = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg);
          if (sent) {
            await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
            console.log(`[digest] Daily summary sent to user ${pref.user_id}`);
          } else {
            console.error(`[digest] Failed to send daily summary to user ${pref.user_id}, chatId ${chatId}`);
          }
        } catch (err) {
          console.error(`[digest] Daily summary error for user ${pref.user_id}:`, err);
        }
      }
    }

    // Weekly digest (Friday or Saturday — catches missed Friday window)
    if (pref.weekly_digest && isFridayOrSaturday) {
      const weekKey = getWeekKey(now);
      const dedupKey = `digest-sent:${pref.user_id}:weekly:${weekKey}`;
      const alreadySent = await env.BOT_STATE.get(dedupKey);
      if (!alreadySent) {
        try {
          const stats = await getWeeklyStats(env.DB, pref.user_id);
          const activeAccounts = await getActiveAccountCount(env.DB, pref.user_id);
          const msg = formatWeeklyDigest(stats, activeAccounts, now);
          const sent = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg);
          if (sent) {
            await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 604800 });
            console.log(`[digest] Weekly digest sent to user ${pref.user_id}`);
          } else {
            console.error(`[digest] Failed to send weekly digest to user ${pref.user_id}, chatId ${chatId}`);
          }
        } catch (err) {
          console.error(`[digest] Weekly digest error for user ${pref.user_id}:`, err);
        }
      }
    }

    // Morning brief (independent from daily_summary — different content)
    if (pref.morning_brief) {
      const dedupKey = `digest-sent:${pref.user_id}:morning:${userDate}`;
      const alreadySent = await env.BOT_STATE.get(dedupKey);
      if (!alreadySent) {
        try {
          const brief = await formatMorningBrief(env.DB, now);
          if (brief) {
            const sent = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, brief);
            if (sent) {
              await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
              console.log(`[digest] Morning brief sent to user ${pref.user_id}`);
            } else {
              console.error(`[digest] Failed to send morning brief to user ${pref.user_id}, chatId ${chatId}`);
            }
          }
        } catch (err) {
          console.error(`[digest] Morning brief error for user ${pref.user_id}:`, err);
        }
      }
    }
  }
}

function getUserLocalDate(now: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now); // Returns YYYY-MM-DD in en-CA locale
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

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

async function getDailyStats(db: D1Database, userId: string, dateStr: string): Promise<JournalStats> {
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
    .bind(userId, dateStr)
    .first<{ total_pnl: number; trade_count: number; win_count: number }>();

  if (!row || row.trade_count === 0) {
    return {
      total_pnl: 0, trade_count: 0, win_count: 0,
      best_symbol: null, best_pnl: 0, worst_symbol: null, worst_pnl: 0,
    };
  }

  // Best and worst trades
  const best = await db
    .prepare(
      `SELECT symbol, profit FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) = ?
      ORDER BY profit DESC LIMIT 1`,
    )
    .bind(userId, dateStr)
    .first<{ symbol: string; profit: number }>();

  const worst = await db
    .prepare(
      `SELECT symbol, profit FROM journal_trades jt
      JOIN accounts a ON jt.account_id = a.id
      WHERE a.user_id = ? AND DATE(jt.close_time) = ?
      ORDER BY profit ASC LIMIT 1`,
    )
    .bind(userId, dateStr)
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

async function getWeeklyStats(db: D1Database, userId: string): Promise<JournalStats> {
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

  if (!row || row.trade_count === 0) {
    return {
      total_pnl: 0, trade_count: 0, win_count: 0,
      best_symbol: null, best_pnl: 0, worst_symbol: null, worst_pnl: 0,
    };
  }

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
  const lines = [
    `📊 <b>Daily Summary — ${date}</b>`,
    '',
  ];

  if (stats.trade_count === 0) {
    lines.push('No trades closed today. Rest up — the market will be there tomorrow.');
  } else {
    const winRate = Math.round((stats.win_count / stats.trade_count) * 100);
    const pnlSign = stats.total_pnl >= 0 ? '+' : '';
    lines.push(
      `P&L: <b>${pnlSign}$${stats.total_pnl.toFixed(2)}</b>`,
      `Trades: ${stats.trade_count}`,
      `Win Rate: ${winRate}%`,
    );
    if (stats.best_symbol) lines.push(`Best: ${stats.best_symbol} +$${stats.best_pnl.toFixed(2)}`);
    if (stats.worst_symbol) lines.push(`Worst: ${stats.worst_symbol} $${stats.worst_pnl.toFixed(2)}`);
  }

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
  const lines = [
    `📈 <b>Weekly Recap — ${startDate.toISOString().slice(0, 10)} to ${endDate}</b>`,
    '',
  ];

  if (stats.trade_count === 0) {
    lines.push('No trades this week. Review your strategy and come back strong.');
  } else {
    const winRate = Math.round((stats.win_count / stats.trade_count) * 100);
    const pnlSign = stats.total_pnl >= 0 ? '+' : '';
    lines.push(
      `Total P&L: <b>${pnlSign}$${stats.total_pnl.toFixed(2)}</b>`,
      `Trades: ${stats.trade_count}`,
      `Win Rate: ${winRate}%`,
    );
    if (stats.best_symbol) lines.push(`Top Symbol: ${stats.best_symbol}`);
  }

  lines.push(`Active Accounts: ${accounts.active}/${accounts.total} online`);
  return lines.join('\n');
}

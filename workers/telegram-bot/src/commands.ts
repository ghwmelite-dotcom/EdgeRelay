import type { Env, TelegramUser } from './types';

interface CommandResult {
  text: string;
  replyMarkup?: unknown;
}

// ── /start ─────────────────────────────────────────────────────────
export async function handleStart(
  env: Env,
  user: TelegramUser,
  chatId: number,
  args?: string,
): Promise<CommandResult> {
  // Deep-link flow: /start {code}
  if (args && args.length > 0) {
    const code = args.trim();
    const userId = await env.BOT_STATE.get(`tg-link:${code}`);

    if (!userId) {
      return {
        text: '❌ This link has expired. Please generate a new one from your dashboard at trademetricspro.com/settings',
      };
    }

    // Check if already linked
    const existing = await env.BOT_STATE.get(`user:${userId}:tg`);
    if (existing) {
      await env.BOT_STATE.delete(`tg-link:${code}`);
      return { text: "✅ You're already connected! Your notifications are active." };
    }

    const linkedAt = new Date().toISOString();

    // Store both mappings (include telegramUserId in forward mapping for unlinking from dashboard)
    await env.BOT_STATE.put(
      `user:${userId}:tg`,
      JSON.stringify({ chatId, linked_at: linkedAt, telegramUserId: user.id }),
    );
    await env.BOT_STATE.put(
      `tg:${user.id}`,
      JSON.stringify({ user_id: userId, chat_id: chatId, linked_at: linkedAt }),
    );

    // Create notification preferences row (ON CONFLICT DO NOTHING to preserve existing)
    await env.DB.prepare(
      `INSERT INTO notification_preferences (id, user_id) VALUES (lower(hex(randomblob(16))), ?) ON CONFLICT(user_id) DO NOTHING`,
    )
      .bind(userId)
      .run();

    // Delete one-time code
    await env.BOT_STATE.delete(`tg-link:${code}`);

    return {
      text: [
        '✅ <b>Connected to TradeMetrics Pro!</b>',
        '',
        "You'll now receive:",
        '• 🔐 Login alerts',
        '• 📊 Trade signal notifications',
        '• 🛡 Equity guard alerts',
        '• 📈 Daily &amp; weekly performance summaries',
        '',
        'Manage your preferences at trademetricspro.com/settings',
      ].join('\n'),
    };
  }

  // Default welcome (no code)
  return {
    text: [
      '👋 Welcome to <b>TradeMetrics Pro</b>!',
      '',
      'To connect your account, use the "Connect Telegram" button in your dashboard.',
      '',
      'Available commands:',
      '/status — Check connection status',
      '/accounts — List trading accounts',
      '/signals — Recent signals',
      '/unlink — Disconnect Telegram',
      '/help — Show all commands',
    ].join('\n'),
  };
}

// ── /link <api_key> ────────────────────────────────────────────────
export async function handleLink(
  env: Env,
  user: TelegramUser,
  chatId: number,
  apiKey: string | undefined,
): Promise<CommandResult> {
  if (!apiKey) {
    return {
      text: 'Usage: <code>/link &lt;api_key&gt;</code>\n\nYou can find your API key in the EdgeRelay dashboard under Account Settings.',
    };
  }

  try {
    const account = await env.DB.prepare(
      'SELECT id, user_id, alias FROM accounts WHERE api_key = ?',
    )
      .bind(apiKey)
      .first<{ id: string; user_id: string; alias: string }>();

    if (!account) {
      return { text: 'API key not found. Please check your key and try again.' };
    }

    const dbUser = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
      .bind(account.user_id)
      .first<{ id: string; email: string }>();

    if (!dbUser) {
      return { text: 'Account owner not found. Please contact support.' };
    }

    // Store forward mapping: telegram user → edgerelay user
    await env.BOT_STATE.put(
      `tg:${user.id}`,
      JSON.stringify({
        user_id: dbUser.id,
        chat_id: chatId,
        linked_at: new Date().toISOString(),
      }),
    );

    // Store reverse mapping: edgerelay user → telegram chat (for proactive notifications)
    await env.BOT_STATE.put(`user:${dbUser.id}:tg`, String(chatId));

    return {
      text: `Linked to <b>${escapeHtml(dbUser.email)}</b>!\n\nYou'll receive signal notifications and alerts here. Use /status to check your accounts.`,
    };
  } catch (err) {
    console.error('Link error:', err);
    return { text: 'An error occurred while linking. Please try again.' };
  }
}

// ── /unlink ────────────────────────────────────────────────────────
export async function handleUnlink(env: Env, user: TelegramUser): Promise<CommandResult> {
  try {
    const mappingRaw = await env.BOT_STATE.get(`tg:${user.id}`);
    if (!mappingRaw) {
      return { text: 'No account linked. Use /link &lt;api_key&gt; to link one.' };
    }

    const mapping = JSON.parse(mappingRaw) as { user_id: string };

    // Remove both mappings
    await env.BOT_STATE.delete(`tg:${user.id}`);
    await env.BOT_STATE.delete(`user:${mapping.user_id}:tg`);

    // Delete notification preferences from D1
    await env.DB.prepare('DELETE FROM notification_preferences WHERE user_id = ?')
      .bind(mapping.user_id)
      .run();

    return { text: 'Unlinked. You won\'t receive notifications anymore.\n\nUse /link &lt;api_key&gt; to re-link at any time.' };
  } catch (err) {
    console.error('Unlink error:', err);
    return { text: 'An error occurred while unlinking. Please try again.' };
  }
}

// ── /status ────────────────────────────────────────────────────────
export async function handleStatus(env: Env, user: TelegramUser): Promise<CommandResult> {
  const mapping = await getUserMapping(env, user.id);
  if (!mapping) {
    return { text: 'No account linked. Use /link &lt;api_key&gt; to get started.' };
  }

  try {
    const accounts = await env.DB.prepare(
      `SELECT
        a.id, a.role, a.alias, a.is_active, a.last_heartbeat,
        a.signals_today, a.last_signal_at, a.master_account_id,
        fc.lot_mode, fc.max_daily_loss_percent
      FROM accounts a
      LEFT JOIN follower_config fc ON fc.account_id = a.id
      WHERE a.user_id = ?
      ORDER BY a.role ASC, a.alias ASC`,
    )
      .bind(mapping.user_id)
      .all<{
        id: string;
        role: string;
        alias: string;
        is_active: number;
        last_heartbeat: string | null;
        signals_today: number;
        last_signal_at: string | null;
        master_account_id: string | null;
        lot_mode: string | null;
        max_daily_loss_percent: number | null;
      }>();

    if (!accounts.results.length) {
      return { text: '<b>EdgeRelay Status</b>\n\nNo trading accounts found. Add accounts in the dashboard.' };
    }

    const masters = accounts.results.filter((a) => a.role === 'master');
    const followers = accounts.results.filter((a) => a.role === 'follower');

    // Build master alias lookup for followers
    const masterAliasMap = new Map<string, string>();
    for (const m of masters) {
      masterAliasMap.set(m.id, m.alias);
    }

    const lines: string[] = ['<b>EdgeRelay Status</b>', ''];

    if (masters.length > 0) {
      lines.push('<b>Master Accounts</b>');
      for (const m of masters) {
        const status = getConnectionStatus(m.is_active, m.last_heartbeat);
        lines.push(`  ${escapeHtml(m.alias)} \u2014 ${status}`);
        lines.push(`  Signals today: <code>${m.signals_today}</code>`);
        if (m.last_signal_at) {
          lines.push(`  Last signal: <code>${formatTime(m.last_signal_at)}</code>`);
        }
        lines.push('');
      }
    }

    if (followers.length > 0) {
      lines.push('<b>Follower Accounts</b>');
      for (const f of followers) {
        const status = getConnectionStatus(f.is_active, f.last_heartbeat);
        lines.push(`  ${escapeHtml(f.alias)} \u2014 ${status}`);
        if (f.master_account_id) {
          const masterAlias = masterAliasMap.get(f.master_account_id) ?? 'Unknown';
          lines.push(`  Following: ${escapeHtml(masterAlias)}`);
        }
        const mode = f.lot_mode ?? 'mirror';
        const maxDd = f.max_daily_loss_percent ?? 5;
        lines.push(`  Mode: ${capitalize(mode)} | Max DD: ${maxDd}%`);
        if (!f.is_active && f.last_heartbeat) {
          lines.push(`  Last seen: <code>${timeAgo(f.last_heartbeat)}</code>`);
        }
        lines.push('');
      }
    }

    return { text: lines.join('\n') };
  } catch (err) {
    console.error('Status error:', err);
    return { text: 'An error occurred fetching status. Please try again.' };
  }
}

// ── /signals [count] ───────────────────────────────────────────────
export async function handleSignals(
  env: Env,
  user: TelegramUser,
  countArg: string | undefined,
): Promise<CommandResult> {
  const mapping = await getUserMapping(env, user.id);
  if (!mapping) {
    return { text: 'No account linked. Use /link &lt;api_key&gt; to get started.' };
  }

  const count = Math.min(Math.max(parseInt(countArg ?? '5', 10) || 5, 1), 20);

  try {
    const signals = await env.DB.prepare(
      `SELECT
        s.id, s.action, s.order_type, s.symbol, s.volume, s.price,
        s.sl, s.tp, s.received_at,
        (SELECT COUNT(*) FROM executions e WHERE e.signal_id = s.id AND e.status = 'executed') as executed_count,
        (SELECT COUNT(*) FROM executions e WHERE e.signal_id = s.id) as total_followers
      FROM signals s
      JOIN accounts a ON a.id = s.master_account_id
      WHERE a.user_id = ?
      ORDER BY s.received_at DESC
      LIMIT ?`,
    )
      .bind(mapping.user_id, count)
      .all<{
        id: string;
        action: string;
        order_type: string | null;
        symbol: string;
        volume: number | null;
        price: number | null;
        sl: number | null;
        tp: number | null;
        received_at: string;
        executed_count: number;
        total_followers: number;
      }>();

    if (!signals.results.length) {
      return { text: '<b>Recent Signals</b>\n\nNo signals found.' };
    }

    const lines: string[] = ['<b>Recent Signals</b>', ''];

    signals.results.forEach((s, i) => {
      const time = formatTime(s.received_at);
      const direction = (s.order_type ?? s.action).toUpperCase();
      const vol = s.volume != null ? ` ${s.volume.toFixed(2)}` : '';
      const priceStr = s.price != null ? ` @ ${s.price}` : '';

      lines.push(
        `${i + 1}. <code>${time}</code> ${escapeHtml(s.symbol)} <b>${direction}</b>${vol}${priceStr}`,
      );

      if (s.sl != null || s.tp != null) {
        const parts: string[] = [];
        if (s.sl != null) parts.push(`SL: ${s.sl}`);
        if (s.tp != null) parts.push(`TP: ${s.tp}`);
        lines.push(`   ${parts.join(' | ')}`);
      }

      const statusIcon = s.executed_count === s.total_followers && s.total_followers > 0 ? '\u2705' : '\u26a0\ufe0f';
      lines.push(`   ${statusIcon} ${s.executed_count}/${s.total_followers} followers executed`);
      lines.push('');
    });

    return { text: lines.join('\n') };
  } catch (err) {
    console.error('Signals error:', err);
    return { text: 'An error occurred fetching signals. Please try again.' };
  }
}

// ── /accounts ──────────────────────────────────────────────────────
export async function handleAccounts(env: Env, user: TelegramUser): Promise<CommandResult> {
  const mapping = await getUserMapping(env, user.id);
  if (!mapping) {
    return { text: 'No account linked. Use /link &lt;api_key&gt; to get started.' };
  }

  try {
    const accounts = await env.DB.prepare(
      `SELECT id, role, alias, broker_name, api_key, is_active, last_heartbeat
      FROM accounts
      WHERE user_id = ?
      ORDER BY role ASC, alias ASC`,
    )
      .bind(mapping.user_id)
      .all<{
        id: string;
        role: string;
        alias: string;
        broker_name: string | null;
        api_key: string;
        is_active: number;
        last_heartbeat: string | null;
      }>();

    if (!accounts.results.length) {
      return { text: '<b>Trading Accounts</b>\n\nNo accounts found. Add accounts in the dashboard.' };
    }

    const lines: string[] = ['<b>Trading Accounts</b>', ''];

    for (const a of accounts.results) {
      const status = getConnectionStatus(a.is_active, a.last_heartbeat);
      const maskedKey = maskApiKey(a.api_key);
      const broker = a.broker_name ? ` (${escapeHtml(a.broker_name)})` : '';

      lines.push(`<b>${escapeHtml(a.alias)}</b>${broker}`);
      lines.push(`  Role: ${capitalize(a.role)} | ${status}`);
      lines.push(`  Key: <code>${maskedKey}</code>`);
      lines.push('');
    }

    return { text: lines.join('\n') };
  } catch (err) {
    console.error('Accounts error:', err);
    return { text: 'An error occurred fetching accounts. Please try again.' };
  }
}

// ── /help ──────────────────────────────────────────────────────────
export function handleHelp(): CommandResult {
  return {
    text: [
      '<b>EdgeRelay Bot Commands</b>',
      '',
      '/start \u2014 Welcome message',
      '/link &lt;api_key&gt; \u2014 Link your EdgeRelay account',
      '/unlink \u2014 Unlink your account',
      '/status \u2014 Account & connection status',
      '/signals [count] \u2014 Recent signals (default: 5, max: 20)',
      '/accounts \u2014 List all trading accounts',
      '/help \u2014 Show this help message',
    ].join('\n'),
  };
}

// ── Unknown command ────────────────────────────────────────────────
export function handleUnknown(): CommandResult {
  return { text: 'Unknown command. Type /help for available commands.' };
}

// ── Route command ──────────────────────────────────────────────────
export async function routeCommand(
  env: Env,
  user: TelegramUser,
  chatId: number,
  text: string,
): Promise<CommandResult> {
  // Strip bot mention from commands (e.g., /start@EdgeRelayBot)
  const cleaned = text.trim();
  const parts = cleaned.split(/\s+/);
  const rawCommand = parts[0]?.toLowerCase() ?? '';
  const command = rawCommand.split('@')[0];
  const args = parts.slice(1);

  switch (command) {
    case '/start': {
      const startArgs = text.split(' ').slice(1).join(' ').trim() || undefined;
      return handleStart(env, user, chatId, startArgs);
    }
    case '/link':
      return handleLink(env, user, chatId, args[0]);
    case '/unlink':
      return handleUnlink(env, user);
    case '/status':
      return handleStatus(env, user);
    case '/signals':
      return handleSignals(env, user, args[0]);
    case '/accounts':
      return handleAccounts(env, user);
    case '/help':
      return handleHelp();
    default:
      return handleUnknown();
  }
}

// ── Helpers ────────────────────────────────────────────────────────

interface UserMapping {
  user_id: string;
  chat_id: number;
  linked_at: string;
}

async function getUserMapping(env: Env, telegramUserId: number): Promise<UserMapping | null> {
  const raw = await env.BOT_STATE.get(`tg:${telegramUserId}`);
  if (!raw) return null;
  return JSON.parse(raw) as UserMapping;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getConnectionStatus(isActive: number, lastHeartbeat: string | null): string {
  if (isActive && lastHeartbeat) {
    // Handle both Unix timestamp ("1774625280.0") and ISO date formats
    const ts = parseFloat(lastHeartbeat);
    const heartbeatMs = !isNaN(ts) && ts > 1e9 && ts < 1e12
      ? ts * 1000
      : new Date(lastHeartbeat).getTime();
    const hbAge = Date.now() - heartbeatMs;
    // Consider connected if heartbeat within last 5 minutes
    if (!isNaN(hbAge) && hbAge < 5 * 60 * 1000) {
      return '\ud83d\udfe2 Connected';
    }
  }
  return '\ud83d\udd34 Disconnected';
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z'));
    return d.toISOString().slice(11, 19);
  } catch {
    return isoString;
  }
}

function timeAgo(isoString: string): string {
  try {
    const d = new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z'));
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'unknown';
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

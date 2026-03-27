import type { Env } from './types';
import { TelegramApi } from './telegram';

interface SignalNotification {
  action: string;
  order_type?: string;
  symbol: string;
  volume?: number;
  price?: number;
  sl?: number;
  tp?: number;
  executed_count: number;
  total_followers: number;
  master_alias: string;
}

/**
 * Send a signal notification to the user's linked Telegram chat.
 * Called by other Workers (e.g., AccountRelay DO) after signal fan-out.
 */
export async function notifySignal(
  env: Env,
  userId: string,
  signal: SignalNotification,
): Promise<boolean> {
  const chatId = await getChatId(env, userId);
  if (!chatId) return false;

  const direction = (signal.order_type ?? signal.action).toUpperCase();
  const vol = signal.volume != null ? ` ${signal.volume.toFixed(2)}` : '';
  const priceStr = signal.price != null ? ` @ ${signal.price}` : '';

  const lines: string[] = [
    `<b>New Signal</b> from ${escapeHtml(signal.master_alias)}`,
    '',
    `${escapeHtml(signal.symbol)} <b>${direction}</b>${vol}${priceStr}`,
  ];

  if (signal.sl != null || signal.tp != null) {
    const parts: string[] = [];
    if (signal.sl != null) parts.push(`SL: ${signal.sl}`);
    if (signal.tp != null) parts.push(`TP: ${signal.tp}`);
    lines.push(parts.join(' | '));
  }

  const statusIcon =
    signal.executed_count === signal.total_followers && signal.total_followers > 0
      ? '\u2705'
      : '\u26a0\ufe0f';
  lines.push(`${statusIcon} ${signal.executed_count}/${signal.total_followers} followers executed`);

  const api = new TelegramApi(env.TELEGRAM_BOT_TOKEN);
  try {
    await api.sendMessage(chatId, lines.join('\n'));
    return true;
  } catch (err) {
    console.error('Failed to send signal notification:', err);
    return false;
  }
}

/**
 * Notify the user that an equity guard was triggered.
 */
export async function notifyEquityGuard(
  env: Env,
  userId: string,
  accountAlias: string,
  reason: string,
): Promise<boolean> {
  const chatId = await getChatId(env, userId);
  if (!chatId) return false;

  const text = [
    `<b>\u26a0\ufe0f Equity Guard Triggered</b>`,
    '',
    `Account: <b>${escapeHtml(accountAlias)}</b>`,
    `Reason: ${escapeHtml(reason)}`,
    '',
    'Signal copying has been paused for this account. Review in the dashboard.',
  ].join('\n');

  const api = new TelegramApi(env.TELEGRAM_BOT_TOKEN);
  try {
    await api.sendMessage(chatId, text);
    return true;
  } catch (err) {
    console.error('Failed to send equity guard notification:', err);
    return false;
  }
}

/**
 * Notify the user that an account has disconnected.
 */
export async function notifyDisconnect(
  env: Env,
  userId: string,
  accountAlias: string,
): Promise<boolean> {
  const chatId = await getChatId(env, userId);
  if (!chatId) return false;

  const text = [
    `<b>\ud83d\udd34 Account Disconnected</b>`,
    '',
    `<b>${escapeHtml(accountAlias)}</b> is no longer sending heartbeats.`,
    '',
    'Check your EA connection and restart if needed.',
  ].join('\n');

  const api = new TelegramApi(env.TELEGRAM_BOT_TOKEN);
  try {
    await api.sendMessage(chatId, text);
    return true;
  } catch (err) {
    console.error('Failed to send disconnect notification:', err);
    return false;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

async function getChatId(env: Env, userId: string): Promise<number | null> {
  const raw = await env.BOT_STATE.get(`user:${userId}:tg`);
  if (!raw) return null;

  // Try JSON format first (new: {chatId, linked_at, telegramUserId})
  try {
    const parsed = JSON.parse(raw);
    const chatId = parseInt(String(parsed.chatId), 10);
    return isNaN(chatId) ? null : chatId;
  } catch {
    // Fallback: legacy plain string format
    const chatId = parseInt(raw, 10);
    return isNaN(chatId) ? null : chatId;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

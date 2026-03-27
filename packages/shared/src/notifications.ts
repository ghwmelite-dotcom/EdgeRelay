// packages/shared/src/notifications.ts

// Only boolean toggle columns — excludes timezone/summary_hour
const TOGGLE_COLUMNS = [
  'login_alerts',
  'signal_executed',
  'equity_guard',
  'account_disconnected',
  'daily_summary',
  'weekly_digest',
] as const;

export type NotificationToggle = (typeof TOGGLE_COLUMNS)[number];

export async function shouldNotify(
  db: D1Database,
  kv: KVNamespace,
  userId: string,
  eventType: NotificationToggle,
): Promise<{ shouldSend: boolean; chatId: string | null }> {
  if (!TOGGLE_COLUMNS.includes(eventType)) {
    return { shouldSend: false, chatId: null };
  }

  const raw = await kv.get(`user:${userId}:tg`);
  if (!raw) return { shouldSend: false, chatId: null };

  let chatId: string;
  try {
    const parsed = JSON.parse(raw);
    chatId = String(parsed.chatId);
  } catch {
    chatId = raw;
  }

  const pref = await db
    .prepare(`SELECT ${eventType} FROM notification_preferences WHERE user_id = ?`)
    .bind(userId)
    .first<Record<string, number>>();

  if (!pref || !pref[eventType]) {
    return { shouldSend: false, chatId };
  }

  return { shouldSend: true, chatId };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: string = 'HTML',
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      },
    );
    const json = (await res.json()) as { ok: boolean };
    return json.ok;
  } catch {
    return false;
  }
}

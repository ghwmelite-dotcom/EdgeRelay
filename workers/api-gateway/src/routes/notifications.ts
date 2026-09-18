import { Hono } from 'hono';
import type { Env } from '../types.js';
import { sendTelegramMessage } from '@edgerelay/shared';
import type { ApiResponse, NotificationPreferences, TelegramStatus } from '@edgerelay/shared';

const notifications = new Hono<{ Bindings: Env }>();

// Generate deep-link code for Telegram linking
notifications.post('/telegram/link', async (c) => {
  const userId = c.get('userId');

  const code = crypto.randomUUID().replaceAll('-', '');

  // Store in KV with 5-minute TTL
  await c.env.BOT_STATE.put(`tg-link:${code}`, userId, { expirationTtl: 300 });

  return c.json<ApiResponse<{ deepLink: string }>>({
    data: { deepLink: `https://t.me/edgerelay_bot?start=${code}` },
    error: null,
  });
});

// Sent only following the user's explicit Settings button action.
notifications.post('/telegram/test', async c => {
 const userId=c.get('userId');
 const raw=await c.env.BOT_STATE.get(`user:${userId}:tg`);
 let chatId: unknown;
 try {const v=JSON.parse(raw??'null');chatId=typeof v==='number'?v:v?.chatId;} catch {chatId=null;}
 if (typeof chatId !== 'number' || !Number.isSafeInteger(chatId) || chatId<=0) return c.json({data:null,error:{code:'NOT_LINKED',message:'Connect Telegram in a private chat first.'}},409);
 const key=`telegram-test:${userId}`;
 if(await c.env.BOT_STATE.get(key)) return c.json({data:null,error:{code:'RATE_LIMITED',message:'Wait one minute before sending another test.'}},429);
 await c.env.BOT_STATE.put(key,'1',{expirationTtl:60});
 const sent=await sendTelegramMessage(c.env.TELEGRAM_BOT_TOKEN,String(chatId),'TradeMetrics Pro test: your Telegram connection can receive messages. Manage major-news and account alerts in Settings.');
 if(!sent)return c.json({data:null,error:{code:'DELIVERY_FAILED',message:'Telegram did not accept the test. Open the bot, unblock it if needed, and reconnect.'}},502);
 return c.json({data:{accepted:true},error:null});
});

// Check Telegram connection status
notifications.get('/telegram/status', async (c) => {
  const userId = c.get('userId');
  const raw = await c.env.BOT_STATE.get(`user:${userId}:tg`);

  if (!raw) {
    return c.json<ApiResponse<TelegramStatus>>({
      data: { connected: false, linked_at: null },
      error: null,
    });
  }

  let linkedAt: string | null = null;
  try {
    const parsed = JSON.parse(raw);
    linkedAt = parsed.linked_at || null;
  } catch {
    // Legacy plain string — no linked_at available
  }

  return c.json<ApiResponse<TelegramStatus>>({
    data: { connected: true, linked_at: linkedAt },
    error: null,
  });
});

// Unlink Telegram
notifications.delete('/telegram/link', async (c) => {
  const userId = c.get('userId');

  // Find the telegram user ID from the forward mapping and delete both KV keys
  const raw = await c.env.BOT_STATE.get(`user:${userId}:tg`);
  if (raw) {
    // Parse telegramUserId from forward mapping (stored during deep-link flow)
    try {
      const parsed = JSON.parse(raw);
      if (parsed.telegramUserId) {
        await c.env.BOT_STATE.delete(`tg:${parsed.telegramUserId}`);
      }
    } catch {
      // Legacy format — no telegramUserId available, reverse mapping stays as orphan
    }
    // Delete the forward mapping
    await c.env.BOT_STATE.delete(`user:${userId}:tg`);
  }

  // Delete D1 preferences row
  await c.env.DB.prepare('DELETE FROM notification_preferences WHERE user_id = ?')
    .bind(userId)
    .run();

  return c.json<ApiResponse<{ unlinked: boolean }>>({
    data: { unlinked: true },
    error: null,
  });
});

// Get notification preferences
notifications.get('/preferences', async (c) => {
  const userId = c.get('userId');

  const row = await c.env.DB.prepare(
    'SELECT login_alerts, signal_executed, equity_guard, account_disconnected, daily_summary, weekly_digest, timezone, summary_hour, morning_brief, news_alerts, session_alerts FROM notification_preferences WHERE user_id = ?',
  )
    .bind(userId)
    .first<{
      login_alerts: number;
      signal_executed: number;
      equity_guard: number;
      account_disconnected: number;
      daily_summary: number;
      weekly_digest: number;
      timezone: string;
      summary_hour: number;
      morning_brief: number;
      news_alerts: number;
      session_alerts: number;
    }>();

  if (!row) {
    return c.json<ApiResponse<{ preferences: null }>>({
      data: { preferences: null },
      error: null,
    });
  }

  return c.json<ApiResponse<{ preferences: NotificationPreferences }>>({
    data: {
      preferences: {
        login_alerts: !!row.login_alerts,
        signal_executed: !!row.signal_executed,
        equity_guard: !!row.equity_guard,
        account_disconnected: !!row.account_disconnected,
        daily_summary: !!row.daily_summary,
        weekly_digest: !!row.weekly_digest,
        timezone: row.timezone,
        summary_hour: row.summary_hour,
        morning_brief: !!row.morning_brief,
        news_alerts: !!row.news_alerts,
        session_alerts: !!row.session_alerts,
      },
    },
    error: null,
  });
});

// Update notification preferences
notifications.put('/preferences', async (c) => {
  const userId = c.get('userId');
  const body: unknown = await c.req.json().catch(() => null);
  const invalid = () => c.json<ApiResponse>({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid notification preferences' } }, 400);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid();
  const input = body as Record<string, unknown>;
  const booleanFields = ['login_alerts', 'signal_executed', 'equity_guard', 'account_disconnected', 'daily_summary', 'weekly_digest', 'morning_brief', 'news_alerts', 'session_alerts'];
  const fields = Object.keys(input);
  if (!fields.length) return invalid();
  const values: (string | number)[] = [];
  for (const field of fields) {
    const value = input[field];
    if (booleanFields.includes(field)) {
      if (typeof value !== 'boolean') return invalid();
      values.push(value ? 1 : 0);
    } else if (field === 'summary_hour') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) return invalid();
      values.push(value);
    } else if (field === 'timezone') {
      if (typeof value !== 'string' || value.length > 100) return invalid();
      try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); } catch { return invalid(); }
      values.push(value);
    } else return invalid();
  }
  // Field names come exclusively from the allowlist above; values stay bound.
  await c.env.DB.prepare(`INSERT INTO notification_preferences (user_id, ${fields.join(', ')})
    VALUES (?, ${fields.map(() => '?').join(', ')}) ON CONFLICT(user_id) DO UPDATE SET
    ${fields.map((field) => `${field} = excluded.${field}`).join(', ')}, updated_at = datetime('now')`)
    .bind(userId, ...values).run();

  return c.json<ApiResponse<{ updated: boolean }>>({
    data: { updated: true },
    error: null,
  });
});

export { notifications };

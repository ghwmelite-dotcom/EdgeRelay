import { Hono } from 'hono';
import type { Env } from '../types.js';
import type { ApiResponse, NotificationPreferences, TelegramStatus } from '@edgerelay/shared';

const notifications = new Hono<{ Bindings: Env }>();

// Generate deep-link code for Telegram linking
notifications.post('/telegram/link', async (c) => {
  const userId = c.get('userId');

  // Generate 6-char alphanumeric code
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 6)
    .toUpperCase();

  // Store in KV with 5-minute TTL
  await c.env.BOT_STATE.put(`tg-link:${code}`, userId, { expirationTtl: 300 });

  return c.json<ApiResponse<{ deepLink: string }>>({
    data: { deepLink: `https://t.me/edgerelay_bot?start=${code}` },
    error: null,
  });
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
  const body = await c.req.json<Partial<NotificationPreferences>>();

  // Build SET clause dynamically from provided fields
  const allowedFields = [
    'login_alerts',
    'signal_executed',
    'equity_guard',
    'account_disconnected',
    'daily_summary',
    'weekly_digest',
    'timezone',
    'summary_hour',
    'morning_brief',
    'news_alerts',
    'session_alerts',
  ];

  const setClauses: string[] = ["updated_at = datetime('now')"];
  const values: (string | number)[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      const val = body[field as keyof NotificationPreferences];
      setClauses.push(`${field} = ?`);
      values.push(typeof val === 'boolean' ? (val ? 1 : 0) : (val as string | number));
    }
  }

  values.push(userId);

  await c.env.DB.prepare(
    `UPDATE notification_preferences SET ${setClauses.join(', ')} WHERE user_id = ?`,
  )
    .bind(...values)
    .run();

  return c.json<ApiResponse<{ updated: boolean }>>({
    data: { updated: true },
    error: null,
  });
});

export { notifications };

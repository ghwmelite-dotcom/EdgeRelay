# Telegram Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram-based notifications (login alerts, daily/weekly summaries) with one-click deep-link connecting, a dashboard banner + sidebar widget to drive discovery, and a real notification preferences UI in Settings.

**Architecture:** Extends existing telegram-bot worker with deep-link `/start {code}` flow. New notification routes in api-gateway. New notification-digest cron worker for daily/weekly summaries. Shared `shouldNotify` + `sendTelegramMessage` utilities in `@edgerelay/shared`. Frontend gets a Zustand notification store, dashboard banner, sidebar widget, and revamped Settings notification section.

**Tech Stack:** Cloudflare Workers (Hono), D1, KV, Telegram Bot API, React 18, Zustand, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-27-telegram-notifications-design.md`

---

## File Structure

### Create
| File | Responsibility |
|------|---------------|
| `migrations/0010_notification_preferences.sql` | D1 migration for notification_preferences table |
| `packages/shared/src/notifications.ts` | Shared `shouldNotify` + `sendTelegramMessage` utilities |
| `workers/api-gateway/src/routes/notifications.ts` | API routes for linking, status, preferences |
| `workers/api-gateway/src/lib/notifyLogin.ts` | Login alert helper using shared utils |
| `workers/notification-digest/wrangler.toml` | Cron worker config |
| `workers/notification-digest/src/index.ts` | Daily/weekly summary cron logic |
| `workers/notification-digest/package.json` | Worker package |
| `workers/notification-digest/tsconfig.json` | TypeScript config |
| `apps/web/src/stores/notifications.ts` | Zustand store for Telegram status + preferences |
| `apps/web/src/components/dashboard/TelegramBanner.tsx` | Dismissible dashboard banner CTA |

### Modify
| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add `NotificationPreferences` interface |
| `workers/telegram-bot/src/commands.ts` | Extend `/start` for deep-link codes, update router, `/unlink` to delete D1 row |
| `workers/telegram-bot/src/notifications.ts` | Update `getChatId` to parse JSON, add digest formatters |
| `workers/telegram-bot/wrangler.toml` | Fix BOT_STATE KV ID from placeholder to real ID |
| `workers/api-gateway/src/types.ts` | Add `BOT_STATE` and `TELEGRAM_BOT_TOKEN` to Env |
| `workers/api-gateway/wrangler.toml` | Add BOT_STATE KV binding |
| `workers/api-gateway/src/index.ts` | Mount notifications routes |
| `workers/api-gateway/src/routes/auth.ts` | Add login alert after successful login |
| `apps/web/src/components/layout/AppLayout.tsx` | Add sidebar Telegram widget |
| `apps/web/src/pages/DashboardPage.tsx` | Add TelegramBanner component |
| `apps/web/src/pages/SettingsPage.tsx` | Replace placeholder notification toggles |

---

### Task 1: D1 Migration + Shared Types

**Files:**
- Create: `migrations/0010_notification_preferences.sql`
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- migrations/0010_notification_preferences.sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  channel TEXT DEFAULT 'telegram' CHECK(channel IN ('telegram')),
  login_alerts INTEGER DEFAULT 1,
  signal_executed INTEGER DEFAULT 1,
  equity_guard INTEGER DEFAULT 1,
  account_disconnected INTEGER DEFAULT 1,
  daily_summary INTEGER DEFAULT 1,
  weekly_digest INTEGER DEFAULT 1,
  timezone TEXT DEFAULT 'UTC',
  summary_hour INTEGER DEFAULT 22 CHECK(summary_hour >= 0 AND summary_hour <= 23),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Add NotificationPreferences type to shared package**

Add to `packages/shared/src/types.ts` after the existing exports:

```typescript
// Notification preferences
export interface NotificationPreferences {
  login_alerts: boolean;
  signal_executed: boolean;
  equity_guard: boolean;
  account_disconnected: boolean;
  daily_summary: boolean;
  weekly_digest: boolean;
  timezone: string;
  summary_hour: number;
}

export interface TelegramStatus {
  connected: boolean;
  linked_at: string | null;
}
```

- [ ] **Step 3: Apply migration to remote D1**

Run:
```bash
cd workers/api-gateway && npx wrangler d1 migrations apply edgerelay-db --remote
```
Expected: Migration 0010 applied successfully.

- [ ] **Step 4: Commit**

```bash
git add migrations/0010_notification_preferences.sql packages/shared/src/types.ts
git commit -m "feat(notifications): add D1 migration and shared types for notification preferences"
```

---

### Task 2: Shared Notification Utilities

**Files:**
- Create: `packages/shared/src/notifications.ts`

- [ ] **Step 1: Create the shared notification utilities**

```typescript
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

/**
 * Check if a notification should be sent for a given user and event type.
 * Reads from KV (Telegram linked?) and D1 (preference enabled?).
 */
export async function shouldNotify(
  db: D1Database,
  kv: KVNamespace,
  userId: string,
  eventType: NotificationToggle,
): Promise<{ shouldSend: boolean; chatId: string | null }> {
  // Validate eventType against allowlist (prevents SQL injection)
  if (!TOGGLE_COLUMNS.includes(eventType)) {
    return { shouldSend: false, chatId: null };
  }

  // Check if user has Telegram linked
  const raw = await kv.get(`user:${userId}:tg`);
  if (!raw) return { shouldSend: false, chatId: null };

  // Parse chatId (JSON format: {chatId, linked_at} or legacy plain string)
  let chatId: string;
  try {
    const parsed = JSON.parse(raw);
    chatId = String(parsed.chatId);
  } catch {
    chatId = raw; // Legacy plain string format
  }

  // Check preference — column name is validated against allowlist above
  const pref = await db
    .prepare(`SELECT ${eventType} FROM notification_preferences WHERE user_id = ?`)
    .bind(userId)
    .first<Record<string, number>>();

  if (!pref || !pref[eventType]) {
    return { shouldSend: false, chatId };
  }

  return { shouldSend: true, chatId };
}

/**
 * Send a message via Telegram Bot API.
 */
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
```

- [ ] **Step 2: Verify the shared package exports**

Check `packages/shared/src/index.ts` (or `types.ts`) — ensure the new file is exported. If there's a barrel `index.ts`, add:

```typescript
export * from './notifications';
```

If there is no barrel file and types.ts is the main export, add to `packages/shared/package.json` exports if needed.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/notifications.ts packages/shared/src/types.ts
git commit -m "feat(shared): add shouldNotify and sendTelegramMessage utilities"
```

---

### Task 3: API Gateway — Env Type + Wrangler Bindings

**Files:**
- Modify: `workers/api-gateway/src/types.ts`
- Modify: `workers/api-gateway/wrangler.toml`

- [ ] **Step 1: Add BOT_STATE and TELEGRAM_BOT_TOKEN to Env interface**

In `workers/api-gateway/src/types.ts`, add to the `Env` interface:

```typescript
export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  BOT_STATE: KVNamespace;          // ADD THIS
  STORAGE: R2Bucket;
  ACCOUNT_RELAY: DurableObjectNamespace;
  CORS_ORIGINS: string;
  JWT_SECRET: string;
  PAYSTACK_SECRET_KEY: string;
  JWT_EXPIRY_HOURS: string;
  TELEGRAM_BOT_TOKEN: string;      // ADD THIS
}
```

- [ ] **Step 2: Add KV binding to wrangler.toml**

Add to `workers/api-gateway/wrangler.toml` after the existing SESSIONS KV namespace:

```toml
[[kv_namespaces]]
binding = "BOT_STATE"
id = "cccd807ee9d64f3d84ace82529092566"
```

- [ ] **Step 3: Set the bot token secret**

Run interactively (enter the bot token when prompted):
```bash
cd workers/api-gateway && npx wrangler secret put TELEGRAM_BOT_TOKEN
```

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/types.ts workers/api-gateway/wrangler.toml
git commit -m "feat(api-gateway): add BOT_STATE KV and TELEGRAM_BOT_TOKEN bindings"
```

---

### Task 4: API Gateway — Notification Routes

**Files:**
- Create: `workers/api-gateway/src/routes/notifications.ts`
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Create the notifications route file**

```typescript
// workers/api-gateway/src/routes/notifications.ts
import { Hono } from 'hono';
import type { Env } from '../types';
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
    'SELECT login_alerts, signal_executed, equity_guard, account_disconnected, daily_summary, weekly_digest, timezone, summary_hour FROM notification_preferences WHERE user_id = ?',
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
```

- [ ] **Step 2: Mount routes in api-gateway index.ts**

In `workers/api-gateway/src/index.ts`, add the import at the top with other route imports:

```typescript
import { notifications } from './routes/notifications';
```

Then mount it on the `protectedApp` (after the existing route mounts):

```typescript
protectedApp.route('/notifications', notifications);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd workers/api-gateway && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/routes/notifications.ts workers/api-gateway/src/index.ts
git commit -m "feat(api-gateway): add notification routes for Telegram linking and preferences"
```

---

### Task 5: Login Alert Integration

**Files:**
- Create: `workers/api-gateway/src/lib/notifyLogin.ts`
- Modify: `workers/api-gateway/src/routes/auth.ts`

- [ ] **Step 1: Create the login alert helper**

```typescript
// workers/api-gateway/src/lib/notifyLogin.ts
import { shouldNotify, sendTelegramMessage } from '@edgerelay/shared';
import type { Env } from '../types';

export async function notifyLogin(env: Env, userId: string, timestamp: string): Promise<void> {
  const { shouldSend, chatId } = await shouldNotify(env.DB, env.BOT_STATE, userId, 'login_alerts');
  if (!shouldSend || !chatId) return;

  const message = [
    '🔐 <b>New Login Detected</b>',
    '',
    `⏰ Time: ${timestamp}`,
    '',
    "If this wasn't you, change your password immediately:",
    'https://trademetricspro.com/settings',
  ].join('\n');

  await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, message);
}
```

- [ ] **Step 2: Add login alert to auth.ts login handler**

In `workers/api-gateway/src/routes/auth.ts`, add the import at the top:

```typescript
import { notifyLogin } from '../lib/notifyLogin';
```

Then in the `POST /login` handler, right before the final `return c.json(...)`, add:

```typescript
  // Send login alert via Telegram (non-blocking)
  c.executionCtx.waitUntil(
    notifyLogin(c.env, user.id, new Date().toISOString()),
  );

  return c.json<ApiResponse>({
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd workers/api-gateway && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/lib/notifyLogin.ts workers/api-gateway/src/routes/auth.ts
git commit -m "feat(auth): send Telegram login alert on successful login"
```

---

### Task 6: Telegram Bot — Deep-Link + Unlink Changes

**Files:**
- Modify: `workers/telegram-bot/wrangler.toml`
- Modify: `workers/telegram-bot/src/commands.ts`
- Modify: `workers/telegram-bot/src/notifications.ts`

- [ ] **Step 0: Fix BOT_STATE KV placeholder ID in wrangler.toml**

In `workers/telegram-bot/wrangler.toml`, replace the placeholder KV ID:

```toml
[[kv_namespaces]]
binding = "BOT_STATE"
id = "cccd807ee9d64f3d84ace82529092566"
```

Also verify the telegram-bot `Env` type (in `workers/telegram-bot/src/types.ts` or wherever it's defined) includes `DB: D1Database`. The bot's wrangler.toml already has a D1 binding — check that the TypeScript type matches. If `DB` is missing from the Env interface, add it.

- [ ] **Step 1: Extend handleStart to support deep-link codes**

In `workers/telegram-bot/src/commands.ts`, modify the `handleStart` function. Currently it just returns a welcome message. Change it to:

```typescript
async function handleStart(
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
      // Delete expired code
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
        '• 📈 Daily & weekly performance summaries',
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
```

- [ ] **Step 1b: Update the command router to pass args to handleStart**

Find the `routeCommand` function (or equivalent command dispatcher) in `commands.ts`. It currently calls `handleStart()` with no args. Update the `/start` case to extract the deep-link parameter and pass it:

```typescript
case '/start': {
  // Deep-link: /start CODE → args = "CODE"
  const args = text.split(' ').slice(1).join(' ').trim() || undefined;
  return handleStart(env, user, chatId, args);
}
```

Make sure all existing parameters (`env`, `user`, `chatId`) are available in the router scope — check how other commands like `handleLink` receive these values and follow the same pattern.

- [ ] **Step 2: Update handleUnlink to also delete D1 preferences**

In the `handleUnlink` function, after deleting both KV mappings, add:

```typescript
    // Delete notification preferences from D1
    await env.DB.prepare('DELETE FROM notification_preferences WHERE user_id = ?')
      .bind(mapping.user_id)
      .run();
```

- [ ] **Step 3: Update getChatId in notifications.ts to parse JSON**

In `workers/telegram-bot/src/notifications.ts`, replace the `getChatId` function:

```typescript
async function getChatId(env: Env, userId: string): Promise<number | null> {
  const raw = await env.BOT_STATE.get(`user:${userId}:tg`);
  if (!raw) return null;

  // Try JSON format first (new: {chatId, linked_at})
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
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
cd workers/telegram-bot && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add workers/telegram-bot/src/commands.ts workers/telegram-bot/src/notifications.ts workers/telegram-bot/wrangler.toml
git commit -m "feat(telegram-bot): add deep-link linking flow and JSON chatId parsing"
```

---

### Task 7: Notification Digest Cron Worker

**Files:**
- Create: `workers/notification-digest/wrangler.toml`
- Create: `workers/notification-digest/package.json`
- Create: `workers/notification-digest/tsconfig.json`
- Create: `workers/notification-digest/src/index.ts`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "edgerelay-notification-digest"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"  # Same ID as workers/api-gateway/wrangler.toml

[[kv_namespaces]]
binding = "BOT_STATE"
id = "cccd807ee9d64f3d84ace82529092566"
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "edgerelay-notification-digest",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@edgerelay/shared": "workspace:*"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "wrangler": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create the cron worker**

```typescript
// workers/notification-digest/src/index.ts
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
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
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
        const parsed = JSON.parse(raw);
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
    best_symbol: best?.symbol || null,
    best_pnl: best?.profit || 0,
    worst_symbol: worst?.symbol || null,
    worst_pnl: worst?.profit || 0,
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
    best_symbol: best?.symbol || null,
    best_pnl: best?.total || 0,
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

  const total = results?.length || 0;
  const twoMinAgo = Date.now() - 120_000;
  const active =
    results?.filter((a) => {
      if (!a.last_heartbeat) return false;
      const ts = parseFloat(a.last_heartbeat);
      const ms = !isNaN(ts) && ts > 1e9 && ts < 1e12 ? ts * 1000 : new Date(a.last_heartbeat).getTime();
      return !isNaN(ms) && ms > twoMinAgo;
    }).length || 0;

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
```

- [ ] **Step 5: Register in monorepo workspace and install**

Check the root `package.json` (or `pnpm-workspace.yaml`) for the workspace configuration. Add `workers/notification-digest` to the workspace list if not already covered by a glob like `workers/*`. Then install:

```bash
cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay" && npm install
```

- [ ] **Step 6: Verify TypeScript compiles**

Run:
```bash
cd workers/notification-digest && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7: Set bot token secret**

Run interactively (enter the bot token when prompted):
```bash
cd workers/notification-digest && npx wrangler secret put TELEGRAM_BOT_TOKEN
```

- [ ] **Step 8: Commit**

```bash
git add workers/notification-digest/
git commit -m "feat(notification-digest): add cron worker for daily and weekly Telegram summaries"
```

---

### Task 8: Frontend — Notification Zustand Store

**Files:**
- Create: `apps/web/src/stores/notifications.ts`

- [ ] **Step 1: Create the notification store**

```typescript
// apps/web/src/stores/notifications.ts
import { create } from 'zustand';
import { api } from '@/lib/api';
import type { NotificationPreferences, TelegramStatus } from '@edgerelay/shared';

interface NotificationState {
  telegramConnected: boolean;
  linkedAt: string | null;
  preferences: NotificationPreferences | null;
  isLinking: boolean;
  isLoadingStatus: boolean;
  isLoadingPrefs: boolean;

  checkTelegramStatus: () => Promise<void>;
  generateDeepLink: () => Promise<string | null>;
  unlinkTelegram: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  telegramConnected: false,
  linkedAt: null,
  preferences: null,
  isLinking: false,
  isLoadingStatus: false,
  isLoadingPrefs: false,

  checkTelegramStatus: async () => {
    set({ isLoadingStatus: true });
    const res = await api.get<TelegramStatus>('/notifications/telegram/status');
    if (res.data) {
      set({
        telegramConnected: res.data.connected,
        linkedAt: res.data.linked_at,
        isLoadingStatus: false,
      });
    } else {
      set({ isLoadingStatus: false });
    }
  },

  generateDeepLink: async () => {
    set({ isLinking: true });
    const res = await api.post<{ deepLink: string }>('/notifications/telegram/link');
    if (res.data) {
      return res.data.deepLink;
    }
    set({ isLinking: false });
    return null;
  },

  unlinkTelegram: async () => {
    await api.del('/notifications/telegram/link');
    set({ telegramConnected: false, linkedAt: null, preferences: null });
  },

  fetchPreferences: async () => {
    set({ isLoadingPrefs: true });
    const res = await api.get<{ preferences: NotificationPreferences | null }>(
      '/notifications/preferences',
    );
    if (res.data) {
      set({ preferences: res.data.preferences, isLoadingPrefs: false });
    } else {
      set({ isLoadingPrefs: false });
    }
  },

  updatePreferences: async (prefs) => {
    await api.put('/notifications/preferences', prefs);
    set((state) => ({
      preferences: state.preferences ? { ...state.preferences, ...prefs } : null,
    }));
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/stores/notifications.ts
git commit -m "feat(web): add Zustand store for Telegram notification management"
```

---

### Task 9: Frontend — Dashboard Banner Component

**Files:**
- Create: `apps/web/src/components/dashboard/TelegramBanner.tsx`
- Modify: `apps/web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create the TelegramBanner component**

```tsx
// apps/web/src/components/dashboard/TelegramBanner.tsx
import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';

export function TelegramBanner() {
  const { telegramConnected, isLinking, generateDeepLink, checkTelegramStatus } =
    useNotificationStore();
  const [dismissed, setDismissed] = useState(false);
  const [pollTimeout, setPollTimeout] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check if dismissed recently (3-day cooldown)
    const dismissedAt = localStorage.getItem('tg-banner-dismissed');
    if (dismissedAt) {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedAt, 10) < threeDays) {
        setDismissed(true);
      } else {
        localStorage.removeItem('tg-banner-dismissed');
      }
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (telegramConnected || dismissed) return null;

  const handleConnect = async () => {
    const deepLink = await generateDeepLink();
    if (!deepLink) return;

    // Open Telegram deep link
    window.open(deepLink, '_blank');

    // Start polling for connection (every 2s, max 30s)
    setPollTimeout(false);
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 2000;
      await checkTelegramStatus();
      const { telegramConnected: connected } = useNotificationStore.getState();
      if (connected || elapsed >= 30000) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        useNotificationStore.setState({ isLinking: false });
        if (!connected) setPollTimeout(true);
      }
    }, 2000);
  };

  const handleDismiss = () => {
    localStorage.setItem('tg-banner-dismissed', String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="glass-premium border-gradient rounded-2xl p-4 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0088cc] shadow-[0_0_12px_#0088cc40]">
            <Send size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Get instant trade alerts on Telegram
            </p>
            <p className="text-xs text-terminal-muted">
              Signals, P&L summaries & login alerts — one click to connect
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pollTimeout ? (
            <button
              onClick={handleConnect}
              className="rounded-xl bg-[#0088cc] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#0099dd] hover:shadow-[0_0_16px_#0088cc40]"
            >
              Retry
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLinking}
              className="rounded-xl bg-neon-cyan px-4 py-2 text-xs font-bold text-dark-base transition-all hover:shadow-[0_0_16px_#00e5ff40] disabled:opacity-50"
            >
              {isLinking ? 'Waiting...' : 'Connect Telegram'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-terminal-muted hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {pollTimeout && (
        <p className="text-xs text-terminal-muted mt-2">
          Didn't complete? Try again or check Telegram.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add banner to DashboardPage**

In `apps/web/src/pages/DashboardPage.tsx`, add the import:

```typescript
import { TelegramBanner } from '@/components/dashboard/TelegramBanner';
import { useNotificationStore } from '@/stores/notifications';
```

In the component, add to the existing `useEffect` that fetches data (or create a new one):

```typescript
const { checkTelegramStatus } = useNotificationStore();

useEffect(() => {
  checkTelegramStatus();
}, []);
```

Then place `<TelegramBanner />` at the top of the page content, right before the stat cards grid:

```tsx
<TelegramBanner />
{/* Existing stat cards below */}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/TelegramBanner.tsx apps/web/src/pages/DashboardPage.tsx
git commit -m "feat(web): add dismissible Telegram banner to dashboard"
```

---

### Task 10: Frontend — Sidebar Widget

**Files:**
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add sidebar Telegram widget**

In `apps/web/src/components/layout/AppLayout.tsx`, add imports:

```typescript
import { Send } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';
```

Add a `useEffect` to check Telegram status on mount:

```typescript
const { telegramConnected, checkTelegramStatus, generateDeepLink, isLinking } =
  useNotificationStore();

useEffect(() => {
  checkTelegramStatus();
}, []);
```

Then in the sidebar, **above** the bottom user section (the `<div className="relative shrink-0 p-4 space-y-3 border-t ...">` block), add:

```tsx
{/* Telegram Widget */}
<div className="shrink-0 px-4 pb-2">
  {telegramConnected ? (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
      <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e80]" />
      <span className="text-xs font-medium text-emerald-400">Telegram Connected</span>
    </div>
  ) : (
    <div className="rounded-xl bg-[#0088cc]/5 border border-[#0088cc]/20 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Send size={14} className="text-[#0088cc]" />
        <span className="text-xs font-semibold text-[#0088cc]">Telegram Alerts</span>
      </div>
      <p className="text-[10px] text-terminal-muted mb-2">Get instant trade alerts</p>
      <button
        onClick={async () => {
          const link = await generateDeepLink();
          if (link) {
            window.open(link, '_blank');
            // Reset linking state after 30s timeout
            setTimeout(() => {
              useNotificationStore.setState({ isLinking: false });
              checkTelegramStatus();
            }, 30000);
          }
        }}
        disabled={isLinking}
        className="w-full rounded-lg bg-[#0088cc] py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-[#0099dd] disabled:opacity-50"
      >
        {isLinking ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(web): add Telegram widget to sidebar"
```

---

### Task 11: Frontend — Settings Page Notification Section

**Files:**
- Modify: `apps/web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Replace the notification section**

In `apps/web/src/pages/SettingsPage.tsx`, add imports:

```typescript
import { Send } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';
```

Add to the component body (near the top with other hooks):

```typescript
const {
  telegramConnected,
  linkedAt,
  preferences,
  isLoadingStatus,
  checkTelegramStatus,
  generateDeepLink,
  unlinkTelegram,
  fetchPreferences,
  updatePreferences,
} = useNotificationStore();

useEffect(() => {
  checkTelegramStatus();
  fetchPreferences();
}, []);
```

Replace the entire Notifications `<Card>` section (the one with the placeholder toggles) with:

```tsx
{/* ---- Telegram Notifications ---- */}
<Card className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 font-display">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0088cc]/10">
        <Send size={16} className="text-[#0088cc]" />
      </span>
      Telegram Notifications
    </CardTitle>
    <p className="text-sm text-terminal-muted">
      Receive trade alerts, login notifications, and performance summaries
    </p>
  </CardHeader>

  {!telegramConnected ? (
    /* Disconnected state */
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6 text-center border border-[#0088cc]/20">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0088cc] to-neon-cyan shadow-[0_0_16px_#0088cc40]">
          <Send size={22} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">Connect Telegram</h3>
        <p className="text-xs text-terminal-muted mb-4">
          One-click setup — just tap Start in Telegram
        </p>
        <Button
          onClick={async () => {
            const link = await generateDeepLink();
            if (link) window.open(link, '_blank');
          }}
          className="bg-[#0088cc] hover:bg-[#0099dd] shadow-[0_0_12px_#0088cc30]"
        >
          Connect Now
        </Button>
      </div>

      {/* Greyed out toggles preview */}
      <div className="opacity-40 pointer-events-none space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-terminal-muted">
          Notification Preferences
        </p>
        <ToggleSwitch label="Login alerts" checked={true} onChange={() => {}} />
        <ToggleSwitch label="Daily P&L summary" checked={true} onChange={() => {}} />
      </div>
      <p className="text-xs text-center text-terminal-muted">
        Connect Telegram to manage preferences
      </p>
    </div>
  ) : (
    /* Connected state */
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center justify-between glass rounded-xl border border-emerald-500/20 p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e80]" />
          <div>
            <p className="text-sm font-semibold text-white">Connected</p>
            {linkedAt && (
              <p className="text-xs text-terminal-muted">
                Linked {new Date(linkedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            if (confirm('Disconnect Telegram notifications?')) {
              await unlinkTelegram();
            }
          }}
          className="rounded-lg border border-neon-red/30 px-3 py-1.5 text-xs text-neon-red hover:bg-neon-red/5 transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Toggles */}
      {preferences && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">
            Notification Preferences
          </p>
          <ToggleSwitch
            label="Login alerts"
            description="Get notified of new sign-ins"
            checked={preferences.login_alerts}
            onChange={(v) => updatePreferences({ login_alerts: v })}
          />
          <ToggleSwitch
            label="Signal executed"
            description="When a trade is copied to followers"
            checked={preferences.signal_executed}
            onChange={(v) => updatePreferences({ signal_executed: v })}
          />
          <ToggleSwitch
            label="Equity Guard triggered"
            description="When a PropGuard rule blocks a trade"
            checked={preferences.equity_guard}
            onChange={(v) => updatePreferences({ equity_guard: v })}
          />
          <ToggleSwitch
            label="Account disconnected"
            description="When an EA loses connection"
            checked={preferences.account_disconnected}
            onChange={(v) => updatePreferences({ account_disconnected: v })}
          />
          <ToggleSwitch
            label="Daily P&L summary"
            description="End-of-day performance recap"
            checked={preferences.daily_summary}
            onChange={(v) => updatePreferences({ daily_summary: v })}
          />
          <ToggleSwitch
            label="Weekly digest"
            description="Friday evening performance recap"
            checked={preferences.weekly_digest}
            onChange={(v) => updatePreferences({ weekly_digest: v })}
          />

          {/* Timezone */}
          <div className="flex items-center justify-between pt-2 border-t border-terminal-border/20">
            <div>
              <p className="text-sm text-slate-300">Summary timezone</p>
              <p className="text-xs text-terminal-muted">
                When to send daily & weekly summaries
              </p>
            </div>
            <select
              value={preferences.timezone}
              onChange={(e) => updatePreferences({ timezone: e.target.value })}
              className="glass rounded-lg border border-terminal-border/30 bg-transparent px-3 py-1.5 text-xs text-slate-300 focus:border-neon-cyan/50 focus:outline-none"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Berlin">Central Europe (CET)</option>
              <option value="Europe/Moscow">Moscow (MSK)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )}
</Card>
```

**Important:** The `ToggleSwitch` component likely doesn't have a `description` prop. Use wrapper divs with inline description text instead — this approach works regardless of the existing component API:

```tsx
<div>
  <ToggleSwitch label="Login alerts" checked={preferences.login_alerts} onChange={(v) => updatePreferences({ login_alerts: v })} />
  <p className="text-xs text-terminal-muted mt-0.5">Get notified of new sign-ins</p>
</div>
```

Apply this wrapper pattern to all 6 toggles in the code above. Replace each bare `<ToggleSwitch ... description="..." />` with the wrapper div pattern, moving the description text into a `<p>` tag below.

- [ ] **Step 2: Remove old notification state variables**

Remove the old placeholder state variables and handler from SettingsPage:
- `eaDisconnect`, `setEaDisconnect`
- `equityGuard`, `setEquityGuard`
- `dailySummary`, `setDailySummary`
- `weeklyReport`, `setWeeklyReport`
- `notifSaving`, `setNotifSaving`
- `notifMsg`, `setNotifMsg`
- `handleNotifSave` function

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/SettingsPage.tsx
git commit -m "feat(web): replace notification placeholders with real Telegram preferences UI"
```

---

### Task 12: Deploy All Workers

**Files:** No code changes — deployment only.

- [ ] **Step 1: Deploy api-gateway**

```bash
cd workers/api-gateway && npx wrangler deploy
```

- [ ] **Step 2: Deploy telegram-bot**

```bash
cd workers/telegram-bot && npx wrangler deploy
```

- [ ] **Step 3: Deploy notification-digest**

```bash
cd workers/notification-digest && npx wrangler deploy
```

- [ ] **Step 4: Deploy frontend**

```bash
cd apps/web && npx vite build && npx wrangler pages deploy dist --project-name edgerelay-web
```

- [ ] **Step 5: Verify end-to-end**

1. Open trademetricspro.com → login → verify banner appears on dashboard
2. Click "Connect Telegram" → verify deep link opens Telegram
3. Tap Start in Telegram → verify welcome message received
4. Check dashboard → banner should disappear, sidebar shows "Connected"
5. Go to Settings → verify toggles are active and functional
6. Log out and log back in → verify login alert received in Telegram

- [ ] **Step 6: Commit any final fixes and tag**

```bash
git add -A
git commit -m "feat(notifications): deploy Telegram notification system"
```

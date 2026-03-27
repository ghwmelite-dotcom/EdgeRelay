# Telegram Notification System — Design Spec

## Goal

Replace email-based auth/activity notifications with Telegram, leveraging the existing bot infrastructure. Users connect via one-click deep link and receive login alerts, trade notifications, and automated P&L summaries directly in Telegram DMs. The dashboard prominently highlights the feature via a dismissible banner + sidebar widget.

## Architecture

The system extends the existing `telegram-bot` worker and adds a new `notification-digest` cron worker. Notification preferences are stored in D1. Telegram linking uses one-time codes stored in KV with 5-minute TTL, resolved via Telegram's deep-link `?start=` parameter.

**Tech Stack:** Cloudflare Workers (Hono), D1, KV, Telegram Bot API, React + Zustand frontend.

---

## 1. Telegram Deep-Link Linking Flow

### Sequence

1. User clicks "Connect Telegram" (dashboard banner, sidebar widget, or Settings page)
2. Frontend calls `POST /v1/notifications/telegram/link`
3. API generates a 6-character alphanumeric one-time code
4. Stores in KV: `tg-link:{code}` → `{userId}`, TTL 300 seconds
5. Returns `{ data: { deepLink: "https://t.me/edgerelay_bot?start={code}" } }`
6. Frontend opens the deep link in a new tab
7. User taps "Start" in Telegram
8. Bot receives `/start {code}`, looks up `tg-link:{code}` in KV
9. Bot stores mappings:
   - `user:{userId}:tg` → `{chatId}` (for sending notifications)
   - `tg:{telegramUserId}` → `{userId, chatId, linked_at}` (reverse lookup)
10. Bot deletes the one-time code from KV
11. Bot sends welcome message to user
12. Frontend polls `GET /v1/notifications/telegram/status` every 2s (max 30s) until linked
13. UI updates to "Connected" state

### Unlinking

- Dashboard: `DELETE /v1/notifications/telegram/link` → clears both KV mappings + deletes D1 `notification_preferences` row
- Telegram: `/unlink` command → clears KV mappings AND deletes D1 `notification_preferences` row (bot has `DB` binding)

### Polling Timeout

If the frontend poll times out after 30 seconds without successful link:
- Show message: "Didn't complete? Try again or check Telegram."
- Reset UI to idle state with a "Retry" button
- The one-time code remains valid for 5 minutes, so user can still complete in Telegram

### Edge Cases

- Expired code (>5 min): Bot replies "This link has expired. Please generate a new one from your dashboard."
- Already linked: Skip KV write, reply "You're already connected!"
- Code reuse: KV delete after first use prevents replay

---

## 2. Notification Events

### New Events

| Event | Trigger | Format |
|-------|---------|--------|
| Welcome | Telegram linked | "Welcome to TradeMetrics Pro! You'll receive trade alerts, login notifications, and performance summaries here." |
| Login alert | Successful login | "🔐 New Login Detected\nTime: {timestamp}\nIf this wasn't you, change your password immediately at trademetricspro.com/settings" |
| Daily P&L summary | Cron (user's configured hour) | "📊 Daily Summary — {date}\nP&L: {pnl}\nTrades: {count}\nWin Rate: {rate}%\nBest: {best_symbol} {best_pnl}\nWorst: {worst_symbol} {worst_pnl}" |
| Weekly digest | Cron (Friday at user's configured hour) | "📈 Weekly Recap — {week_range}\nTotal P&L: {pnl}\nTrades: {count}\nWin Rate: {rate}%\nTop Symbol: {top}\nActive Accounts: {active}/{total} online" |

### Existing Events (no changes)

- Signal executed (`notifySignal`)
- Equity Guard triggered (`notifyEquityGuard`)
- Account disconnected (`notifyDisconnect`)

### Preference Checks

Before sending any notification, the system checks:
1. User has Telegram linked (`user:{userId}:tg` exists in KV)
2. The specific event type is enabled in `notification_preferences` table

---

## 3. Data Model

### New D1 Table: `notification_preferences`

```sql
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

- `summary_hour`: The hour (0-23) in the user's timezone when daily/weekly summaries are sent. Default 22 (10 PM).
- Row is created via `INSERT INTO ... ON CONFLICT(user_id) DO NOTHING` when Telegram is linked. This preserves existing preferences if the user re-links after unlinking.
- Deleted when unlinked from dashboard. Also deleted when `/unlink` is used from Telegram (bot has DB binding).

### KV Keys

| Key | Value | TTL | Purpose |
|-----|-------|-----|---------|
| `tg-link:{code}` | `{userId}` | 300s | One-time deep-link code |
| `user:{userId}:tg` | `{chatId, linked_at, telegramUserId}` (JSON) | None | Send notifications + linked timestamp + reverse key for unlinking |
| `tg:{telegramUserId}` | `{userId, chatId, linked_at}` | None | Reverse lookup |

All KV keys use the **same shared** `BOT_STATE` KV namespace (ID: `cccd807ee9d64f3d84ace82529092566`). Each worker that needs it (telegram-bot, api-gateway, notification-digest) binds this same namespace ID in their respective `wrangler.toml`.

**Note:** The existing bot stores `user:{userId}:tg` as a plain chatId string. The deep-link flow changes this to JSON `{chatId, linked_at}`. The existing `getChatId` helper in `notifications.ts` must be updated to parse JSON (with fallback for legacy plain-string values). The `GET /telegram/status` endpoint reads `linked_at` from this KV value.

---

## 4. API Routes

### New route file: `workers/api-gateway/src/routes/notifications.ts`

All routes protected by `authMiddleware`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/notifications/telegram/link` | Generate deep-link code, return URL |
| `GET` | `/v1/notifications/telegram/status` | Check if user's Telegram is linked |
| `DELETE` | `/v1/notifications/telegram/link` | Unlink Telegram, clear KV + D1 prefs |
| `GET` | `/v1/notifications/preferences` | Get notification preference toggles |
| `PUT` | `/v1/notifications/preferences` | Update toggles and/or timezone |

### Response Formats

```typescript
// POST /telegram/link
{ data: { deepLink: "https://t.me/edgerelay_bot?start=abc123" } }

// GET /telegram/status
{ data: { connected: true, linked_at: "2026-03-27T10:00:00Z" } }
// or
{ data: { connected: false } }

// GET /preferences
{ data: { preferences: { login_alerts: true, signal_executed: true, ... , timezone: "UTC" } } }

// PUT /preferences (request body)
{ login_alerts: true, daily_summary: false, timezone: "America/New_York" }
```

---

## 5. Notification Digest Cron Worker

### Worker: `notification-digest`

- **Schedule:** `0 * * * *` (every hour on the hour)
- **Logic:**
  1. Query `notification_preferences` where `daily_summary = 1` OR `weekly_digest = 1`
  2. For each user, check if current UTC hour matches their configured hour in their timezone
  3. For daily: send if hour matches and it's not already been sent today (track via KV `digest-sent:{userId}:{date}`)
  4. For weekly: send if it's Friday AND hour matches
  5. Query journal stats for the user's accounts from D1
  6. Format message and send via Telegram Bot API (`sendMessage`)

### Bindings (wrangler.toml)

```toml
name = "edgerelay-notification-digest"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"

[[kv_namespaces]]
binding = "BOT_STATE"
id = "cccd807ee9d64f3d84ace82529092566"
```

- Secret: `TELEGRAM_BOT_TOKEN` (set via `wrangler secret put TELEGRAM_BOT_TOKEN` — use the same token already deployed on telegram-bot worker)

---

## 6. Telegram Bot Changes

### Extended `/start` handler

```
/start {code}  → Deep-link flow (look up code, link account, welcome message)
/start          → Existing welcome message (no change)
```

### New notification functions (in telegram-bot worker)

- `notifyDailySummary(env, chatId, stats)` — Daily P&L summary (called by notification-digest cron)
- `notifyWeeklyDigest(env, chatId, stats)` — Weekly performance digest (called by notification-digest cron)

### Shared notification utility: `packages/shared/src/notifications.ts`

The `shouldNotify` function and `sendTelegramMessage` helper live in `@edgerelay/shared` so both `api-gateway` and `telegram-bot` can use them without cross-worker imports:

```typescript
export async function shouldNotify(db: D1Database, kv: KVNamespace, userId: string, eventType: string): Promise<{ shouldSend: boolean; chatId: string | null }>
export async function sendTelegramMessage(botToken: string, chatId: string, text: string, parseMode?: string): Promise<void>
```

This resolves the cross-worker dependency — each worker imports from the shared package.

### Login alert function (in api-gateway)

`notifyLogin(env, userId, timestamp)` lives in `workers/api-gateway/src/lib/notifyLogin.ts` and uses `shouldNotify` + `sendTelegramMessage` from the shared package.

---

## 7. Frontend Components

### 7a. Dashboard Banner (`TelegramBanner.tsx`)

- **Location:** Top of DashboardPage, above stat cards
- **Visibility:** Shows when Telegram is NOT connected AND not dismissed
- **Dismiss:** Stores `tg-banner-dismissed` in localStorage. Re-shows after 3 days if still not connected.
- **Design:** Dark glass card with Telegram blue gradient, airplane icon, "Connect Telegram" CTA button
- **Click:** Calls link API, opens deep link, starts polling for connection

### 7b. Sidebar Widget (in `AppLayout.tsx`)

- **Location:** Above the bottom user section in the sidebar
- **States:**
  - Not connected: Compact card with "Connect" button (Telegram blue accent)
  - Connected: Green dot + "Telegram Connected" text
- **Click (not connected):** Same link flow as banner

### 7c. Settings Page — Notifications Section

- **Replaces** the existing placeholder toggles
- **Not connected state:** Large "Connect Telegram" CTA, greyed-out toggles below with "Connect Telegram to manage preferences" hint
- **Connected state:**
  - Green "Connected" badge with linked date + red "Disconnect" button
  - 6 toggle switches (login alerts, signal executed, equity guard, account disconnected, daily summary, weekly digest)
  - Timezone dropdown at the bottom
  - All toggles default ON, changes auto-save via `PUT /preferences`

### 7d. Zustand Store (`useNotificationStore`)

```typescript
interface NotificationStore {
  telegramConnected: boolean;
  linkedAt: string | null;
  preferences: NotificationPreferences | null;
  isLinking: boolean;

  checkTelegramStatus: () => Promise<void>;
  generateDeepLink: () => Promise<string>;
  unlinkTelegram: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}
```

---

## 8. Login Alert Integration

In `workers/api-gateway/src/routes/auth.ts`, after successful login:

1. Get userId from the login response
2. Call `shouldNotify(env, userId, 'login_alerts')`
3. If enabled, call `notifyLogin(env, userId, request IP, timestamp)` via `waitUntil()` (non-blocking)

The notification uses `shouldNotify` and `sendTelegramMessage` from `@edgerelay/shared`. The api-gateway wrangler.toml must add `BOT_STATE` KV binding and `TELEGRAM_BOT_TOKEN` secret for this to work.

---

## 9. Migration Plan

**D1 Migration 0010:**
```sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  channel TEXT DEFAULT 'telegram',
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

---

## 10. Files to Create/Modify

### Create
- `packages/shared/src/notifications.ts` — Shared `shouldNotify` + `sendTelegramMessage` utilities
- `workers/api-gateway/src/routes/notifications.ts` — API routes
- `workers/api-gateway/src/lib/notifyLogin.ts` — Login alert helper
- `workers/notification-digest/` — New cron worker (wrangler.toml, src/index.ts)
- `apps/web/src/components/dashboard/TelegramBanner.tsx` — Dashboard banner
- `apps/web/src/stores/notifications.ts` — Zustand store
- `migrations/0010_notification_preferences.sql` — D1 migration

### Modify
- `workers/telegram-bot/src/commands.ts` — Extend `/start` for deep-link codes, `/unlink` to also delete D1 prefs
- `workers/telegram-bot/src/notifications.ts` — Add `notifyDailySummary`, `notifyWeeklyDigest`; update `getChatId` to parse JSON (with plain-string fallback)
- `workers/api-gateway/src/index.ts` — Mount notifications routes
- `workers/api-gateway/src/routes/auth.ts` — Add login alert after successful login
- `workers/api-gateway/wrangler.toml` — Add `BOT_STATE` KV binding + `TELEGRAM_BOT_TOKEN` secret (via `wrangler secret put`)
- `workers/telegram-bot/wrangler.toml` — Add D1 `DB` binding for `/unlink` to delete notification_preferences row (if not already present)
- `apps/web/src/components/layout/AppLayout.tsx` — Add sidebar Telegram widget
- `apps/web/src/pages/DashboardPage.tsx` — Add TelegramBanner component
- `apps/web/src/pages/SettingsPage.tsx` — Replace placeholder toggles with real notification management

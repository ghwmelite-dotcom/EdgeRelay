# Market Hours Widget + Live News + Telegram Alerts — Design Spec

## Goal

Add a live forex market hours widget and real-time market news feed to the dashboard, with Telegram alerts for high-impact economic events (30min + 5min before), session open/close notifications, and a daily morning market brief.

## Architecture

Two dashboard widgets side-by-side below the stats grid. Market Hours is pure frontend (fixed UTC schedules). Market Intel combines live Finnhub news headlines with the existing economic calendar. The news-fetcher cron worker is enhanced to pull Finnhub news every 15 minutes and medium-impact calendar events. The notification-digest cron worker is enhanced with pre-event alerts, session alerts, and morning briefs.

**Tech Stack:** Cloudflare Workers (Hono), D1, KV, Finnhub API, Telegram Bot API, React 18, Zustand, Tailwind CSS

---

## 1. Market Hours Widget (Frontend Only)

### Forex Session Schedule (UTC)

| Session | Open | Close | Flag |
|---------|------|-------|------|
| Sydney | 21:00 | 06:00 | 🇦🇺 |
| Tokyo | 00:00 | 09:00 | 🇯🇵 |
| London | 07:00 | 16:00 | 🇬🇧 |
| New York | 12:00 | 21:00 | 🇺🇸 |

### Widget Features

- Green dot + "Open" / Red dot + "Closed" for each session
- Progress bar showing how far through an open session (e.g., London 60% through)
- "Next: Tokyo opens in 4h 23m" countdown to the next session transition
- Updates every 60 seconds via `setInterval`
- Weekend detection: forex market closed Friday 21:00 UTC → Sunday 21:00 UTC, show "Market Closed — Opens Sunday 21:00 UTC"
- Sydney session wraps midnight (21:00→06:00) — handle correctly

### Component

`apps/web/src/components/dashboard/MarketHoursWidget.tsx` — pure client-side, no API calls.

---

## 2. Market Intel Widget (News + Calendar)

### Data Sources

**A) Live News — Finnhub API**
- Endpoint: `https://finnhub.io/api/v1/news?category=forex&token={key}`
- API Key: stored as `FINNHUB_API_KEY` wrangler secret on news-fetcher worker
- Free tier: 60 requests/minute
- Returns: array of `{ headline, summary, source, url, datetime, category, related }`

**B) Economic Calendar — FairEconomy API (existing)**
- Already fetched by news-fetcher worker
- Currently filters to HIGH impact only → expand to HIGH + MEDIUM

### New D1 Table: `market_news`

```sql
CREATE TABLE market_news (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  headline_hash TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT,
  category TEXT,
  sentiment REAL,
  related_currencies TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_market_news_published ON market_news(published_at DESC);
```

`headline_hash` is a hex-encoded SHA-256 of the headline text, used for dedup via `INSERT OR IGNORE` (the UNIQUE constraint handles conflicts automatically).

### News Fetcher Enhancement

Modify `workers/news-fetcher/src/index.ts`:

1. **Change cron to `*/15 * * * *`** (every 15 minutes, was twice daily)
2. **Add Finnhub fetch:**
   - Fetch `https://finnhub.io/api/v1/news?category=forex&token={key}`
   - For each item, compute SHA-256 hash of headline
   - Use `INSERT OR IGNORE` (UNIQUE constraint on `headline_hash` handles dedup)
   - Parse `related` field for currency codes (USD, EUR, etc.)
   - Delete news older than 48 hours
3. **Expand calendar to HIGH + MEDIUM impact:**
   - Change the filter from `impact === 'high'` to `impact === 'high' || impact === 'medium'`
   - Both HIGH and MEDIUM go into the existing `news_events` table (impact column stores as-is)

### API Route: `GET /v1/market-news`

New route file: `workers/api-gateway/src/routes/marketNews.ts`

Protected by authMiddleware.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/market-news/headlines` | Latest 20 news headlines |
| `GET` | `/v1/market-news/calendar` | Upcoming economic events (7 days) |

**Response formats:**

```typescript
// GET /market-news/headlines
{
  data: {
    headlines: [
      {
        id: string,
        headline: string,
        summary: string | null,
        source: string,
        url: string | null,
        sentiment: number | null,
        related_currencies: string | null,
        published_at: string
      }
    ]
  }
}

// GET /market-news/calendar
// (Reuses existing /v1/news/calendar logic but includes MEDIUM impact)
{
  data: {
    events: [
      {
        id: string,
        event_name: string,
        currency: string,
        impact: 'high' | 'medium',
        event_time: string,
        actual: string | null,
        forecast: string | null,
        previous: string | null
      }
    ]
  }
}
```

### Dashboard Widget

`apps/web/src/components/dashboard/MarketIntelWidget.tsx`

- Two tabs: **"News"** and **"Calendar"**
- **News tab:** Shows latest 10 headlines with source, time ago, sentiment dot (green/red/gray)
- **Calendar tab:** Shows upcoming economic events with impact badge (HIGH=red, MEDIUM=amber), currency flag, countdown
- Auto-refreshes every 5 minutes
- Click headline → opens source URL in new tab

### Zustand Store

`apps/web/src/stores/marketIntel.ts`

```typescript
interface MarketIntelState {
  headlines: MarketHeadline[];
  calendarEvents: CalendarEvent[];
  isLoadingNews: boolean;
  isLoadingCalendar: boolean;
  fetchHeadlines: () => Promise<void>;
  fetchCalendar: () => Promise<void>;
}
```

---

## 3. Telegram Alerts

### New Notification Types

| Alert | Trigger | Message |
|-------|---------|---------|
| Morning brief | User's configured hour daily | Sessions status + today's events + top 3 headlines |
| Pre-event 30min | 30 min before HIGH-impact event | "⚠️ Heads Up: US Non-Farm Payroll in 30 min (forecast: +180K)" |
| Pre-event 5min | 5 min before HIGH-impact event | "🚨 Imminent: US Non-Farm Payroll in 5 min!" |
| Session open | Session opens (if enabled) | "🟢 London Session Open (07:00 UTC)" |
| Session close | Session closes (if enabled) | "🔴 New York Session Closed (21:00 UTC)" |

### New Notification Preferences

Add columns to `notification_preferences` (via ALTER TABLE in migration):

```sql
ALTER TABLE notification_preferences ADD COLUMN morning_brief INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN news_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN session_alerts INTEGER DEFAULT 0;
```

- `morning_brief`: Daily market overview (default ON)
- `news_alerts`: Pre-event alerts at 30min + 5min (default ON)
- `session_alerts`: Session open/close (default OFF — 8 alerts/day)

Update `TOGGLE_COLUMNS` in `packages/shared/src/notifications.ts` and `NotificationPreferences` interface in `packages/shared/src/types.ts`.

### Alert Cron Implementation

**Pre-event + session alerts:** Modify `notification-digest` cron worker.

Currently runs `0 * * * *` (hourly). Change to `* * * * *` (every minute) for timely pre-event alerts.

Every minute:
1. Query `news_events` for HIGH-impact events starting in exactly 30 or 5 minutes (±1 min window)
2. For each matching event, check users with `news_alerts = 1` and Telegram linked
3. Dedup via KV: `alert-sent:{userId}:{eventId}:{30|5}` with TTL 3600s
4. Send Telegram message

Session transitions:
1. Check if current minute matches a session open/close time
2. For users with `session_alerts = 1`, send notification
3. Dedup via KV: `session-alert:{userId}:{session}:{open|close}:{date}` with TTL 86400s

**Morning brief:** Handled in existing hourly logic (check user's `summary_hour`). Add morning brief alongside daily summary:
- Sessions currently open
- Count of HIGH-impact events today with times
- Top 3 recent headlines from `market_news`

### Morning Brief Format

```
🌅 Market Brief — Mar 27

📊 Sessions: London 🟢 • NYC 🟢 • Tokyo 🔴 • Sydney 🔴

⚡ 3 high-impact events today:
• 13:30 UTC — US Non-Farm Payroll (forecast: +180K)
• 15:00 UTC — ISM Manufacturing PMI
• 19:00 UTC — FOMC Minutes

📰 Latest:
• Fed signals cautious rate path — Reuters
• EUR/USD tests 1.0850 resistance — FXStreet
• BOJ holds rates steady, yen weakens — Bloomberg
```

---

## 4. Migration

**D1 Migration 0011:**

```sql
-- New table for live news
CREATE TABLE market_news (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  headline_hash TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT,
  category TEXT,
  sentiment REAL,
  related_currencies TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_market_news_published ON market_news(published_at DESC);

-- New notification preference columns
ALTER TABLE notification_preferences ADD COLUMN morning_brief INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN news_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN session_alerts INTEGER DEFAULT 0;
```

---

## 5. Settings Page Updates

Add three new toggles to the Settings notification section (when connected):

- **Morning market brief** — "Daily overview of sessions, events, and headlines" (default ON)
- **Event alerts** — "30min + 5min warnings before high-impact events" (default ON)
- **Session alerts** — "When forex sessions open or close" (default OFF)

---

## 6. Files to Create/Modify

### Create
| File | Purpose |
|------|---------|
| `migrations/0011_market_news.sql` | market_news table + ALTER notification_preferences |
| `apps/web/src/components/dashboard/MarketHoursWidget.tsx` | Live forex session status |
| `apps/web/src/components/dashboard/MarketIntelWidget.tsx` | Tabbed news + calendar |
| `apps/web/src/stores/marketIntel.ts` | Zustand store for news + calendar |
| `workers/api-gateway/src/routes/marketNews.ts` | API routes for headlines + calendar |

### Modify
| File | Change |
|------|--------|
| `workers/news-fetcher/src/index.ts` | Add Finnhub fetch, medium-impact events |
| `workers/news-fetcher/wrangler.toml` | Change cron to `*/15 * * * *`, add FINNHUB_API_KEY |
| `workers/notification-digest/src/index.ts` | Add morning brief, pre-event alerts (query `WHERE impact = 'high'`), session alerts; expand PrefRow and SELECT to include `morning_brief`, `news_alerts`, `session_alerts` |
| `workers/notification-digest/wrangler.toml` | Change cron to `* * * * *` (every minute for timely pre-event alerts) |
| `workers/api-gateway/src/index.ts` | Mount marketNews routes |
| `workers/api-gateway/src/routes/notifications.ts` | Update GET/PUT `/preferences` to include `morning_brief`, `news_alerts`, `session_alerts` in SELECT and allowedFields |
| `workers/api-gateway/src/routes/news.ts` | Remove hardcoded `impact = 'high'` filter — allow `impact IN ('high', 'medium')` for calendar endpoint |
| `apps/web/src/pages/DashboardPage.tsx` | Add both widgets below stats |
| `apps/web/src/pages/SettingsPage.tsx` | Add 3 new notification toggles |
| `packages/shared/src/types.ts` | Add MarketHeadline, CalendarEvent interfaces + extend NotificationPreferences with `morning_brief`, `news_alerts`, `session_alerts` |
| `packages/shared/src/notifications.ts` | Add `morning_brief`, `news_alerts`, `session_alerts` to TOGGLE_COLUMNS |

### Secrets to Set
| Worker | Secret | Value |
|--------|--------|-------|
| `news-fetcher` | `FINNHUB_API_KEY` | `<set via wrangler secret put>` |

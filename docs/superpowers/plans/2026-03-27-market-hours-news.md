# Market Hours + Live News + Telegram Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live forex market hours widget, real-time news feed, economic calendar, and Telegram alerts (morning brief, pre-event warnings, session notifications) to the TradeMetrics Pro dashboard.

**Architecture:** Market Hours is pure frontend (fixed UTC schedules). Market Intel widget fetches from new API routes backed by Finnhub news + existing economic calendar. News-fetcher cron enhanced to pull Finnhub every 15 min + medium-impact events. Notification-digest cron changed to every-minute for timely pre-event alerts.

**Tech Stack:** Cloudflare Workers (Hono), D1, KV, Finnhub API, Telegram Bot API, React 18, Zustand, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-27-market-hours-news-design.md`

---

## File Structure

### Create
| File | Responsibility |
|------|---------------|
| `migrations/0011_market_news.sql` | market_news table + ALTER notification_preferences |
| `apps/web/src/components/dashboard/MarketHoursWidget.tsx` | Live forex session status widget |
| `apps/web/src/components/dashboard/MarketIntelWidget.tsx` | Tabbed news headlines + economic calendar |
| `apps/web/src/stores/marketIntel.ts` | Zustand store for news + calendar data |
| `workers/api-gateway/src/routes/marketNews.ts` | API routes for headlines + calendar |

### Modify
| File | Change |
|------|--------|
| `migrations/` | New migration 0011 |
| `packages/shared/src/types.ts` | Add MarketHeadline, extend NotificationPreferences |
| `packages/shared/src/notifications.ts` | Add 3 new toggle columns |
| `workers/news-fetcher/src/index.ts` | Add Finnhub fetch + medium-impact |
| `workers/news-fetcher/wrangler.toml` | Cron → `*/15 * * * *` |
| `workers/notification-digest/src/index.ts` | Add morning brief, pre-event, session alerts |
| `workers/notification-digest/wrangler.toml` | Cron → `* * * * *` |
| `workers/api-gateway/src/index.ts` | Mount marketNews routes |
| `workers/api-gateway/src/routes/notifications.ts` | Add 3 new pref columns to GET/PUT |
| `workers/api-gateway/src/routes/news.ts` | Include medium-impact in calendar |
| `apps/web/src/pages/DashboardPage.tsx` | Add both widgets |
| `apps/web/src/pages/SettingsPage.tsx` | Add 3 new toggles |

---

### Task 1: D1 Migration + Shared Types

**Files:**
- Create: `migrations/0011_market_news.sql`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/notifications.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- migrations/0011_market_news.sql

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

ALTER TABLE notification_preferences ADD COLUMN morning_brief INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN news_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN session_alerts INTEGER DEFAULT 0;
```

- [ ] **Step 2: Add types to shared package**

In `packages/shared/src/types.ts`, add after the existing `TelegramStatus` interface:

```typescript
// Market news
export interface MarketHeadline {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  url: string | null;
  sentiment: number | null;
  related_currencies: string | null;
  published_at: string;
}
```

Extend the existing `NotificationPreferences` interface — add these three fields:

```typescript
export interface NotificationPreferences {
  // ... existing fields ...
  morning_brief: boolean;
  news_alerts: boolean;
  session_alerts: boolean;
}
```

- [ ] **Step 3: Add new toggles to TOGGLE_COLUMNS**

In `packages/shared/src/notifications.ts`, add to the `TOGGLE_COLUMNS` array:

```typescript
const TOGGLE_COLUMNS = [
  'login_alerts',
  'signal_executed',
  'equity_guard',
  'account_disconnected',
  'daily_summary',
  'weekly_digest',
  'morning_brief',
  'news_alerts',
  'session_alerts',
] as const;
```

- [ ] **Step 4: Apply migration to remote D1**

```bash
cd workers/api-gateway && npx wrangler d1 migrations apply edgerelay-db --remote
```

- [ ] **Step 5: Commit**

```bash
git add migrations/0011_market_news.sql packages/shared/src/types.ts packages/shared/src/notifications.ts
git commit -m "feat(market): add market_news table and notification preference columns"
```

---

### Task 2: News Fetcher Enhancement

**Files:**
- Modify: `workers/news-fetcher/src/index.ts`
- Modify: `workers/news-fetcher/wrangler.toml`

- [ ] **Step 1: Update wrangler.toml cron schedule**

Change cron from twice-daily to every 15 minutes:

```toml
[triggers]
crons = ["*/15 * * * *"]
```

- [ ] **Step 2: Add Finnhub news fetch to the worker**

In `workers/news-fetcher/src/index.ts`, add the `FINNHUB_API_KEY` to the Env interface:

```typescript
interface Env {
  DB: D1Database;
  FINNHUB_API_KEY: string;
}
```

Add a new function `fetchFinnhubNews` that:
1. Fetches `https://finnhub.io/api/v1/news?category=forex&token=${env.FINNHUB_API_KEY}`
2. For each item, computes SHA-256 hash of the headline
3. Uses `INSERT OR IGNORE` with the `headline_hash` UNIQUE constraint for dedup
4. Stores: headline_hash, headline, summary, source, url, category, sentiment (from Finnhub's response), related currencies (parse from `related` field), published_at (convert Finnhub's Unix `datetime` to ISO)
5. Deletes news older than 48 hours

```typescript
async function fetchFinnhubNews(env: Env): Promise<number> {
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=forex&token=${env.FINNHUB_API_KEY}`,
  );
  if (!res.ok) {
    console.error('Finnhub fetch failed:', res.status);
    return 0;
  }

  const items = (await res.json()) as Array<{
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    category: string;
    related: string;
  }>;

  let inserted = 0;
  for (const item of items) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(item.headline),
    );
    const headlineHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const publishedAt = new Date(item.datetime * 1000).toISOString();

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO market_news (id, headline_hash, headline, summary, source, url, category, sentiment, related_currencies, published_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
      .bind(
        headlineHash,
        item.headline,
        item.summary || null,
        item.source,
        item.url || null,
        item.category || null,
        item.related || null,
        publishedAt,
      )
      .run();

    if (result.meta.changes > 0) inserted++;
  }

  // Delete news older than 48 hours
  await env.DB.prepare(
    `DELETE FROM market_news WHERE published_at < datetime('now', '-48 hours')`,
  ).run();

  return inserted;
}
```

- [ ] **Step 3: Expand calendar to include MEDIUM impact**

In the existing `fetchCalendar` function (or equivalent), the FairEconomy API returns impact as `'High'`, `'Medium'`, `'Low'` (capitalized). Change the filter from:
```typescript
if (e.impact !== 'High') continue;
```
to:
```typescript
const impactLower = (e.impact || '').toLowerCase();
if (impactLower !== 'high' && impactLower !== 'medium') continue;
```

Also update the D1 insert to store the lowercase impact value. Find where it binds the impact column (currently hardcodes `'high'`) and change to `impactLower` so medium events get stored with `impact = 'medium'`.

- [ ] **Step 4: Call both fetch functions in the scheduled handler**

In the `scheduled` handler, call both `fetchCalendar` and `fetchFinnhubNews`:

```typescript
async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
  const calendarCount = await fetchCalendar(env);
  console.log(`Calendar: ${calendarCount} events stored`);

  const newsCount = await fetchFinnhubNews(env);
  console.log(`Finnhub: ${newsCount} new articles`);
}
```

- [ ] **Step 5: Set FINNHUB_API_KEY secret**

```bash
cd workers/news-fetcher && npx wrangler secret put FINNHUB_API_KEY
```
Enter the Finnhub API key when prompted (do not hardcode in files).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd workers/news-fetcher && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add workers/news-fetcher/
git commit -m "feat(news-fetcher): add Finnhub live news and medium-impact calendar events"
```

---

### Task 3: Market News API Routes

**Files:**
- Create: `workers/api-gateway/src/routes/marketNews.ts`
- Modify: `workers/api-gateway/src/index.ts`
- Modify: `workers/api-gateway/src/routes/news.ts`
- Modify: `workers/api-gateway/src/routes/notifications.ts`

- [ ] **Step 1: Create marketNews route file**

```typescript
// workers/api-gateway/src/routes/marketNews.ts
import { Hono } from 'hono';
import type { Env } from '../types';
import type { ApiResponse, MarketHeadline } from '@edgerelay/shared';

const marketNews = new Hono<{ Bindings: Env }>();

// GET /headlines — Latest news headlines
marketNews.get('/headlines', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const { results } = await c.env.DB.prepare(
    `SELECT id, headline, summary, source, url, sentiment, related_currencies, published_at
     FROM market_news
     ORDER BY published_at DESC
     LIMIT ?`,
  )
    .bind(safeLimit)
    .all<MarketHeadline>();

  return c.json<ApiResponse<{ headlines: MarketHeadline[] }>>({
    data: { headlines: results || [] },
    error: null,
  });
});

export { marketNews };
```

**Note:** The calendar endpoint is NOT duplicated here — the store uses the existing `GET /v1/news/calendar` route (updated in Step 3 to include medium-impact events). Only the headlines route is new.

- [ ] **Step 2: Mount in api-gateway index.ts**

Add import:
```typescript
import { marketNews } from './routes/marketNews';
```

Mount on protectedApp:
```typescript
protectedApp.route('/market-news', marketNews);
```

- [ ] **Step 3: Update news.ts to include medium-impact events**

In `workers/api-gateway/src/routes/news.ts`, the `/calendar` endpoint currently filters `AND impact = 'high'`. Change to:

```sql
AND impact IN ('high', 'medium')
```

- [ ] **Step 4: Update notifications.ts GET/PUT preferences**

In `workers/api-gateway/src/routes/notifications.ts`:

**GET /preferences** — Add to the SELECT:
```sql
SELECT login_alerts, signal_executed, equity_guard, account_disconnected, daily_summary, weekly_digest, timezone, summary_hour, morning_brief, news_alerts, session_alerts
```

Add to the type assertion and response mapping:
```typescript
morning_brief: !!row.morning_brief,
news_alerts: !!row.news_alerts,
session_alerts: !!row.session_alerts,
```

**PUT /preferences** — Add to the `allowedFields` array:
```typescript
'morning_brief',
'news_alerts',
'session_alerts',
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd workers/api-gateway && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add workers/api-gateway/src/routes/marketNews.ts workers/api-gateway/src/index.ts workers/api-gateway/src/routes/news.ts workers/api-gateway/src/routes/notifications.ts
git commit -m "feat(api-gateway): add market news routes and expand notification preferences"
```

---

### Task 4: Frontend — Market Hours Widget

**Files:**
- Create: `apps/web/src/components/dashboard/MarketHoursWidget.tsx`

- [ ] **Step 1: Create the Market Hours widget**

Pure frontend component — no API calls. Uses `setInterval` to update every 60 seconds.

```tsx
// apps/web/src/components/dashboard/MarketHoursWidget.tsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Session {
  name: string;
  flag: string;
  openHour: number;  // UTC hour
  closeHour: number; // UTC hour
  wrapsDay: boolean; // true if open > close (e.g., Sydney 21→06)
}

const SESSIONS: Session[] = [
  { name: 'Sydney', flag: '🇦🇺', openHour: 21, closeHour: 6, wrapsDay: true },
  { name: 'Tokyo', flag: '🇯🇵', openHour: 0, closeHour: 9, wrapsDay: false },
  { name: 'London', flag: '🇬🇧', openHour: 7, closeHour: 16, wrapsDay: false },
  { name: 'New York', flag: '🇺🇸', openHour: 12, closeHour: 21, wrapsDay: false },
];

function isSessionOpen(session: Session, utcHour: number): boolean {
  if (session.wrapsDay) {
    return utcHour >= session.openHour || utcHour < session.closeHour;
  }
  return utcHour >= session.openHour && utcHour < session.closeHour;
}

function getSessionProgress(session: Session, utcHour: number, utcMinute: number): number {
  if (!isSessionOpen(session, utcHour)) return 0;
  const totalMinutes = session.wrapsDay
    ? (24 - session.openHour + session.closeHour) * 60
    : (session.closeHour - session.openHour) * 60;
  let elapsed: number;
  if (session.wrapsDay) {
    elapsed = utcHour >= session.openHour
      ? (utcHour - session.openHour) * 60 + utcMinute
      : (24 - session.openHour + utcHour) * 60 + utcMinute;
  } else {
    elapsed = (utcHour - session.openHour) * 60 + utcMinute;
  }
  return Math.min(elapsed / totalMinutes, 1);
}

function isWeekend(now: Date): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  // Market closed from Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 6) return true; // Saturday
  if (day === 0 && hour < 21) return true; // Sunday before 21:00
  if (day === 5 && hour >= 21) return true; // Friday after 21:00
  return false;
}

function getNextEvent(utcHour: number): string {
  // Find next session open/close
  const events: { label: string; hoursAway: number }[] = [];
  for (const s of SESSIONS) {
    const openDiff = (s.openHour - utcHour + 24) % 24;
    const closeDiff = (s.closeHour - utcHour + 24) % 24;
    if (openDiff > 0 && openDiff <= 12) {
      events.push({ label: `${s.name} opens`, hoursAway: openDiff });
    }
    if (closeDiff > 0 && closeDiff <= 12 && isSessionOpen(s, utcHour)) {
      events.push({ label: `${s.name} closes`, hoursAway: closeDiff });
    }
  }
  events.sort((a, b) => a.hoursAway - b.hoursAway);
  if (events.length === 0) return '';
  const next = events[0];
  const h = Math.floor(next.hoursAway);
  const m = Math.round((next.hoursAway - h) * 60);
  return `Next: ${next.label} in ${h}h ${m}m`;
}

export function MarketHoursWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const weekend = isWeekend(now);

  return (
    <div className="glass-premium border-gradient rounded-2xl p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-neon-cyan" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-neon-cyan">
          Market Hours
        </h3>
      </div>

      {weekend ? (
        <div className="text-center py-4">
          <p className="text-sm text-terminal-muted">Market Closed</p>
          <p className="text-xs text-terminal-muted/60 mt-1">Opens Sunday 21:00 UTC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {SESSIONS.map((session) => {
            const open = isSessionOpen(session, utcHour);
            const progress = getSessionProgress(session, utcHour, utcMinute);
            return (
              <div key={session.name} className="flex items-center gap-3">
                <span className="text-sm w-5">{session.flag}</span>
                <span className={`text-xs font-medium w-16 ${open ? 'text-slate-200' : 'text-terminal-muted/50'}`}>
                  {session.name}
                </span>
                {/* Progress bar */}
                <div className="flex-1 h-1.5 rounded-full bg-terminal-border/30 overflow-hidden">
                  {open && (
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-semibold w-12 text-right ${open ? 'text-emerald-400' : 'text-terminal-muted/40'}`}>
                  {open ? 'Open' : 'Closed'}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-terminal-muted/60 pt-1">
            {getNextEvent(utcHour)}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/dashboard/MarketHoursWidget.tsx
git commit -m "feat(web): add live forex market hours widget"
```

---

### Task 5: Frontend — Market Intel Widget + Store

**Files:**
- Create: `apps/web/src/stores/marketIntel.ts`
- Create: `apps/web/src/components/dashboard/MarketIntelWidget.tsx`

- [ ] **Step 1: Create the Zustand store**

```typescript
// apps/web/src/stores/marketIntel.ts
import { create } from 'zustand';
import { api } from '@/lib/api';
import type { MarketHeadline } from '@edgerelay/shared';

interface CalendarEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: 'high' | 'medium';
  event_time: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

interface MarketIntelState {
  headlines: MarketHeadline[];
  calendarEvents: CalendarEvent[];
  isLoadingNews: boolean;
  isLoadingCalendar: boolean;

  fetchHeadlines: () => Promise<void>;
  fetchCalendar: () => Promise<void>;
}

export const useMarketIntelStore = create<MarketIntelState>()((set) => ({
  headlines: [],
  calendarEvents: [],
  isLoadingNews: false,
  isLoadingCalendar: false,

  fetchHeadlines: async () => {
    set({ isLoadingNews: true });
    const res = await api.get<{ headlines: MarketHeadline[] }>('/market-news/headlines?limit=10');
    if (res.data) {
      set({ headlines: res.data.headlines ?? [], isLoadingNews: false });
    } else {
      set({ isLoadingNews: false });
    }
  },

  fetchCalendar: async () => {
    set({ isLoadingCalendar: true });
    const res = await api.get<{ events: CalendarEvent[] }>('/news/calendar');
    if (res.data) {
      set({ calendarEvents: res.data.events ?? [], isLoadingCalendar: false });
    } else {
      set({ isLoadingCalendar: false });
    }
  },
}));
```

- [ ] **Step 2: Create the Market Intel widget**

```tsx
// apps/web/src/components/dashboard/MarketIntelWidget.tsx
import { useState, useEffect } from 'react';
import { Newspaper, Calendar, ExternalLink } from 'lucide-react';
import { useMarketIntelStore } from '@/stores/marketIntel';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'passed';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

export function MarketIntelWidget() {
  const [tab, setTab] = useState<'news' | 'calendar'>('news');
  const { headlines, calendarEvents, isLoadingNews, isLoadingCalendar, fetchHeadlines, fetchCalendar } =
    useMarketIntelStore();

  useEffect(() => {
    fetchHeadlines();
    fetchCalendar();
    // Auto-refresh every 5 minutes
    const timer = setInterval(() => {
      fetchHeadlines();
      fetchCalendar();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-premium border-gradient rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab('news')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            tab === 'news'
              ? 'bg-neon-cyan/10 text-neon-cyan'
              : 'text-terminal-muted hover:text-slate-300'
          }`}
        >
          <Newspaper size={12} /> News
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            tab === 'calendar'
              ? 'bg-amber-500/10 text-amber-400'
              : 'text-terminal-muted hover:text-slate-300'
          }`}
        >
          <Calendar size={12} /> Calendar
        </button>
      </div>

      {/* News Tab */}
      {tab === 'news' && (
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
          {isLoadingNews && headlines.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">Loading news...</p>
          ) : headlines.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">No recent news</p>
          ) : (
            headlines.map((item) => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2 group-hover:text-neon-cyan transition-colors">
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-terminal-muted">{item.source}</span>
                      <span className="text-[10px] text-terminal-muted/50">{timeAgo(item.published_at)}</span>
                    </div>
                  </div>
                  <ExternalLink size={10} className="shrink-0 mt-1 text-terminal-muted/30 group-hover:text-neon-cyan/50" />
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
          {isLoadingCalendar && calendarEvents.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">Loading events...</p>
          ) : calendarEvents.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">No upcoming events</p>
          ) : (
            calendarEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-2">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    event.impact === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {event.impact.toUpperCase()}
                </span>
                <span className="text-[10px] text-neon-cyan font-mono w-8">{event.currency}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">{event.event_name}</span>
                <span className="text-[10px] text-terminal-muted shrink-0">
                  {timeUntil(event.event_time)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/stores/marketIntel.ts apps/web/src/components/dashboard/MarketIntelWidget.tsx
git commit -m "feat(web): add market intel widget with news and calendar tabs"
```

---

### Task 6: Dashboard Integration

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add widgets to DashboardPage**

Add imports at the top:
```typescript
import { MarketHoursWidget } from '@/components/dashboard/MarketHoursWidget';
import { MarketIntelWidget } from '@/components/dashboard/MarketIntelWidget';
```

After the stats grid (the `grid-cols-2 lg:grid-cols-4` div with the 4 StatCards), add:

```tsx
{/* Market Hours + Intel */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
  <MarketHoursWidget />
  <MarketIntelWidget />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx
git commit -m "feat(web): add market hours and intel widgets to dashboard"
```

---

### Task 7: Settings Page — New Toggles

**Files:**
- Modify: `apps/web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add 3 new notification toggles**

In the Settings page, find the existing notification toggles (connected state). After the "Weekly digest" toggle and before the timezone selector, add three new toggles:

```tsx
{/* Divider */}
<div className="border-t border-terminal-border/20 pt-3 mt-1">
  <p className="text-[10px] uppercase tracking-widest text-terminal-muted mb-3">
    Market Alerts
  </p>
</div>

<div>
  <ToggleSwitch
    label="Morning market brief"
    checked={preferences.morning_brief}
    onChange={(v) => updatePreferences({ morning_brief: v })}
  />
  <p className="text-xs text-terminal-muted mt-0.5">Daily overview of sessions, events, and headlines</p>
</div>

<div>
  <ToggleSwitch
    label="Event alerts"
    checked={preferences.news_alerts}
    onChange={(v) => updatePreferences({ news_alerts: v })}
  />
  <p className="text-xs text-terminal-muted mt-0.5">30min + 5min warnings before high-impact events</p>
</div>

<div>
  <ToggleSwitch
    label="Session alerts"
    checked={preferences.session_alerts}
    onChange={(v) => updatePreferences({ session_alerts: v })}
  />
  <p className="text-xs text-terminal-muted mt-0.5">When forex sessions open or close (8 alerts/day)</p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/SettingsPage.tsx
git commit -m "feat(web): add market alert toggles to settings"
```

---

### Task 8: Notification Digest — Pre-Event + Session + Morning Brief

**Files:**
- Modify: `workers/notification-digest/src/index.ts`
- Modify: `workers/notification-digest/wrangler.toml`

- [ ] **Step 1: Change cron to every minute**

In `workers/notification-digest/wrangler.toml`:
```toml
[triggers]
crons = ["* * * * *"]
```

- [ ] **Step 2: Expand PrefRow and SELECT query**

Update the `PrefRow` interface:
```typescript
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
```

Update the SELECT query:
```sql
SELECT user_id, daily_summary, weekly_digest, morning_brief, news_alerts, session_alerts, timezone, summary_hour
FROM notification_preferences
WHERE daily_summary = 1 OR weekly_digest = 1 OR morning_brief = 1 OR news_alerts = 1 OR session_alerts = 1
```

- [ ] **Step 3: Add pre-event alert logic**

Add a new function `checkPreEventAlerts` that runs every minute:

```typescript
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
      .all<{ id: string; event_name: string; currency: string; event_time: string; forecast: string | null; previous: string | null }>();

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
          chatId = String(JSON.parse(raw).chatId);
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
```

- [ ] **Step 4: Add session alert logic**

```typescript
const SESSION_TIMES = [
  { name: 'Sydney', openHour: 21, closeHour: 6 },
  { name: 'Tokyo', openHour: 0, closeHour: 9 },
  { name: 'London', openHour: 7, closeHour: 16 },
  { name: 'New York', openHour: 12, closeHour: 21 },
];

async function checkSessionAlerts(env: Env, ctx: ExecutionContext): Promise<void> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  // Only fire on the exact minute (0)
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
      try { chatId = String(JSON.parse(raw).chatId); } catch { chatId = raw; }

      const emoji = type === 'open' ? '🟢' : '🔴';
      const msg = `${emoji} <b>${session.name} Session ${type === 'open' ? 'Open' : 'Closed'}</b> (${String(utcHour).padStart(2, '0')}:00 UTC)`;

      ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg));
      await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
    }
  }
}
```

- [ ] **Step 5: Add morning brief to existing daily summary logic**

In the existing hourly loop where daily/weekly summaries are sent, add morning brief logic:

```typescript
// Morning brief (independent from daily_summary — different content)
if (pref.morning_brief) {
  const dedupKey = `digest-sent:${pref.user_id}:morning:${now.toISOString().slice(0, 10)}`;
  const alreadySent = await env.BOT_STATE.get(dedupKey);
  if (!alreadySent) {
    const brief = await formatMorningBrief(env.DB, now);
    if (brief) {
      ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, brief));
      await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });
    }
  }
}
```

Add the `formatMorningBrief` function:

```typescript
async function formatMorningBrief(db: D1Database, now: Date): Promise<string | null> {
  const today = now.toISOString().slice(0, 10);
  const utcHour = now.getUTCHours();

  // Sessions status
  const sessions = SESSION_TIMES.map((s) => {
    const open = s.openHour <= s.closeHour
      ? utcHour >= s.openHour && utcHour < s.closeHour
      : utcHour >= s.openHour || utcHour < s.closeHour;
    return `${s.name} ${open ? '🟢' : '🔴'}`;
  });

  // Today's high-impact events
  const { results: events } = await db.prepare(
    `SELECT event_name, currency, event_time, forecast FROM news_events
     WHERE impact = 'high' AND DATE(event_time) = ? ORDER BY event_time`,
  ).bind(today).all<{ event_name: string; currency: string; event_time: string; forecast: string | null }>();

  // Top 3 headlines
  const { results: news } = await db.prepare(
    `SELECT headline, source FROM market_news ORDER BY published_at DESC LIMIT 3`,
  ).all<{ headline: string; source: string }>();

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
```

- [ ] **Step 6: Wire everything into the scheduled handler**

Update the `scheduled` handler to call all functions:

```typescript
async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  // Pre-event alerts (every minute)
  await checkPreEventAlerts(env, ctx);

  // Session alerts (every minute, fires only at exact session times)
  await checkSessionAlerts(env, ctx);

  // Daily/weekly/morning summaries (only at the top of each hour)
  const now = new Date();
  if (now.getUTCMinutes() === 0) {
    await sendDigests(env, ctx, now);
  }
}
```

Move the existing daily/weekly loop into a `sendDigests(env, ctx, now)` function. This function should:
1. Run the updated SELECT query (with new columns in PrefRow)
2. Loop through results
3. For each user: check timezone/hour match, then send daily_summary, weekly_digest, and morning_brief as appropriate
4. The `chatId` lookup and dedup pattern is identical to the existing code — just add the morning brief block alongside the existing daily/weekly blocks inside the same user loop.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd workers/notification-digest && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add workers/notification-digest/
git commit -m "feat(notification-digest): add pre-event alerts, session alerts, and morning brief"
```

---

### Task 9: Deploy All

**No code changes — deployment only.**

- [ ] **Step 1: Deploy news-fetcher**

```bash
cd workers/news-fetcher && npx wrangler deploy
```

- [ ] **Step 2: Deploy notification-digest**

```bash
cd workers/notification-digest && npx wrangler deploy
```

- [ ] **Step 3: Deploy api-gateway**

```bash
cd workers/api-gateway && npx wrangler deploy
```

- [ ] **Step 4: Deploy frontend**

```bash
cd apps/web && npx vite build && npx wrangler pages deploy dist --project-name edgerelay-web
```

- [ ] **Step 5: Verify end-to-end**

1. Open dashboard → verify Market Hours widget shows correct sessions
2. Verify Market Intel "News" tab shows headlines
3. Verify Market Intel "Calendar" tab shows upcoming events
4. Check Settings → verify 3 new toggles appear
5. Send `/status` to bot → verify it responds
6. Wait for next hour → check if morning brief arrives (if morning_brief enabled)

- [ ] **Step 6: Commit**

```bash
git add workers/ apps/ packages/ migrations/ && git commit -m "feat(market): deploy market hours, live news, and telegram alerts"
```

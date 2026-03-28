# Signal Marketplace — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Author:** Claude + User

## Overview

A Signal Marketplace for TradeMetrics Pro that allows verified traders (providers) to publish their live trading performance and lets subscribers copy them in one click through the existing edge copier infrastructure. Free marketplace — no payments in MVP. Revenue model added later once network has volume.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment model | Free (MVP) | Build network first, monetize later |
| Provider qualification | 14 days + 20 trades minimum | Automated quality gate via verified journal data |
| Copy mechanism | One-click auto-create with guided fallback | Frictionless for existing users, guided for new |
| Discovery UX | Leaderboard-first | Traders are data-driven; ranked table with sortable stats |
| Architecture | Approach B — Stats Worker | Pre-computed stats via hourly cron; fast leaderboard queries |

## Data Model

### `provider_profiles`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK, auto-generated | Unique identifier |
| user_id | TEXT | UNIQUE, FK → users(id) | One profile per user |
| master_account_id | TEXT | FK → accounts(id) | Which master's signals are published |
| display_name | TEXT | NOT NULL, max 50 chars | Public display name |
| bio | TEXT | max 280 chars | Strategy description |
| instruments | TEXT | | Comma-separated (e.g. "XAUUSD,EURUSD") |
| strategy_style | TEXT | CHECK(scalper/swing/position/mixed) | Trading approach |
| is_listed | BOOLEAN | DEFAULT false | Visible on marketplace when qualified |
| listed_at | TEXT | | First listing timestamp |
| created_at | TEXT | DEFAULT datetime('now') | Profile creation time |

### `provider_stats`

Pre-computed by the stats cron worker. One row per provider, upserted hourly.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT | PK, auto-generated |
| provider_id | TEXT | UNIQUE, FK → provider_profiles(id) |
| total_trades | INTEGER | All-time closed trades |
| win_rate | REAL | Win percentage |
| total_pnl | REAL | All-time P&L in USD |
| avg_pips | REAL | Average pips per trade |
| max_drawdown_pct | REAL | Worst peak-to-trough drawdown % |
| sharpe_ratio | REAL | Simplified: avg daily return / stddev |
| avg_trade_duration_sec | INTEGER | Average hold time in seconds |
| profit_factor | REAL | Gross profit / gross loss |
| active_days | INTEGER | Days with at least one trade |
| subscriber_count | INTEGER | Current active subscribers |
| equity_curve_json | TEXT | JSON array of {date, balance} — last 90 days |
| computed_at | TEXT | Last refresh timestamp |

### `marketplace_subscriptions`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK, auto-generated | Unique identifier |
| subscriber_user_id | TEXT | FK → users(id) | The user copying |
| provider_id | TEXT | FK → provider_profiles(id) | The provider being copied |
| follower_account_id | TEXT | FK → accounts(id) | Auto-created follower account |
| status | TEXT | CHECK(active/paused/cancelled) | Subscription state |
| subscribed_at | TEXT | DEFAULT datetime('now') | When started |
| cancelled_at | TEXT | nullable | When stopped |

**Unique constraint:** (subscriber_user_id, provider_id) — one subscription per provider per user.

## Provider Onboarding Flow

1. User clicks "Become a Provider" (in Settings or sidebar).
2. Setup form collects: display_name, bio, instruments, strategy_style, master_account_id (dropdown of their masters).
3. Qualification check runs:
   - Master must have 14+ days of journal history.
   - Master must have 20+ closed trades in journal.
   - If not met: profile created with `is_listed = false`. User sees progress indicator.
   - If met: `is_listed = true`, appears on marketplace.
4. Stats cron re-checks qualification hourly. If master is deactivated or trades drop below threshold, `is_listed` flips to false.
5. Provider can unlist manually anytime. Existing subscribers stay connected.

## Provider Stats Worker

**Worker name:** `provider-stats-worker`
**Trigger:** Cloudflare Cron, every hour (`0 * * * *`)
**Bindings:** D1 database only.

**Job logic:**

1. Query `provider_profiles` where profile exists (both listed and unlisted — stats are always fresh).
2. For each provider, query `journal_trades` joined via `master_account_id`:
   - Aggregate: total trades, wins, losses, total P&L, avg pips, avg duration.
   - Win rate = wins / total.
   - Profit factor = SUM(profit > 0) / ABS(SUM(profit < 0)).
   - Max drawdown = running peak-to-trough on daily balance series.
   - Sharpe ratio = avg(daily_return) / stddev(daily_return), annualized.
   - Equity curve = one {date, balance} point per day, last 90 days.
   - Subscriber count = COUNT from `marketplace_subscriptions` WHERE status = 'active'.
3. Upsert into `provider_stats` (INSERT OR REPLACE on provider_id).
4. Re-check qualifications: if total_trades < 20 or active_days < 14, set `is_listed = false`.

**Scale:** At 100 providers, ~300 queries/hour. At 1000+, batch with GROUP BY and process in chunks of 50.

## API Routes

All routes added to `api-gateway` under `/v1/marketplace`.

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/marketplace/providers` | Leaderboard. Query params: `sort` (roi/win_rate/subscribers/newest), `instrument`, `strategy`, `min_days`, `limit` (default 20), `offset` |
| GET | `/marketplace/providers/:id` | Provider detail: profile + stats + recent 5 trades |

### Protected (auth required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/marketplace/provider` | Create provider profile |
| PUT | `/marketplace/provider` | Update own profile (bio, instruments, toggle listing) |
| GET | `/marketplace/provider/me` | Get own profile + stats |
| POST | `/marketplace/subscribe/:providerId` | Subscribe: auto-create follower, link to provider's master |
| DELETE | `/marketplace/subscribe/:providerId` | Unsubscribe: cancel subscription, deactivate follower |
| GET | `/marketplace/subscriptions` | List own active subscriptions |

### Subscribe Endpoint Logic

```
1. Validate provider exists and is_listed = true
2. Check no existing active subscription (subscriber_user_id + provider_id)
3. Check user isn't subscribing to themselves
4. Check subscriber's plan allows another follower account
5. If request body has { broker_name, mt5_login }:
   → Create follower account linked to provider's master_account_id
   → Create marketplace_subscription row (status = 'active')
   → Return follower account with api_key + api_secret
6. If no body / missing MT5 details:
   → Check if user has an existing account with mt5_login set (most recently created)
   → If yes: use that account's broker_name + mt5_login, auto-create follower
   → If no: return { needs_setup: true } — frontend opens mini-wizard
```

### Unsubscribe Endpoint Logic

```
1. Find active subscription for user + provider
2. Set status = 'cancelled', cancelled_at = now
3. Deactivate the follower account (is_active = false)
4. Return success
```

## Frontend Components

### New Pages

**1. Marketplace Page (`/marketplace` public, `/app/marketplace` in-app)**
- Leaderboard table: Rank, Provider, Strategy, Win Rate, Total P&L, Max DD, Trades, Days Active, Subscribers, Copy button
- Filter bar: instrument, strategy style, sort, min track record
- Expandable rows: equity curve sparkline, bio, recent 5 trades, stat grid, Copy CTA
- Mobile: card layout with key stats + Copy button

**2. Become a Provider (`/provider/setup`)**
- Setup form: display name, bio, instruments (multi-select), strategy style, master account picker
- Qualification progress bar (if unqualified)
- If already a provider: shows own stats dashboard, edit profile, toggle listing

### Modified Pages

**3. Copier Page (`/accounts`)**
- New third section: "Marketplace Subscriptions"
- Lists providers the user is copying: provider name, win rate, status, Unsubscribe button

### Sidebar Addition

- Add "Marketplace" to the Portfolio group (between Copier and Journal)
- Icon: `Store` or `TrendingUp` from lucide-react

### Copy Flow UI

**One-click path (has MT5 details):**
- Click "Copy" → loading spinner → success toast with API key/secret in modal → done

**Guided fallback (no MT5 details):**
- Click "Copy" → mini-wizard modal: broker name + MT5 login → submit → success with credentials

**Already subscribed:**
- Button shows "Copying" (muted) with small "Unsubscribe" link below

## Scope Decomposition

Three sub-projects, implemented sequentially:

### Sub-project 1: Provider Foundation
- Migration: 3 new tables (provider_profiles, provider_stats, marketplace_subscriptions)
- Provider profile API routes (POST, PUT, GET /me)
- Provider stats cron worker (new worker)
- Become a Provider page + qualification check
- Provider dashboard (own stats, toggle listing)

**Deliverable:** Users can become providers, see their stats. No public marketplace.

### Sub-project 2: Marketplace Discovery
- Public leaderboard API routes (GET /providers, GET /providers/:id)
- Marketplace page with leaderboard, filters, sortable columns
- Expandable row detail panel (equity curve, recent trades, stats)
- Mobile card layout
- Sidebar nav item
- Public/in-app route split

**Deliverable:** Anyone can browse verified providers. No copy action.

### Sub-project 3: Copy & Subscribe
- Subscribe/unsubscribe API routes
- One-click copy with auto follower creation
- Mini-wizard fallback
- Marketplace subscriptions section on Copier page
- Subscriber count updates in stats cron
- Copy/Copying/Unsubscribe button states

**Deliverable:** Full loop — discover, copy, manage subscriptions.

## Non-Goals (MVP)

- Payments / revenue split (added after network has volume)
- Provider ratings / reviews (future)
- Chat between provider and subscriber (future)
- Custom pricing per provider (future — evolve to provider-set pricing)
- Provider verification badges beyond track record (future)
- Admin dashboard for marketplace moderation (future)

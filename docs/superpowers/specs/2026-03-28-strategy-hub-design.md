# Strategy Hub — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Author:** Claude + User

## Overview

A Strategy Hub for TradeMetrics Pro where users browse battle-tested forex strategies and generate custom Expert Advisors with configurable parameters. Each generated EA comes pre-wired with TradeMetrics integration (signal copier, journal sync) and a production risk management layer (session filters, spread gate, consecutive loss limiter, breakeven management). Templates are complete, hand-verified MQL5 files with placeholder substitution — guaranteed to compile cleanly.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Customization | Parameter sliders with guided form | Enough control without overwhelming non-coders |
| Integration | Pre-wired with TradeMetrics | Creates ecosystem flywheel: generate → copy → journal → marketplace |
| Backtest data | Static pre-computed results | Fast, trustworthy, no server-side tick engine needed |
| Strategy count | 5 core strategies at launch | Covers all major styles without diluting quality |
| Architecture | Template strings + shared integration block | Simple, reliable, clean compilation guaranteed |

## Data Model

### `strategy_templates`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK, auto-generated | Unique identifier |
| name | TEXT | NOT NULL | Display name (e.g. "RSI Mean Reversion") |
| slug | TEXT | UNIQUE, NOT NULL | URL-friendly (e.g. "rsi-mean-reversion") |
| description | TEXT | NOT NULL | What the strategy does, 2-3 sentences |
| category | TEXT | CHECK(trend/reversal/breakout/scalp/swing) | Trading style |
| difficulty | TEXT | CHECK(beginner/intermediate/advanced) | Skill level |
| recommended_pairs | TEXT | | Comma-separated (e.g. "EURUSD,GBPUSD") |
| recommended_timeframe | TEXT | | e.g. "H1" or "M15" |
| parameters_json | TEXT | NOT NULL | JSON array defining configurable params |
| backtest_results_json | TEXT | DEFAULT '{}' | JSON with equity curve + metrics |
| template_body | TEXT | NOT NULL | Full MQL5 template with {{PLACEHOLDERS}} |
| integration_block | TEXT | NOT NULL | Shared TradeMetrics + risk management code |
| is_published | BOOLEAN | DEFAULT false | Visible in the hub |
| created_at | TEXT | DEFAULT datetime('now') | Timestamp |

### `ea_generations`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK, auto-generated | Unique identifier |
| user_id | TEXT | FK → users(id) | Who generated it |
| strategy_id | TEXT | FK → strategy_templates(id) | Which strategy |
| parameters_json | TEXT | NOT NULL | User's chosen values |
| generated_at | TEXT | DEFAULT datetime('now') | Timestamp |

### `parameters_json` Schema

Each parameter in the array:

```json
{
  "key": "RSI_PERIOD",
  "label": "RSI Period",
  "type": "int",
  "default": 14,
  "min": 5,
  "max": 50,
  "step": 1,
  "tooltip": "Number of bars for RSI calculation."
}
```

Supported types: `int`, `double`, `enum`, `bool`.

For `enum` type, additional fields: `options` (string array of MQL5 values), `labels` (display names).

## The 5 Core Strategies

### 1. MA Crossover (Trend / Beginner)

Buys when fast MA crosses above slow MA, sells on cross below. Classic trend-following.

**Unique parameters:** Fast MA period (5-50), Slow MA period (20-200), MA type (SMA/EMA/SMMA/LWMA)

**Recommended:** EURUSD, GBPUSD, USDJPY on H1

### 2. RSI Mean Reversion (Reversal / Beginner)

Buys when RSI drops below oversold level, sells when above overbought. Fades extremes with confirmation.

**Unique parameters:** RSI period (5-50), Overbought level (60-90), Oversold level (10-40)

**Recommended:** EURUSD, GBPJPY, AUDUSD on H1

### 3. Breakout + Retest (Breakout / Intermediate)

Detects range using X-bar high/low, enters on breakout with confirmation candle close beyond the level.

**Unique parameters:** Lookback bars (10-100), Breakout buffer pips (0-20), Confirmation candles (1-3)

**Recommended:** GBPUSD, XAUUSD, USDJPY on H1/H4

### 4. London Session Scalper (Scalp / Intermediate)

Only trades during London session. Uses EMA direction + RSI momentum filter for quick entries with tight stops.

**Unique parameters:** Session start hour UTC (5-9), Session end hour UTC (14-18), EMA period (10-50), RSI filter period (7-21)

**Recommended:** EURUSD, GBPUSD, EURGBP on M5/M15

### 5. Multi-Timeframe Trend (Swing / Advanced)

Checks higher timeframe for trend direction via EMA slope, enters on pullback on lower timeframe using Stochastic crossover.

**Unique parameters:** Higher TF (H4/D1), Lower TF (M15/H1), Trend EMA period (20-200), Stochastic K period (5-21), Stochastic D period (3-7), Stochastic slowing (3-7)

**Recommended:** EURUSD, GBPUSD, AUDUSD, XAUUSD on H1 entry / H4-D1 trend

## Common Parameters (All Strategies)

### Trade Management
- Lot size (0.01 - 10.0)
- Stop loss pips (5 - 500)
- Take profit pips (5 - 1000)
- Max spread points (5 - 100)
- Magic number (auto-generated, encodes strategy + params)
- Trade comment (auto-generated with attribution tags)

### Risk Management (from EA skills)
- Max daily loss percent (1-20, default 5) — stops trading for the day
- Consecutive loss limit (1-10, default 3) — pauses after N losses in a row
- Breakeven trigger R:R (0.5 - 3.0, default 1.0) — moves SL to entry at this R:R
- Trailing stop pips (0 = disabled, 10-200)
- Session filter enable (bool) — restrict to configurable hours
- Session start hour UTC (0-23)
- Session end hour UTC (0-23)
- Day filter (Mon-Fri checkboxes, default all enabled)

### TradeMetrics Integration
- Account ID (auto-filled from user's master account)
- API Key (auto-filled)
- API Secret (placeholder — user enters manually)
- API Endpoint (pre-filled with production URL)
- Journal Endpoint (pre-filled)
- Enable Journal (bool, default true)

## Shared Integration Block

The `integration_block` field contains ~250 lines of MQL5 code injected at the `{{TRADEMETRICS_BLOCK}}` marker in every template. It includes:

1. **Signal sending** — queues and sends trade signals to TradeMetrics via HTTP (from existing EdgeRelay_Queue.mqh pattern)
2. **Journal sync** — captures closed trades and syncs to the journal (from existing EdgeRelay_JournalSync.mqh pattern)
3. **Heartbeat** — periodic keepalive to show online status on dashboard
4. **Risk management layer:**
   - Daily P&L tracking with auto-stop
   - Consecutive loss counter with pause
   - Breakeven management
   - Trailing stop
   - Session hour filter
   - Day-of-week filter
   - Spread gate (blocks entry if spread > max)
5. **Display panel** — on-chart HUD showing strategy name, status, P&L, signals sent

The block uses `#include` directives for existing `.mqh` files (EdgeRelay_Http.mqh, EdgeRelay_Crypto.mqh, etc.) — same proven code the current EAs use.

## Template Structure

Each strategy `.mq5` template follows this structure:

```mql5
//+------------------------------------------------------------------+
//| {{STRATEGY_NAME}}.mq5                                             |
//| Generated by TradeMetrics Pro Strategy Hub                        |
//+------------------------------------------------------------------+
#property copyright "TradeMetrics Pro"
#property version   "1.00"
#property strict

// ── Includes (existing proven libraries) ────────────────────────
#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Http.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Queue.mqh>
#include <EdgeRelay_JournalSync.mqh>
#include <EdgeRelay_JournalQueue.mqh>

// ── Strategy-Specific Inputs ────────────────────────────────────
input int    {{PARAM_1_KEY}} = {{PARAM_1_VALUE}};  // {{PARAM_1_LABEL}}
input int    {{PARAM_2_KEY}} = {{PARAM_2_VALUE}};  // {{PARAM_2_LABEL}}
// ... (strategy-specific params)

// ── Trade Management Inputs ─────────────────────────────────────
input double LotSize           = {{LOT_SIZE}};
input int    StopLossPips      = {{SL_PIPS}};
input int    TakeProfitPips    = {{TP_PIPS}};
input int    MaxSpreadPoints   = {{MAX_SPREAD}};
input int    MagicNumber       = {{MAGIC_NUMBER}};

// ── Risk Management Inputs ──────────────────────────────────────
input double MaxDailyLossPercent    = {{MAX_DAILY_LOSS}};
input int    ConsecutiveLossLimit   = {{CONSEC_LOSS_LIMIT}};
input double BreakevenTriggerRR     = {{BE_TRIGGER_RR}};
input int    TrailingStopPips       = {{TRAILING_STOP}};
input bool   UseSessionFilter       = {{USE_SESSION_FILTER}};
input int    SessionStartHour       = {{SESSION_START}};
input int    SessionEndHour         = {{SESSION_END}};

// ── TradeMetrics Integration Inputs ─────────────────────────────
input string AccountID         = "{{ACCOUNT_ID}}";
input string API_Key           = "{{API_KEY}}";
input string API_Secret        = "";
input string API_Endpoint      = "https://edgerelay-signal-ingestion.ghwmelite.workers.dev";
input string JournalEndpoint   = "https://edgerelay-journal-sync.ghwmelite.workers.dev";
input bool   EnableJournal     = true;

// ── {{TRADEMETRICS_BLOCK}} ──────────────────────────────────────
// (shared integration + risk management code injected here)

// ── Strategy Logic ──────────────────────────────────────────────
// (unique entry/exit/indicator logic for this strategy)

int OnInit() { /* ... */ }
void OnTick() { /* ... */ }
void OnDeinit(const int reason) { /* ... */ }
```

## API Routes

All routes in `api-gateway` under `/v1/strategy-hub`.

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/strategy-hub/strategies` | List published strategies (metadata + backtest, no template body) |
| GET | `/strategy-hub/strategies/:slug` | Strategy detail with full parameter schema + backtest results |

### Protected (auth required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/strategy-hub/generate` | Generate EA — validates params, substitutes template, returns .mq5 |
| GET | `/strategy-hub/my-generations` | User's generation history |

### Generate Endpoint Logic

```
1. Validate strategy_id exists and is_published = true
2. Validate each parameter against its schema (type, min, max, enum options)
3. Read template_body and integration_block from strategy_templates
4. Replace {{TRADEMETRICS_BLOCK}} with integration_block
5. Replace each {{PARAM_KEY}} with validated value
6. Auto-fill {{ACCOUNT_ID}}, {{API_KEY}}, {{API_ENDPOINT}} from user's master account
7. Generate magic number encoding strategy + key params
8. Generate trade comment with attribution tags
9. Record in ea_generations (user_id, strategy_id, parameters_json)
10. Return .mq5 file as download (Content-Type: text/plain, Content-Disposition: attachment)
```

## Frontend Components

### New Pages

**1. Strategy Hub Page (`/strategy-hub`)**
- Card grid of 5 strategies
- Each card: name, category badge, difficulty badge, recommended pairs, mini equity curve sparkline
- Click → expands to detail view (or navigates to `/strategy-hub/:slug`)
- Accessible from sidebar under Tools group

**2. Strategy Detail + Generator (`/strategy-hub/:slug`)**
- Top section: name, description, category, difficulty, recommended pairs/timeframe
- Backtest section: equity curve chart, key metrics (win rate, profit factor, max drawdown, total return, Sharpe)
- Parameter form: slider/dropdown for each configurable parameter
- Quick Start presets: Conservative / Balanced / Aggressive buttons
- Risk Management section: sliders for daily loss, consecutive loss, BE trigger, trailing, session filter
- TradeMetrics section: auto-filled credentials (Account ID, API Key, Endpoint)
- "Generate EA" button → downloads .mq5 file
- Success screen: download link, setup reminders, "Generate Another" button

### Modified Pages

**3. Sidebar** — Add "Strategy Hub" to Tools group with `FlaskConical` icon

### My Generations

- Accessible from the Strategy Hub page as a tab or section
- Lists past generations: strategy name, date, parameters used
- "Re-generate" button to create again with same or modified params

## User Flow

```
Browse strategies → Pick one → View backtest results →
Customize parameters (or use preset) → Click "Generate EA" →
Download .mq5 file → Copy to MT5/Experts + compile →
EA auto-connects to TradeMetrics (signals + journal)
```

## Scope Decomposition

### Sub-project 1: Foundation (Database + API + Templates)
- Migration: 2 new tables
- Strategy Hub API routes (4 endpoints)
- EA generation engine (template substitution)
- 5 complete MQL5 strategy templates
- Shared integration block with risk management
- Seed 5 strategies into D1
- CI/CD: add seed step to deploy

**Deliverable:** API generates valid .mq5 files.

### Sub-project 2: Frontend (Strategy Hub Page)
- Strategy Hub browse page with card grid
- Strategy detail + parameter form with sliders/presets
- Generate + download flow
- My Generations history
- Sidebar nav item
- Public/in-app route split

**Deliverable:** Full user-facing Strategy Hub.

### Sub-project 3: Backtest Data + Polish
- Run backtests for all 5 strategies
- Populate backtest_results_json
- Equity curve + metrics display on cards
- Fine-tune templates based on backtest findings

**Deliverable:** Strategies show real performance data.

## Non-Goals (MVP)

- AI-generated strategies (future)
- In-browser backtesting (future)
- Strategy marketplace where users sell strategies (future)
- Visual strategy builder / no-code editor (future)
- Auto-compilation to .ex5 on server (future — would need Wine + MetaEditor)
- Strategy ratings/reviews (future)

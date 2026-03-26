# Prop Firm Rules Database + Engine — Design Spec

**Date**: 2026-03-26
**Status**: Approved
**Scope**: Sub-project 1 of the Prop Firm Command Center. Firm-level rule templates in D1, traffic-light health evaluation engine, API endpoints for templates and health checks. Foundation for all Command Center features.

---

## Goals

1. Create a `firm_templates` D1 table with canonical rulesets per prop firm
2. Seed with top 5 firms (~30-40 template rows covering common plans)
3. Build a traffic-light health engine (SAFE/CAUTION/DANGER) that evaluates accounts against firm rules
4. Provide API endpoints for listing templates, submitting community templates, linking accounts to templates, and evaluating account health
5. Extend `prop_rules` to track which firm template was used and its version
6. Enable community submissions with source-URL verification

## Non-Goals

- No Command Center dashboard UI (separate sub-project)
- No payout calendar
- No safe-to-trade calculator
- No MetaApi integration
- No changes to MT5 EAs

---

## D1 Schema

### New Table: `firm_templates`

```sql
CREATE TABLE firm_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  firm_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  challenge_phase TEXT NOT NULL CHECK(challenge_phase IN ('evaluation_1','evaluation_2','funded','express','instant','evaluation','verification')),

  -- Core rules
  initial_balance REAL NOT NULL,
  profit_target_percent REAL,
  daily_loss_percent REAL NOT NULL,
  max_drawdown_percent REAL NOT NULL,
  daily_loss_type TEXT NOT NULL CHECK(daily_loss_type IN ('balance','equity','higher_of_both')),
  drawdown_type TEXT NOT NULL CHECK(drawdown_type IN ('static','trailing','eod_trailing')),

  -- Time rules
  min_trading_days INTEGER,
  max_calendar_days INTEGER,

  -- Restrictions
  news_trading_restricted INTEGER NOT NULL DEFAULT 0,
  news_minutes_before INTEGER NOT NULL DEFAULT 2,
  news_minutes_after INTEGER NOT NULL DEFAULT 2,
  weekend_holding_allowed INTEGER NOT NULL DEFAULT 1,
  max_lot_size REAL,

  -- Absolute value alternatives (for firms like Apex that use dollar amounts)
  profit_target_amount REAL,
  max_drawdown_amount REAL,

  -- Consistency rules
  consistency_rule INTEGER NOT NULL DEFAULT 0,
  max_daily_profit_percent REAL,

  -- Meta
  source_url TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(firm_name, plan_name, challenge_phase)
);

CREATE INDEX idx_firm_templates_firm ON firm_templates(firm_name);
CREATE INDEX idx_firm_templates_verified ON firm_templates(verified);
```

### prop_rules Extension

```sql
ALTER TABLE prop_rules ADD COLUMN firm_template_id TEXT REFERENCES firm_templates(id);
ALTER TABLE prop_rules ADD COLUMN template_version INTEGER;
```

### prop_rules challenge_phase Migration

The existing `prop_rules.challenge_phase` CHECK constraint only allows `evaluation | verification | funded`. This migration extends it to include the new firm template phases. SQLite requires table recreation:

```sql
-- Recreate prop_rules with extended challenge_phase CHECK
-- (included in 0008_firm_templates.sql migration)
```

The `ChallengePhase` Zod enum in `packages/shared/src/types.ts` must also be updated to include: `'evaluation_1' | 'evaluation_2' | 'funded' | 'express' | 'instant' | 'evaluation' | 'verification'`.

### Daily Loss Type Mapping

The existing `prop_rules` uses `daily_loss_calculation` with values: `balance_start_of_day | equity_high_of_day | previous_day_balance`. The firm templates use `daily_loss_type` with values: `balance | equity | higher_of_both`.

**Mapping when linking template to account (link-firm endpoint):**

| Template `daily_loss_type` | → prop_rules `daily_loss_calculation` |
|---|---|
| `balance` | `balance_start_of_day` |
| `equity` | `equity_high_of_day` |
| `higher_of_both` | `higher_of_both` (NEW — must be added to prop_rules CHECK) |

The migration adds `higher_of_both` to the `prop_rules.daily_loss_calculation` CHECK constraint. The `DailyLossCalculation` Zod enum must also be updated.

The `link-firm` endpoint performs this mapping when copying template rules into `prop_rules`.

---

## Seed Data (Top 5 Firms)

All data verified against official firm documentation. Source URLs stored in each template.

### FTMO

| Plan | Phase | Balance | Profit Target | Daily Loss | Max DD | DD Type | Daily Loss Type | Min Days | Max Days | News | Consistency |
|------|-------|---------|---------------|------------|--------|---------|-----------------|----------|----------|------|-------------|
| $10K | evaluation_1 | 10000 | 10% | 5% | 10% | static | higher_of_both | 4 | 30 | ±2min | No |
| $10K | evaluation_2 | 10000 | 5% | 5% | 10% | static | higher_of_both | 4 | 60 | ±2min | No |
| $10K | funded | 10000 | null | 5% | 10% | static | higher_of_both | null | null | ±2min | No |
| $25K | evaluation_1 | 25000 | 10% | 5% | 10% | static | higher_of_both | 4 | 30 | ±2min | No |
| $25K | evaluation_2 | 25000 | 5% | 5% | 10% | static | higher_of_both | 4 | 60 | ±2min | No |
| $25K | funded | 25000 | null | 5% | 10% | static | higher_of_both | null | null | ±2min | No |
| $50K | evaluation_1 | 50000 | 10% | 5% | 10% | static | higher_of_both | 4 | 30 | ±2min | No |
| $50K | evaluation_2 | 50000 | 5% | 5% | 10% | static | higher_of_both | 4 | 60 | ±2min | No |
| $50K | funded | 50000 | null | 5% | 10% | static | higher_of_both | null | null | ±2min | No |
| $100K | evaluation_1 | 100000 | 10% | 5% | 10% | static | higher_of_both | 4 | 30 | ±2min | No |
| $100K | evaluation_2 | 100000 | 5% | 5% | 10% | static | higher_of_both | 4 | 60 | ±2min | No |
| $100K | funded | 100000 | null | 5% | 10% | static | higher_of_both | null | null | ±2min | No |
| $200K | evaluation_1 | 200000 | 10% | 5% | 10% | static | higher_of_both | 4 | 30 | ±2min | No |
| $200K | evaluation_2 | 200000 | 5% | 5% | 10% | static | higher_of_both | 4 | 60 | ±2min | No |
| $200K | funded | 200000 | null | 5% | 10% | static | higher_of_both | null | null | ±2min | No |

Source: https://ftmo.com/en/trading-objectives/

### FundedNext

| Plan | Phase | Balance | Profit Target | Daily Loss | Max DD | DD Type | Daily Loss Type | Min Days | Max Days | News | Consistency |
|------|-------|---------|---------------|------------|--------|---------|-----------------|----------|----------|------|-------------|
| Stellar $25K | evaluation_1 | 25000 | 8% | 5% | 10% | static | balance | 5 | 30 | Allowed | No |
| Stellar $25K | evaluation_2 | 25000 | 5% | 5% | 10% | static | balance | 5 | 60 | Allowed | No |
| Stellar $25K | funded | 25000 | null | 5% | 10% | static | balance | null | null | Allowed | No |
| Stellar $100K | evaluation_1 | 100000 | 8% | 5% | 10% | static | balance | 5 | 30 | Allowed | No |
| Stellar $100K | evaluation_2 | 100000 | 5% | 5% | 10% | static | balance | 5 | 60 | Allowed | No |
| Stellar $100K | funded | 100000 | null | 5% | 10% | static | balance | null | null | Allowed | No |
| Express $100K | express | 100000 | 25% | 5% | 10% | trailing | balance | 10 | null | Allowed | Yes (max 40%) |

Source: https://fundednext.com/

### The5ers

| Plan | Phase | Balance | Profit Target | Daily Loss | Max DD | DD Type | Daily Loss Type | Min Days | Max Days |
|------|-------|---------|---------------|------------|--------|---------|-----------------|----------|----------|
| Growth $6K | evaluation_1 | 6000 | 8% | 3% | 6% | static | balance | 3 | null |
| Growth $6K | funded | 6000 | null | 3% | 6% | static | balance | null | null |
| Growth $40K | evaluation_1 | 40000 | 8% | 3% | 6% | static | balance | 3 | null |
| Growth $40K | funded | 40000 | null | 3% | 6% | static | balance | null | null |
| Growth $100K | evaluation_1 | 100000 | 8% | 3% | 6% | static | balance | 3 | null |
| Growth $100K | funded | 100000 | null | 3% | 6% | static | balance | null | null |

Source: https://the5ers.com/

### MyFundedFX

| Plan | Phase | Balance | Profit Target | Daily Loss | Max DD | DD Type | Daily Loss Type | Min Days | Max Days |
|------|-------|---------|---------------|------------|--------|---------|-----------------|----------|----------|
| $50K | evaluation_1 | 50000 | 8% | 5% | 10% | static | balance | 5 | 30 |
| $50K | evaluation_2 | 50000 | 5% | 5% | 10% | static | balance | 5 | 60 |
| $50K | funded | 50000 | null | 5% | 10% | static | balance | null | null |
| $100K | evaluation_1 | 100000 | 8% | 5% | 10% | static | balance | 5 | 30 |
| $100K | evaluation_2 | 100000 | 5% | 5% | 10% | static | balance | 5 | 60 |
| $100K | funded | 100000 | null | 5% | 10% | static | balance | null | null |

Source: https://myfundedfx.com/

### Apex Trader Funding (Futures)

| Plan | Phase | Balance | Profit Target | Daily Loss | Max DD | DD Type | Daily Loss Type | Min Days | Max Days | Consistency |
|------|-------|---------|---------------|------------|--------|---------|-----------------|----------|----------|-------------|
| $25K | evaluation_1 | 25000 | $1,500 | null | $1,500 | eod_trailing | balance | 7 | null | No day >30% |
| $25K | funded | 25000 | null | null | $1,500 | eod_trailing | balance | null | null | No day >30% |
| $50K | evaluation_1 | 50000 | $3,000 | null | $2,500 | eod_trailing | balance | 7 | null | No day >30% |
| $50K | funded | 50000 | null | null | $2,500 | eod_trailing | balance | null | null | No day >30% |
| $100K | evaluation_1 | 100000 | $6,000 | null | $3,000 | eod_trailing | balance | 7 | null | No day >30% |
| $100K | funded | 100000 | null | null | $3,000 | eod_trailing | balance | null | null | No day >30% |
| $300K | evaluation_1 | 300000 | $20,000 | null | $7,500 | eod_trailing | balance | 7 | null | No day >30% |
| $300K | funded | 300000 | null | null | $7,500 | eod_trailing | balance | null | null | No day >30% |

Note: Apex uses absolute dollar amounts for drawdown/profit targets (not percentages). Apex has no daily loss limit — only trailing max drawdown.

Source: https://apextraderfunding.com/

### Absolute vs. Percentage Value Handling

Some firms (like Apex) use absolute dollar amounts instead of percentages. The schema handles this with two additional optional columns:

```sql
-- Add to firm_templates CREATE TABLE:
profit_target_amount REAL,       -- absolute dollar target (e.g., $1,500)
max_drawdown_amount REAL,        -- absolute dollar drawdown (e.g., $1,500)
```

**Storage rules:**
- If the firm uses percentages: `profit_target_percent` and `max_drawdown_percent` are set, `_amount` fields are NULL
- If the firm uses absolute amounts: `_amount` fields are set, `_percent` fields store the calculated equivalent (`amount / initial_balance * 100`) for display

**Health engine:** Checks `_amount` fields first. If set, uses absolute comparison (`current_drawdown_dollars vs max_drawdown_amount`). If NULL, falls back to percentage comparison.

**link-firm endpoint:** When linking to an account with a different balance than the template's `initial_balance`, the endpoint recalculates percentages from absolute amounts: `effective_percent = template.max_drawdown_amount / account.initial_balance * 100`. This ensures correct thresholds regardless of account size.

---

## Traffic-Light Health Engine

### Module: `workers/api-gateway/src/lib/healthEngine.ts`

Pure function that evaluates an account's current state against its firm template rules.

### Input

```typescript
interface HealthInput {
  // Current account state (from PropGuard EA sync or manual input)
  current_balance: number;
  current_equity: number;
  starting_balance: number;          // balance at start of challenge/day
  daily_pnl: number;                 // today's P&L
  total_pnl: number;                 // total P&L since start
  high_water_mark: number;           // highest equity reached (for trailing DD)

  // From firm template
  template: FirmTemplate;

  // Time context
  start_date: string;                // when challenge started
  trading_days_completed: number;
}
```

### Output

```typescript
interface AccountHealth {
  status: 'safe' | 'caution' | 'danger';
  score: number;                      // 0-100 composite

  // Per-metric breakdown
  daily_loss: {
    current_percent: number;          // how much of daily loss is used
    limit_percent: number;            // the firm's limit
    used_percent: number;             // current/limit as percentage (0-100)
    status: 'safe' | 'caution' | 'danger';
  } | null;                           // null if firm has no daily loss limit

  drawdown: {
    current_percent: number;
    limit_percent: number;
    used_percent: number;
    status: 'safe' | 'caution' | 'danger';
  };

  profit_target: {
    current_percent: number;
    target_percent: number;
    progress_percent: number;         // 0-100 toward target
  } | null;                           // null if funded (no target)

  time: {
    days_used: number;
    days_remaining: number | null;    // null if no time limit
    min_days_met: boolean;
  } | null;

  warnings: string[];                 // human-readable warnings
}
```

### Evaluation Logic

```
daily_loss_used = |daily_pnl| / (initial_balance * daily_loss_percent)
drawdown_used = depends on drawdown_type:
  - static: (initial_balance - current_equity) / (initial_balance * max_drawdown_percent)
  - trailing: (high_water_mark - current_equity) / (initial_balance * max_drawdown_percent)
  - eod_trailing: same as trailing but calculated at EOD

Thresholds:
  < 60% used → SAFE (green)
  60-80% used → CAUTION (yellow)
  > 80% used → DANGER (red)

Overall status = worst of (daily_loss.status, drawdown.status)

Score (0-100):
  base = 100
  subtract daily_loss_used * 0.4 (weighted 40%)
  subtract drawdown_used * 0.4 (weighted 40%)
  add profit_progress * 0.2 (weighted 20% — reward progress toward target)
  clamp to 0-100
```

### Warnings Generated

- "Daily loss at X% of limit — reduce position size"
- "Drawdown at X% of maximum — consider stopping for the day"
- "Only N trading days remaining to reach profit target"
- "Minimum trading days not yet met (N/M completed)"
- "Consistency rule: today's profit is X% of total — exceeds Y% limit"

---

## API Endpoints

All mounted on the existing api-gateway worker.

### Firm Templates (public + auth)

**`GET /v1/firms`** — List all verified firms (public, no auth)

Returns unique firm names with plan count:
```json
{
  "data": {
    "firms": [
      { "firm_name": "FTMO", "plan_count": 15, "verified": true },
      { "firm_name": "FundedNext", "plan_count": 7, "verified": true }
    ]
  }
}
```

**`GET /v1/firms/:firmName/templates`** — List all templates for a firm (public)

Returns all plan variants:
```json
{
  "data": {
    "templates": [
      {
        "id": "abc123",
        "firm_name": "FTMO",
        "plan_name": "$100K",
        "challenge_phase": "evaluation_1",
        "initial_balance": 100000,
        "profit_target_percent": 10,
        "daily_loss_percent": 5,
        "max_drawdown_percent": 10,
        ...
      }
    ]
  }
}
```

**`GET /v1/firms/templates/:templateId`** — Single template detail (public)

**`POST /v1/firms/templates`** — Submit new template (auth required)

Request body: All firm_template fields except id, verified, submitted_by, version, timestamps.
Must include `source_url`. Sets `verified = 0`, `submitted_by = userId`.

### Account Health (auth required)

**`GET /v1/command/health/:accountId`** — Evaluate single account health

Requires the account to have a linked `firm_template_id` in `prop_rules`. Reads current equity state from `daily_stats` (latest entry). Returns `AccountHealth` object.

**`GET /v1/command/health`** — Evaluate ALL accounts for authenticated user

Returns array of `{ account_id, alias, firm_name, plan_name, health: AccountHealth }`.

### Account-Template Linking (auth required)

**`POST /v1/accounts/:accountId/link-firm`** — Link account to firm template

Request body: `{ "template_id": "abc123" }`

Copies template rules into `prop_rules` for this account. Sets `firm_template_id` and `template_version`. If `prop_rules` already exists for this account, updates it with the template values.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `migrations/0008_firm_templates.sql` | Create | firm_templates table, indexes, prop_rules extension, seed data |
| `packages/shared/src/types.ts` | Modify | Add FirmTemplate, AccountHealth, HealthInput types |
| `workers/api-gateway/src/lib/healthEngine.ts` | Create | Traffic-light evaluation pure function |
| `workers/api-gateway/src/routes/firms.ts` | Create | Firm template CRUD endpoints |
| `workers/api-gateway/src/routes/command.ts` | Create | Health evaluation endpoints |
| `workers/api-gateway/src/index.ts` | Modify | Mount firms on public `app` (GET endpoints public, POST applies auth internally like billing pattern) + command on `protectedApp` |

**No changes to:** MT5 EAs, other workers, web dashboard (separate sub-project).

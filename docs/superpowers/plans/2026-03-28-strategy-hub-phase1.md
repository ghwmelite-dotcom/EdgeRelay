# Strategy Hub Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Strategy Hub backend — database tables, API routes, EA generation engine, 5 complete MQL5 strategy templates with TradeMetrics integration and production risk management, seeded into D1.

**Architecture:** Two new D1 tables (strategy_templates, ea_generations). Four new API routes in api-gateway. EA generation via server-side template substitution — each strategy is a complete, compilable MQL5 file with {{PLACEHOLDER}} tokens for user-configurable values. A shared integration block (TradeMetrics + risk management) is injected at {{TRADEMETRICS_BLOCK}}.

**Tech Stack:** Cloudflare Workers (Hono), D1 SQLite, MQL5, TypeScript

**Spec Reference:** `docs/superpowers/specs/2026-03-28-strategy-hub-design.md`

**EA Skills Reference:** `C:\Users\USER\OneDrive - Smart Workplace\Desktop\Projects\Skills\my complete EA skills\` — use patterns from ea-risk-engine, ea-signal-engine, fintech-trading-systems for risk management, session filters, lot sizing, and trade attribution.

---

## File Map

### New Files
| File | Responsibility |
|------|----------------|
| `migrations/0013_strategy_hub_tables.sql` | Creates strategy_templates + ea_generations tables |
| `workers/api-gateway/src/routes/strategyHub.ts` | Strategy Hub API routes (list, detail, generate, my-generations) |
| `workers/api-gateway/src/templates/integration-block.mq5` | Shared TradeMetrics + risk management MQL5 code |
| `workers/api-gateway/src/templates/ma-crossover.mq5` | MA Crossover strategy template |
| `workers/api-gateway/src/templates/rsi-mean-reversion.mq5` | RSI Mean Reversion strategy template |
| `workers/api-gateway/src/templates/breakout-retest.mq5` | Breakout + Retest strategy template |
| `workers/api-gateway/src/templates/london-session-scalper.mq5` | London Session Scalper strategy template |
| `workers/api-gateway/src/templates/multi-tf-trend.mq5` | Multi-Timeframe Trend strategy template |
| `workers/api-gateway/src/seed-strategies.ts` | Script to seed all 5 strategies into D1 |

### Modified Files
| File | Change |
|------|--------|
| `workers/api-gateway/src/index.ts` | Mount strategyHub routes (public + protected) |
| `.github/workflows/deploy.yml` | Add strategy seed step after migrations |

---

### Task 1: Database Migration

**Files:**
- Create: `migrations/0013_strategy_hub_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Strategy Hub tables

CREATE TABLE IF NOT EXISTS strategy_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('trend','reversal','breakout','scalp','swing')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner','intermediate','advanced')),
  recommended_pairs TEXT,
  recommended_timeframe TEXT,
  parameters_json TEXT NOT NULL DEFAULT '[]',
  backtest_results_json TEXT DEFAULT '{}',
  template_body TEXT NOT NULL,
  integration_block TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_strategy_templates_slug ON strategy_templates(slug);
CREATE INDEX IF NOT EXISTS idx_strategy_templates_published ON strategy_templates(is_published);

CREATE TABLE IF NOT EXISTS ea_generations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  strategy_id TEXT NOT NULL REFERENCES strategy_templates(id),
  parameters_json TEXT NOT NULL,
  generated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ea_generations_user ON ea_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_generations_strategy ON ea_generations(strategy_id);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/0013_strategy_hub_tables.sql
git commit -m "feat(db): add strategy_templates and ea_generations tables"
```

---

### Task 2: Shared Integration Block (MQL5)

**Files:**
- Create: `workers/api-gateway/src/templates/integration-block.mq5`

- [ ] **Step 1: Write the shared integration block**

This is the MQL5 code injected at `{{TRADEMETRICS_BLOCK}}` in every strategy template. It must be valid MQL5 that compiles when placed inside an EA file after the input declarations.

The block provides:
1. Signal queue + sending (from EdgeRelay_Queue.mqh pattern)
2. Journal sync (from EdgeRelay_JournalSync.mqh pattern)
3. Heartbeat keepalive
4. Risk management: daily P&L tracking, consecutive loss limiter, breakeven, trailing stop, session filter, day filter, spread gate
5. On-chart display panel showing strategy status

**Critical requirements:**
- Uses `#include` for existing `.mqh` files (EdgeRelay_Http, EdgeRelay_Crypto, EdgeRelay_Queue, EdgeRelay_JournalSync, EdgeRelay_JournalQueue)
- All variable names prefixed with `g_tm_` to avoid conflicts with strategy-specific code
- All function names prefixed with `TM_` to avoid conflicts
- Must reference the input variables declared in the template (AccountID, API_Key, API_Secret, API_Endpoint, JournalEndpoint, EnableJournal, MaxDailyLossPercent, ConsecutiveLossLimit, BreakevenTriggerRR, TrailingStopPips, UseSessionFilter, SessionStartHour, SessionEndHour, MagicNumber, LotSize, StopLossPips, TakeProfitPips, MaxSpreadPoints)

Read these existing EA files for the proven patterns to base the code on:
- `apps/ea/EdgeRelay_Master.mq5` — signal sending, heartbeat, journal sync patterns
- `apps/ea/Include/EdgeRelay_Queue.mqh` — queue flush pattern
- `apps/ea/Include/EdgeRelay_JournalSync.mqh` — journal capture pattern
- `apps/ea/Include/EdgeRelay_Http.mqh` — HTTP helpers

Read EA skills for risk management patterns:
- `C:\Users\USER\OneDrive - Smart Workplace\Desktop\Projects\Skills\my complete EA skills\ea-report-to-code-recommender.md` — session filters, consecutive loss limiter, breakeven, trailing stop MQL5 code
- `C:\Users\USER\OneDrive - Smart Workplace\Desktop\Projects\Skills\my complete EA skills\fintech-trading-systems.md` — EA template structure, risk management

The integration block should provide these functions for strategy templates to call:
- `int TM_OnInit()` — initialize queues, heartbeat, display panel. Called from OnInit().
- `void TM_OnDeinit(const int reason)` — cleanup. Called from OnDeinit().
- `void TM_OnTick()` — flush queues, heartbeat, update display. Called from OnTick().
- `bool TM_CanTrade()` — returns false if spread too wide, session blocked, daily loss exceeded, or consecutive losses reached. Strategy checks this before entering.
- `void TM_OnTradeOpened(ulong ticket)` — notify signal queue of new trade.
- `void TM_OnTradeClosed(ulong ticket)` — update P&L tracking, consecutive loss counter.
- `void TM_ManageOpenTrades()` — apply breakeven + trailing stop to all open positions with MagicNumber.

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/integration-block.mq5
git commit -m "feat(strategy-hub): add shared TradeMetrics integration block with risk management"
```

---

### Task 3: Strategy Template — MA Crossover

**Files:**
- Create: `workers/api-gateway/src/templates/ma-crossover.mq5`

- [ ] **Step 1: Write the complete MA Crossover EA template**

This is a COMPLETE, compilable MQL5 EA file with {{PLACEHOLDER}} tokens. It must follow this exact structure:

```
1. File header (copyright, property directives)
2. #include directives for .mqh files
3. Strategy-specific input declarations with {{PLACEHOLDERS}}
4. Common input declarations (lot, SL, TP, spread, magic)
5. Risk management input declarations
6. TradeMetrics input declarations
7. {{TRADEMETRICS_BLOCK}} marker (where integration block is injected)
8. Strategy-specific global variables (indicator handles, etc.)
9. OnInit() — create indicator handles + call TM_OnInit()
10. OnDeinit() — release handles + call TM_OnDeinit()
11. OnTick() — call TM_OnTick(), check TM_CanTrade(), check new bar, check MA crossover, open/close trades, call TM_ManageOpenTrades()
```

**Strategy logic for MA Crossover:**
- Create two MA indicators (fast + slow) using `iMA()`
- On new bar: check if fast MA crossed above slow MA (buy signal) or below (sell signal)
- Entry: open BUY or SELL with configured lot, SL, TP
- Exit: close opposite positions when crossover reverses
- Use MagicNumber to track only this EA's positions

**Placeholders needed:**
- `{{FAST_MA_PERIOD}}` (int, default 10)
- `{{SLOW_MA_PERIOD}}` (int, default 50)
- `{{MA_METHOD}}` (enum: MODE_SMA/MODE_EMA/MODE_SMMA/MODE_LWMA, default MODE_EMA)
- `{{TIMEFRAME}}` (enum: PERIOD_M15/PERIOD_H1/PERIOD_H4/PERIOD_D1, default PERIOD_H1)
- Plus all common placeholders ({{LOT_SIZE}}, {{SL_PIPS}}, etc.)
- `{{TRADEMETRICS_BLOCK}}` — injection point for integration code
- `{{STRATEGY_NAME}}` — for display panel and file header

Read `apps/ea/EdgeRelay_Master.mq5` for the MQL5 coding style and patterns used in this project.

The template must compile with zero errors and zero warnings when placeholders are replaced with valid values.

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/ma-crossover.mq5
git commit -m "feat(strategy-hub): add MA Crossover strategy template"
```

---

### Task 4: Strategy Template — RSI Mean Reversion

**Files:**
- Create: `workers/api-gateway/src/templates/rsi-mean-reversion.mq5`

- [ ] **Step 1: Write the complete RSI Mean Reversion EA template**

Same structure as Task 3. Strategy logic:
- Create RSI indicator using `iRSI()`
- On new bar: if RSI < oversold level → BUY signal. If RSI > overbought level → SELL signal.
- Entry: open position with configured lot, SL, TP
- Exit: close BUY when RSI > 50 (mean), close SELL when RSI < 50
- Use MagicNumber to track positions

**Placeholders:**
- `{{RSI_PERIOD}}` (int, default 14)
- `{{RSI_OVERBOUGHT}}` (int, default 70)
- `{{RSI_OVERSOLD}}` (int, default 30)
- `{{TIMEFRAME}}` (enum, default PERIOD_H1)
- Plus all common + TradeMetrics placeholders

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/rsi-mean-reversion.mq5
git commit -m "feat(strategy-hub): add RSI Mean Reversion strategy template"
```

---

### Task 5: Strategy Template — Breakout + Retest

**Files:**
- Create: `workers/api-gateway/src/templates/breakout-retest.mq5`

- [ ] **Step 1: Write the complete Breakout + Retest EA template**

Same structure. Strategy logic:
- Track highest high and lowest low over lookback bars using `iHigh()`/`iLow()` or custom buffer
- On new bar: if close breaks above highest high + buffer → BUY. If close breaks below lowest low - buffer → SELL.
- Confirmation: require N candles closing beyond the level before entry
- Entry: open position with configured lot, SL (below range), TP
- Exit: close on opposite breakout or SL/TP hit
- Use MagicNumber to track positions

**Placeholders:**
- `{{LOOKBACK_BARS}}` (int, default 20)
- `{{BREAKOUT_BUFFER_PIPS}}` (int, default 5)
- `{{CONFIRMATION_CANDLES}}` (int, default 1)
- `{{TIMEFRAME}}` (enum, default PERIOD_H1)
- Plus all common + TradeMetrics placeholders

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/breakout-retest.mq5
git commit -m "feat(strategy-hub): add Breakout + Retest strategy template"
```

---

### Task 6: Strategy Template — London Session Scalper

**Files:**
- Create: `workers/api-gateway/src/templates/london-session-scalper.mq5`

- [ ] **Step 1: Write the complete London Session Scalper EA template**

Same structure. Strategy logic:
- Only trade between session start and end hours (UTC) — uses `TimeGMT()` or broker time offset
- Create EMA indicator using `iMA()` and RSI using `iRSI()`
- On new bar within session: if price > EMA AND RSI > 50 → BUY. If price < EMA AND RSI < 50 → SELL.
- Entry: open with configured lot, tight SL/TP (scalping)
- Exit: SL/TP or session end (close all at session close)
- Use MagicNumber to track positions

**Placeholders:**
- `{{SCALP_SESSION_START}}` (int, default 7) — UTC hour
- `{{SCALP_SESSION_END}}` (int, default 16) — UTC hour
- `{{EMA_PERIOD}}` (int, default 20)
- `{{RSI_FILTER_PERIOD}}` (int, default 14)
- `{{TIMEFRAME}}` (enum: PERIOD_M5/PERIOD_M15, default PERIOD_M15)
- Plus all common + TradeMetrics placeholders

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/london-session-scalper.mq5
git commit -m "feat(strategy-hub): add London Session Scalper strategy template"
```

---

### Task 7: Strategy Template — Multi-Timeframe Trend

**Files:**
- Create: `workers/api-gateway/src/templates/multi-tf-trend.mq5`

- [ ] **Step 1: Write the complete Multi-Timeframe Trend EA template**

Same structure. Strategy logic:
- Higher TF: create EMA on higher timeframe using `iMA(_Symbol, {{HIGHER_TF}}, ...)`
- Lower TF: create Stochastic on lower timeframe using `iStochastic(_Symbol, {{LOWER_TF}}, ...)`
- Trend detection: EMA slope (current - 3 bars ago) determines trend direction
- Entry on lower TF: if trend is UP and Stochastic crosses up from oversold → BUY. If trend is DOWN and Stochastic crosses down from overbought → SELL.
- Exit: opposite trend change or SL/TP
- Use MagicNumber to track positions

**Placeholders:**
- `{{HIGHER_TF}}` (enum: PERIOD_H4/PERIOD_D1, default PERIOD_H4)
- `{{LOWER_TF}}` (enum: PERIOD_M15/PERIOD_H1, default PERIOD_H1)
- `{{TREND_EMA_PERIOD}}` (int, default 50)
- `{{STOCH_K}}` (int, default 14)
- `{{STOCH_D}}` (int, default 3)
- `{{STOCH_SLOWING}}` (int, default 3)
- Plus all common + TradeMetrics placeholders

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/templates/multi-tf-trend.mq5
git commit -m "feat(strategy-hub): add Multi-Timeframe Trend strategy template"
```

---

### Task 8: Strategy Hub API Routes

**Files:**
- Create: `workers/api-gateway/src/routes/strategyHub.ts`
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Create the route file**

Read the spec for the 4 endpoints. Read existing route files for patterns:
- `workers/api-gateway/src/routes/marketplace.ts` — for public + protected split pattern
- `workers/api-gateway/src/routes/accounts.ts` — for file download response pattern

Create `workers/api-gateway/src/routes/strategyHub.ts` with:

**Two Hono instances:** `strategyHub` (protected) and `strategyHubPublic` (public).

**GET /strategy-hub/strategies (public):**
```typescript
strategyHubPublic.get('/strategies', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json
     FROM strategy_templates WHERE is_published = true
     ORDER BY created_at`,
  ).all();
  return c.json<ApiResponse>({ data: results ?? [], error: null });
});
```
Note: does NOT return template_body or integration_block (those are large and private).

**GET /strategy-hub/strategies/:slug (public):**
```typescript
strategyHubPublic.get('/strategies/:slug', async (c) => {
  const slug = c.req.param('slug');
  const strategy = await c.env.DB.prepare(
    `SELECT id, name, slug, description, category, difficulty,
            recommended_pairs, recommended_timeframe, parameters_json,
            backtest_results_json
     FROM strategy_templates WHERE slug = ? AND is_published = true`,
  ).bind(slug).first();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }
  return c.json<ApiResponse>({ data: strategy, error: null });
});
```

**POST /strategy-hub/generate (protected):**
```typescript
strategyHub.post('/generate', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    strategy_id: string;
    parameters: Record<string, unknown>;
  }>();

  if (!body.strategy_id || !body.parameters) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'strategy_id and parameters are required' } },
      400,
    );
  }

  // Fetch strategy template
  const strategy = await c.env.DB.prepare(
    'SELECT * FROM strategy_templates WHERE id = ? AND is_published = true',
  ).bind(body.strategy_id).first<{
    id: string; name: string; slug: string; parameters_json: string;
    template_body: string; integration_block: string;
  }>();

  if (!strategy) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
      404,
    );
  }

  // Parse parameter schema and validate
  const paramSchema = JSON.parse(strategy.parameters_json) as Array<{
    key: string; type: string; default: unknown;
    min?: number; max?: number; step?: number;
    options?: string[];
  }>;

  const validatedParams: Record<string, unknown> = {};

  for (const param of paramSchema) {
    let value = body.parameters[param.key] ?? param.default;

    if (param.type === 'int') {
      value = Math.round(Number(value));
      if (param.min !== undefined && value < param.min) value = param.min;
      if (param.max !== undefined && value > param.max) value = param.max;
    } else if (param.type === 'double') {
      value = Number(value);
      if (param.min !== undefined && value < param.min) value = param.min;
      if (param.max !== undefined && value > param.max) value = param.max;
    } else if (param.type === 'enum') {
      if (param.options && !param.options.includes(String(value))) {
        value = param.default;
      }
    } else if (param.type === 'bool') {
      value = value === true || value === 'true';
    }

    validatedParams[param.key] = value;
  }

  // Get user's master account for auto-fill
  const masterAccount = await c.env.DB.prepare(
    "SELECT id, api_key FROM accounts WHERE user_id = ? AND role = 'master' AND is_active = true ORDER BY created_at DESC LIMIT 1",
  ).bind(userId).first<{ id: string; api_key: string }>();

  // Build the .mq5 file
  let mq5 = strategy.template_body;

  // Inject integration block
  mq5 = mq5.replace('{{TRADEMETRICS_BLOCK}}', strategy.integration_block);

  // Replace strategy-specific parameters
  for (const [key, value] of Object.entries(validatedParams)) {
    const placeholder = `{{${key}}}`;
    mq5 = mq5.split(placeholder).join(String(value));
  }

  // Replace TradeMetrics auto-fill values
  mq5 = mq5.split('{{ACCOUNT_ID}}').join(masterAccount?.id ?? '');
  mq5 = mq5.split('{{API_KEY}}').join(masterAccount?.api_key ?? '');
  mq5 = mq5.split('{{API_ENDPOINT}}').join('https://edgerelay-signal-ingestion.ghwmelite.workers.dev');
  mq5 = mq5.split('{{JOURNAL_ENDPOINT}}').join('https://edgerelay-journal-sync.ghwmelite.workers.dev');
  mq5 = mq5.split('{{STRATEGY_NAME}}').join(strategy.name);

  // Generate magic number from strategy slug hash
  const magicBase = Array.from(strategy.slug).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) * 1000;
  mq5 = mq5.split('{{MAGIC_NUMBER}}').join(String(magicBase));

  // Record generation
  await c.env.DB.prepare(
    'INSERT INTO ea_generations (user_id, strategy_id, parameters_json) VALUES (?, ?, ?)',
  ).bind(userId, body.strategy_id, JSON.stringify(validatedParams)).run();

  // Return .mq5 file
  const filename = `${strategy.slug.replace(/-/g, '_')}_custom.mq5`;
  return new Response(mq5, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
```

**GET /strategy-hub/my-generations (protected):**
```typescript
strategyHub.get('/my-generations', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare(
    `SELECT eg.id, eg.parameters_json, eg.generated_at,
            st.name as strategy_name, st.slug as strategy_slug, st.category
     FROM ea_generations eg
     JOIN strategy_templates st ON st.id = eg.strategy_id
     WHERE eg.user_id = ?
     ORDER BY eg.generated_at DESC
     LIMIT 50`,
  ).bind(userId).all();
  return c.json<ApiResponse>({ data: results ?? [], error: null });
});
```

- [ ] **Step 2: Mount routes in index.ts**

Add imports:
```typescript
import { strategyHub, strategyHubPublic } from './routes/strategyHub.js';
```

Mount public (alongside other public routes like marketplace):
```typescript
app.route('/v1/strategy-hub', strategyHubPublic);
```

Mount protected (alongside other protected routes):
```typescript
protectedApp.route('/strategy-hub', strategyHub);
```

- [ ] **Step 3: Verify typecheck**

Run: `cd workers/api-gateway && pnpm exec tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/routes/strategyHub.ts workers/api-gateway/src/index.ts
git commit -m "feat(api): add Strategy Hub routes — list, detail, generate, my-generations"
```

---

### Task 9: Strategy Seed Script

**Files:**
- Create: `workers/api-gateway/src/seed-strategies.ts`

- [ ] **Step 1: Create seed script**

This script reads the 5 template files and the integration block, then upserts them into the `strategy_templates` table.

```typescript
// seed-strategies.ts
// Run via: wrangler d1 execute edgerelay-db --remote --command "..."
// Or as part of deploy pipeline

// This file exports the SQL INSERT statements for all 5 strategies.
// The actual template bodies are read from the templates/ directory at build time.
// For now, generate INSERT OR REPLACE SQL statements.
```

The seed script should produce SQL that can be run via wrangler. Each strategy gets an INSERT OR REPLACE with:
- name, slug, description, category, difficulty
- recommended_pairs, recommended_timeframe
- parameters_json (the parameter schema array)
- template_body (the full .mq5 template content)
- integration_block (the shared block content)
- is_published = true

Create a Node.js script that:
1. Reads all `.mq5` files from `src/templates/`
2. Builds INSERT OR REPLACE SQL statements
3. Outputs a `.sql` file to `migrations/0014_seed_strategies.sql`

The parameters_json for each strategy:

**MA Crossover:**
```json
[
  {"key":"FAST_MA_PERIOD","label":"Fast MA Period","type":"int","default":10,"min":5,"max":50,"step":1,"tooltip":"Period for the fast moving average."},
  {"key":"SLOW_MA_PERIOD","label":"Slow MA Period","type":"int","default":50,"min":20,"max":200,"step":5,"tooltip":"Period for the slow moving average."},
  {"key":"MA_METHOD","label":"MA Type","type":"enum","options":["MODE_SMA","MODE_EMA","MODE_SMMA","MODE_LWMA"],"labels":["SMA","EMA","SMMA","LWMA"],"default":"MODE_EMA","tooltip":"Moving average calculation method."},
  {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
  {"key":"LOT_SIZE","label":"Lot Size","type":"double","default":0.1,"min":0.01,"max":10.0,"step":0.01,"tooltip":"Trade volume in lots."},
  {"key":"SL_PIPS","label":"Stop Loss (pips)","type":"int","default":50,"min":5,"max":500,"step":5,"tooltip":"Stop loss distance in pips."},
  {"key":"TP_PIPS","label":"Take Profit (pips)","type":"int","default":100,"min":5,"max":1000,"step":5,"tooltip":"Take profit distance in pips."},
  {"key":"MAX_SPREAD","label":"Max Spread (points)","type":"int","default":30,"min":5,"max":100,"step":5,"tooltip":"Block entry if spread exceeds this."},
  {"key":"MAX_DAILY_LOSS","label":"Max Daily Loss %","type":"double","default":5.0,"min":1.0,"max":20.0,"step":0.5,"tooltip":"Stop trading for the day after this % loss."},
  {"key":"CONSEC_LOSS_LIMIT","label":"Consecutive Loss Limit","type":"int","default":3,"min":1,"max":10,"step":1,"tooltip":"Pause after this many losses in a row."},
  {"key":"BE_TRIGGER_RR","label":"Breakeven at R:R","type":"double","default":1.0,"min":0.5,"max":3.0,"step":0.1,"tooltip":"Move SL to breakeven at this risk-reward ratio."},
  {"key":"TRAILING_STOP","label":"Trailing Stop (pips)","type":"int","default":0,"min":0,"max":200,"step":5,"tooltip":"Trailing stop distance. 0 = disabled."},
  {"key":"USE_SESSION_FILTER","label":"Session Filter","type":"bool","default":false,"tooltip":"Restrict trading to specific hours."},
  {"key":"SESSION_START","label":"Session Start (UTC)","type":"int","default":7,"min":0,"max":23,"step":1,"tooltip":"Trading allowed from this hour."},
  {"key":"SESSION_END","label":"Session End (UTC)","type":"int","default":20,"min":0,"max":23,"step":1,"tooltip":"Trading stops at this hour."}
]
```

The other 4 strategies follow the same pattern — same common params (LOT_SIZE through SESSION_END) plus their unique params listed in Tasks 4-7.

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/seed-strategies.ts
git commit -m "feat(strategy-hub): add strategy seed script for D1"
```

---

### Task 10: Build Seed Migration + Deploy

- [ ] **Step 1: Run the seed script to produce migration SQL**

Run the seed script to generate `migrations/0014_seed_strategies.sql` with all 5 strategies.

- [ ] **Step 2: Update deploy.yml**

The existing migration step already runs all `migrations/*.sql` files in order, so the seed will be applied automatically on next deploy.

- [ ] **Step 3: Verify typecheck**

Run: `cd workers/api-gateway && pnpm exec tsc --noEmit`

- [ ] **Step 4: Push all commits**

```bash
git push origin main
```

Expected: CI pipeline runs — typecheck, deploy all workers, run migrations (creates tables + seeds strategies).

- [ ] **Step 5: Test the API**

```bash
curl -s https://edgerelay-api.ghwmelite.workers.dev/v1/strategy-hub/strategies | head -100
```

Expected: JSON array with 5 published strategies (no template_body in response).

---

## Summary

| Task | What it creates |
|------|----------------|
| 1 | 2 new database tables |
| 2 | Shared integration block (TradeMetrics + risk management MQL5) |
| 3 | MA Crossover strategy template |
| 4 | RSI Mean Reversion strategy template |
| 5 | Breakout + Retest strategy template |
| 6 | London Session Scalper strategy template |
| 7 | Multi-Timeframe Trend strategy template |
| 8 | Strategy Hub API routes (4 endpoints) |
| 9 | Strategy seed script |
| 10 | Build seed migration, deploy, verify |

**Next phase:** Sub-project 2 (Frontend — Strategy Hub browse page, parameter form, generate + download flow).

# Prop Firm Rules Database + Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a prop firm rules database with 5 seeded firms, a traffic-light health evaluation engine, and API endpoints for template CRUD, account linking, and health checks.

**Architecture:** New `firm_templates` D1 table with seed data for top 5 firms. Health engine is a pure function in the api-gateway. Extends existing `prop_rules` with template linking. Public API for browsing firms, protected API for health evaluation and template submission.

**Tech Stack:** Hono, TypeScript, Zod, D1/SQLite, existing JWT auth middleware

**Spec:** `docs/superpowers/specs/2026-03-26-prop-firm-rules-engine-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `migrations/0008_firm_templates.sql` | Create | firm_templates table, prop_rules extension, seed data |
| `packages/shared/src/types.ts` | Modify | Add FirmTemplate, AccountHealth, ChallengePhase extension |
| `workers/api-gateway/src/lib/healthEngine.ts` | Create | Traffic-light evaluation pure function |
| `workers/api-gateway/src/routes/firms.ts` | Create | Firm template CRUD (public GET, auth POST) |
| `workers/api-gateway/src/routes/command.ts` | Create | Health evaluation + account-template linking |
| `workers/api-gateway/src/index.ts` | Modify | Mount firms (public) + command (protected) routes |

---

## Task 1: D1 Migration

**Files:**
- Create: `migrations/0008_firm_templates.sql`

- [ ] **Step 1: Create migration with firm_templates table, prop_rules extension, and seed data**

This is a large migration file. It must:

1. Create the `firm_templates` table with all columns from the spec (including `profit_target_amount` and `max_drawdown_amount` for absolute-value firms)
2. Add `firm_template_id` and `template_version` columns to `prop_rules`
3. Recreate `prop_rules` to extend CHECK constraints for `challenge_phase` (add `evaluation_1`, `evaluation_2`, `express`, `instant`) and `daily_loss_calculation` (add `higher_of_both`)
4. Seed data for 5 firms: FTMO (15 rows), FundedNext (7 rows), The5ers (6 rows), MyFundedFX (6 rows), Apex (8 rows) = ~42 rows

Key schema details from the spec:
- `firm_templates` has `UNIQUE(firm_name, plan_name, challenge_phase)`
- `challenge_phase CHECK(... 'evaluation_1','evaluation_2','funded','express','instant','evaluation','verification')`
- `daily_loss_type CHECK(... 'balance','equity','higher_of_both')`
- `drawdown_type CHECK(... 'static','trailing','eod_trailing')`
- All seed rows set `verified = 1`, `source_url` to official firm URLs

For `prop_rules` recreation (to update CHECK constraints):
- Keep ALL existing columns exactly as they are (see `migrations/0004_propguard_tables.sql` for the full schema)
- Add `firm_template_id TEXT REFERENCES firm_templates(id)` and `template_version INTEGER`
- Extend `challenge_phase` CHECK to include new values
- Extend `daily_loss_calculation` CHECK to include `higher_of_both`
- Use explicit column INSERT to preserve data

CRITICAL: The prop_rules table has a UNIQUE constraint on `account_id` and foreign keys. Recreating it requires careful handling.

- [ ] **Step 2: Apply migration**

Run: `cd workers/api-gateway && npx wrangler d1 migrations apply edgerelay-db --remote`

If table recreation causes issues, use: `npx wrangler d1 execute edgerelay-db --remote --file=../../migrations/0008_firm_templates.sql`

- [ ] **Step 3: Verify**

```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT COUNT(*) as cnt FROM firm_templates"
```
Expected: ~42 rows

```bash
npx wrangler d1 execute edgerelay-db --remote --command "PRAGMA table_info(prop_rules)"
```
Expected: Has `firm_template_id` and `template_version` columns

- [ ] **Step 4: Commit**

```bash
git add migrations/0008_firm_templates.sql
git commit -m "feat(command-center): add firm_templates table with 5 firms seeded + extend prop_rules"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add firm template and health types**

Read the current file. Then:

1. Extend the existing `ChallengePhase` Zod enum to include new values:
```typescript
export const ChallengePhase = z.enum([
  'evaluation', 'verification', 'funded',
  'evaluation_1', 'evaluation_2', 'express', 'instant',
]);
```

2. Extend `DailyLossCalculation` Zod enum:
```typescript
export const DailyLossCalculation = z.enum([
  'balance_start_of_day', 'equity_high_of_day', 'previous_day_balance', 'higher_of_both',
]);
```

3. Add new types after the existing PropGuard types:

```typescript
// ── Firm Templates ──────────────────────────────────────────

export const DailyLossType = z.enum(['balance', 'equity', 'higher_of_both']);
export type DailyLossType = z.infer<typeof DailyLossType>;

export const FirmTemplate = z.object({
  id: z.string(),
  firm_name: z.string(),
  plan_name: z.string(),
  challenge_phase: ChallengePhase,
  initial_balance: z.number(),
  profit_target_percent: z.number().nullable(),
  profit_target_amount: z.number().nullable(),
  daily_loss_percent: z.number(),
  max_drawdown_percent: z.number(),
  max_drawdown_amount: z.number().nullable(),
  daily_loss_type: DailyLossType,
  drawdown_type: z.enum(['static', 'trailing', 'eod_trailing']),
  min_trading_days: z.number().nullable(),
  max_calendar_days: z.number().nullable(),
  news_trading_restricted: z.boolean(),
  news_minutes_before: z.number(),
  news_minutes_after: z.number(),
  weekend_holding_allowed: z.boolean(),
  max_lot_size: z.number().nullable(),
  consistency_rule: z.boolean(),
  max_daily_profit_percent: z.number().nullable(),
  source_url: z.string().nullable(),
  verified: z.boolean(),
  version: z.number(),
});
export type FirmTemplate = z.infer<typeof FirmTemplate>;

export const FirmTemplateSubmission = z.object({
  firm_name: z.string().min(1),
  plan_name: z.string().min(1),
  challenge_phase: ChallengePhase,
  initial_balance: z.number().positive(),
  profit_target_percent: z.number().nullable().optional(),
  profit_target_amount: z.number().nullable().optional(),
  daily_loss_percent: z.number().positive(),
  max_drawdown_percent: z.number().positive(),
  max_drawdown_amount: z.number().nullable().optional(),
  daily_loss_type: DailyLossType,
  drawdown_type: z.enum(['static', 'trailing', 'eod_trailing']),
  min_trading_days: z.number().int().nullable().optional(),
  max_calendar_days: z.number().int().nullable().optional(),
  news_trading_restricted: z.boolean().optional().default(false),
  news_minutes_before: z.number().int().optional().default(2),
  news_minutes_after: z.number().int().optional().default(2),
  weekend_holding_allowed: z.boolean().optional().default(true),
  max_lot_size: z.number().nullable().optional(),
  consistency_rule: z.boolean().optional().default(false),
  max_daily_profit_percent: z.number().nullable().optional(),
  source_url: z.string().url(),
});
export type FirmTemplateSubmission = z.infer<typeof FirmTemplateSubmission>;

export interface AccountHealth {
  status: 'safe' | 'caution' | 'danger';
  score: number;
  daily_loss: {
    current_percent: number;
    limit_percent: number;
    used_percent: number;
    status: 'safe' | 'caution' | 'danger';
  } | null;
  drawdown: {
    current_percent: number;
    limit_percent: number;
    used_percent: number;
    status: 'safe' | 'caution' | 'danger';
  };
  profit_target: {
    current_percent: number;
    target_percent: number;
    progress_percent: number;
  } | null;
  time: {
    days_used: number;
    days_remaining: number | null;
    min_days_met: boolean;
  } | null;
  warnings: string[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/shared && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(command-center): add FirmTemplate, AccountHealth types and extend ChallengePhase"
```

---

## Task 3: Health Engine

**Files:**
- Create: `workers/api-gateway/src/lib/healthEngine.ts`

- [ ] **Step 1: Create the traffic-light evaluation function**

Pure function module. No side effects, no D1 calls — just math.

Input: current account state + firm template rules.
Output: AccountHealth object with per-metric breakdown.

Key logic:
- `daily_loss_used_percent`: `|daily_pnl| / (initial_balance * daily_loss_percent / 100) * 100`
- `drawdown_used_percent`: depends on drawdown_type:
  - `static`: `(initial_balance - current_equity) / (initial_balance * max_drawdown_percent / 100) * 100`
  - `trailing`/`eod_trailing`: `(high_water_mark - current_equity) / (initial_balance * max_drawdown_percent / 100) * 100`
- If firm uses absolute amounts (`max_drawdown_amount` is set): use `(high_water_mark - current_equity) / max_drawdown_amount * 100`
- Thresholds: <60% = SAFE, 60-80% = CAUTION, >80% = DANGER
- Overall status = worst of daily_loss and drawdown
- Score = 100 - (daily_loss_used * 0.4) - (drawdown_used * 0.4) + (profit_progress * 0.2), clamped 0-100
- Generate warning strings for each concerning metric
- Handle null daily_loss (Apex has no daily loss limit — skip that metric)

Export: `evaluateHealth(input: HealthInput): AccountHealth`

Also export a daily-loss-type mapping function:
```typescript
export function mapDailyLossType(templateType: string): string {
  const MAP: Record<string, string> = {
    'balance': 'balance_start_of_day',
    'equity': 'equity_high_of_day',
    'higher_of_both': 'higher_of_both',
  };
  return MAP[templateType] ?? 'balance_start_of_day';
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd workers/api-gateway && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add workers/api-gateway/src/lib/healthEngine.ts
git commit -m "feat(command-center): add traffic-light health evaluation engine"
```

---

## Task 4: Firm Template Routes

**Files:**
- Create: `workers/api-gateway/src/routes/firms.ts`

- [ ] **Step 1: Create firm template route handlers**

Hono router with 4 endpoints. GET endpoints are public (no auth). POST applies auth internally (like the billing route pattern).

**`GET /`** — List unique firm names with plan count. Query: `SELECT firm_name, COUNT(*) as plan_count FROM firm_templates WHERE verified = 1 GROUP BY firm_name ORDER BY firm_name`

**`GET /:firmName/templates`** — List all templates for a firm. Query with `WHERE firm_name = ? AND verified = 1`.

**`GET /templates/:templateId`** — Single template by ID.

**`POST /templates`** — Submit new template (auth required). Validate body with `FirmTemplateSubmission` Zod schema. Apply `authMiddleware` inline. Set `verified = 0`, `submitted_by = userId`. INSERT into `firm_templates`.

Follow existing route patterns from `routes/propguard.ts` and `routes/journal.ts`. Use `ApiResponse` type for all responses.

- [ ] **Step 2: Verify compiles**

Run: `cd workers/api-gateway && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add workers/api-gateway/src/routes/firms.ts
git commit -m "feat(command-center): add firm template CRUD endpoints"
```

---

## Task 5: Command Routes (Health + Link)

**Files:**
- Create: `workers/api-gateway/src/routes/command.ts`

- [ ] **Step 1: Create command route handlers**

Hono router with 3 protected endpoints (JWT auth via protectedApp).

**`GET /health/:accountId`** — Evaluate single account health:
1. Verify account ownership (same pattern as journal routes)
2. Get `prop_rules` for account (must have `firm_template_id` linked)
3. Get `firm_templates` row by `firm_template_id`
4. Get latest `daily_stats` row for account
5. Call `evaluateHealth()` with assembled input
6. Return `AccountHealth`

If no firm template linked: return 400 "Account not linked to a firm template"
If no daily_stats: return partial health with warnings

**`GET /health`** — Evaluate ALL accounts for authenticated user:
1. Get all accounts for user
2. For each with a linked firm template, evaluate health
3. Return array of `{ account_id, alias, firm_name, plan_name, health }`

**`POST /link/:accountId`** — Link account to firm template:
1. Verify account ownership
2. Validate body: `{ template_id: string }`
3. Get firm template by ID
4. Upsert `prop_rules` for this account:
   - If exists: UPDATE with template values + set `firm_template_id`, `template_version`
   - If not: INSERT with template values
5. Map `daily_loss_type` using `mapDailyLossType()`
6. If template has `max_drawdown_amount`, recalculate percent: `amount / account_balance * 100`
7. Return `{ linked: true, firm_name, plan_name }`

Import `evaluateHealth` and `mapDailyLossType` from `../lib/healthEngine.js`.

- [ ] **Step 2: Verify compiles**

Run: `cd workers/api-gateway && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add workers/api-gateway/src/routes/command.ts
git commit -m "feat(command-center): add health evaluation and account-template linking endpoints"
```

---

## Task 6: Mount Routes + Deploy

**Files:**
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Add imports and mount routes**

Add imports:
```typescript
import { firms } from './routes/firms.js';
import { command } from './routes/command.js';
```

Mount firms on public app (after billing, before protectedApp):
```typescript
app.route('/v1/firms', firms);
```

Mount command on protectedApp:
```typescript
protectedApp.route('/command', command);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd workers/api-gateway && npx tsc --noEmit`

- [ ] **Step 3: Deploy**

Run: `cd workers/api-gateway && npx wrangler deploy`

- [ ] **Step 4: Verify endpoints**

```bash
curl https://edgerelay-api.ghwmelite.workers.dev/v1/firms
```
Expected: List of 5 firms with plan counts.

- [ ] **Step 5: Commit and push**

```bash
git add workers/api-gateway/src/index.ts
git commit -m "feat(command-center): mount firms and command routes on api-gateway"
git push origin main
```

# /bias Goldmine — Phase 1 (Sage L2 Hero) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the personalized, journal-aware Sage L2 anchor brief + delta block on `/bias`, behind a feature flag, with the existing engine view preserved underneath. End state: a logged-in user with journaled trades opens `/bias` and sees a streamed morning briefing in Mentor voice that cites their own win-rate per ICC phase.

**Architecture:** New `bias-sage` Cloudflare Worker generates per-user briefs at the user's local 06:30 (Claude Sonnet 4.6 streamed via SSE), backed by D1 + KV. `journal-sync` worker materializes a `user_bias_stats` table on each sync. `api-gateway` proxies SSE endpoints. Frontend `BiasEnginePage` is rewritten as a vertical narrative scroll; Phase 1 ships Cover + Anchor + Delta bands plus the existing constellation grid + footer (Crowd / Pulse / Plans bands deferred to Phase 2).

**Tech Stack:** Cloudflare Workers (Hono, ESM), D1, KV, Anthropic API (Claude Sonnet 4.6), React 18 + TypeScript, Tailwind, lucide-react, Vitest (introduced for `bias-sage`).

**Spec:** `docs/superpowers/specs/2026-05-02-bias-goldmine-design.md`

**Conventions to follow:**
- Workers use Hono with ESM. See `workers/api-gateway/src/routes/bias.ts` for route patterns.
- Shared types live in `packages/shared/src/types.ts` (export from `@edgerelay/shared`).
- Migrations are numbered SQL files in `migrations/`. Latest is `0022_orb_engine.sql`.
- The platform has no CI/CD — workers must be deployed manually with `wrangler deploy` from each worker directory.
- All numeric times stored as Unix epoch seconds. Symbol display scaling already handled by `displayScale.ts` for indices; raw bias data stays unscaled in DB.

**Schema corrections discovered during execution (use THESE, not the plan's earlier assumptions):**
- `bias_history` is the source of truth for current bias state — there is NO `bias_state` table. Latest row per symbol is `(symbol, MAX(captured_unix))` with `interval='4h'`.
- `bias_history` columns are `bias` (BULLISH/BEARISH/NEUTRAL) and `phase` (INDICATION/CORRECTION/CONTINUATION/NO_SETUP) — separate columns. The compound `icc_phase` string `BULLISH_INDICATION` is built via `bias || '_' || phase` SQL concat. Timestamp is `captured_unix`, not `ts`.
- `users` does NOT have `timezone`, `watchlist`, or `last_seen_at`. Use `notification_preferences.timezone` for tz (default 'UTC'). Watchlist is hardcoded to the 5 ICC assets `['XAUUSD', 'NAS100', 'US30', 'EURUSD', 'GBPUSD']` (matches `workers/api-gateway/src/bias/fetcher.ts`). `pnpm-filter` for journal-sync uses the unscoped name `edgerelay-journal-sync`, not `@edgerelay/journal-sync`.
- `bias_accuracy_daily` table does not exist — yesterday's accuracy is computed at runtime by `workers/api-gateway/src/bias/accuracy.ts`. For Phase 1, `buildPromptInputs` returns `yesterdayAccuracy: []` and defers this enrichment to a later iteration.

---

## Task 1: Migration `0023_bias_goldmine.sql`

**Files:**
- Create: `migrations/0023_bias_goldmine.sql`

Phase 1 needs three of the spec's tables: `user_bias_stats`, `sage_briefs`, `journal_plans`. The crowd / platform positioning tables ship with the Phase 2 plan. Including `journal_plans` now even though it's used by Phase 2's Execute pathway because `sage_briefs.id` is referenced by it and we want all FK contracts in one migration.

- [ ] **Step 1: Write the migration**

Create `migrations/0023_bias_goldmine.sql`:

```sql
-- Phase 1 of /bias goldmine. See docs/superpowers/specs/2026-05-02-bias-goldmine-design.md.

-- Per-user analytics, materialized from journal_trades × bias_history.
-- Built by journal-sync after every sync completion.
CREATE TABLE IF NOT EXISTS user_bias_stats (
  user_id        TEXT NOT NULL,
  symbol         TEXT NOT NULL,
  icc_phase      TEXT NOT NULL,
  n_trades       INTEGER NOT NULL,
  n_wins         INTEGER NOT NULL,
  total_r        REAL NOT NULL,
  last_trade_at  INTEGER,
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, symbol, icc_phase)
);
CREATE INDEX IF NOT EXISTS idx_ubs_user ON user_bias_stats(user_id, updated_at DESC);

-- Per-user generated briefs (anchor + delta history).
CREATE TABLE IF NOT EXISTS sage_briefs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK(kind IN ('anchor','delta')),
  brief_md      TEXT NOT NULL,
  intent_json   TEXT NOT NULL,
  audio_r2_key  TEXT,
  inputs_hash   TEXT NOT NULL,
  trigger_kind  TEXT,
  generated_at  INTEGER NOT NULL,
  level         TEXT NOT NULL CHECK(level IN ('L1','L2'))
);
CREATE INDEX IF NOT EXISTS idx_sb_user_recent ON sage_briefs(user_id, generated_at DESC);

-- Plans Sage suggested (rendered in Phase 2; FK targets sage_briefs).
CREATE TABLE IF NOT EXISTS journal_plans (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  brief_id      TEXT REFERENCES sage_briefs(id),
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK(direction IN ('long','short')),
  entry         REAL NOT NULL,
  sl            REAL NOT NULL,
  tp            REAL NOT NULL,
  lot           REAL NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('saved','sent','filled','rejected','closed','expired')),
  signal_id     TEXT,
  created_at    INTEGER NOT NULL,
  closed_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jp_user_recent ON journal_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jp_signal ON journal_plans(signal_id);
```

- [ ] **Step 2: Apply migration locally**

Run: `pnpm db:migrate`
Expected: migration `0023_bias_goldmine.sql` applied; new tables visible via `wrangler d1 execute edgerelay-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%bias%' OR name LIKE 'sage%' OR name LIKE 'journal_plans';"`.

- [ ] **Step 3: Commit**

```bash
git add migrations/0023_bias_goldmine.sql
git commit -m "feat(bias-goldmine): migration 0023 — user_bias_stats, sage_briefs, journal_plans"
```

---

## Task 2: Shared types

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`

The structured `<intent>` block from Sage's response and the brief record itself need to be shared between `bias-sage` worker, `api-gateway`, and the frontend.

- [ ] **Step 1: Add types**

Add to `packages/shared/src/types.ts`:

```typescript
// ── Sage briefs ─────────────────────────────────────────────────

export type SageBriefKind = 'anchor' | 'delta';
export type SageBriefLevel = 'L1' | 'L2';
export type SageGreenlitConviction = 'high' | 'medium' | 'low';

export interface SageGreenlitAsset {
  symbol: string;
  direction: 'long' | 'short';
  conviction: SageGreenlitConviction;
}

export interface SageSkippedAsset {
  symbol: string;
  reason: string;
}

export interface SageWatchAsset {
  symbol: string;
  reason: string;
}

export interface SageBriefIntent {
  greenlit: SageGreenlitAsset[];
  skip: SageSkippedAsset[];
  watch: SageWatchAsset[];
  hero_symbol: string | null;
}

export interface SageBrief {
  id: string;
  kind: SageBriefKind;
  brief_md: string;
  intent: SageBriefIntent;
  audio_url: string | null;
  level: SageBriefLevel;
  trigger_kind: string | null;
  generated_at: number; // unix seconds
}

// User stats join surfaced to the prompt builder
export interface UserBiasStat {
  symbol: string;
  icc_phase: string;
  n_trades: number;
  n_wins: number;
  total_r: number;
  last_trade_at: number | null;
}
```

- [ ] **Step 2: Re-export from index**

In `packages/shared/src/index.ts`, ensure the new types are exported (they're already exported transitively if the file does `export * from './types.js';`). Verify no edits needed; if types is not re-exported, add:

```typescript
export type {
  SageBriefKind,
  SageBriefLevel,
  SageGreenlitConviction,
  SageGreenlitAsset,
  SageSkippedAsset,
  SageWatchAsset,
  SageBriefIntent,
  SageBrief,
  UserBiasStat,
} from './types.js';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @edgerelay/shared typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/index.ts
git commit -m "feat(shared): SageBrief and UserBiasStat types for bias goldmine"
```

---

## Task 3: `bias-sage` worker scaffolding

**Files:**
- Create: `workers/bias-sage/wrangler.toml`
- Create: `workers/bias-sage/package.json`
- Create: `workers/bias-sage/tsconfig.json`
- Create: `workers/bias-sage/vitest.config.ts`
- Create: `workers/bias-sage/src/index.ts`
- Create: `workers/bias-sage/src/types.ts`
- Create: `workers/bias-sage/test/index.test.ts`

- [ ] **Step 1: Write `wrangler.toml`**

```toml
name = "edgerelay-bias-sage"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Cron runs every 5 minutes; the handler decides per-user whether to fire.
[triggers]
crons = ["*/5 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"

[[kv_namespaces]]
binding = "BIAS_SAGE"
id = "REPLACE_AFTER_KV_CREATE"

[vars]
SAGE_MODEL = "claude-sonnet-4-6"
DELTA_DAILY_CAP = "4"
N_PLATFORM_DIVERGENCE_THRESHOLD = "50"

# Set via wrangler secret:
# ANTHROPIC_API_KEY
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "@edgerelay/bias-sage",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@edgerelay/shared": "workspace:*",
    "hono": "^4.6.14"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Write minimal `src/types.ts`**

```typescript
export interface Env {
  DB: D1Database;
  BIAS_SAGE: KVNamespace;
  ANTHROPIC_API_KEY: string;
  SAGE_MODEL: string;
  DELTA_DAILY_CAP: string;
  N_PLATFORM_DIVERGENCE_THRESHOLD: string;
}
```

- [ ] **Step 6: Write minimal `src/index.ts`**

```typescript
import { Hono } from 'hono';
import type { Env } from './types.js';

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, worker: 'bias-sage' }));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Per-user wake-time generation lands in Task 13.
  },
};
```

- [ ] **Step 7: Write the failing health test**

`workers/bias-sage/test/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

describe('bias-sage worker', () => {
  it('serves /health', async () => {
    const res = await (app as { fetch: typeof fetch }).fetch(
      new Request('http://x/health'),
      {} as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
```

- [ ] **Step 8: Adjust default export so test can import `app`**

In `src/index.ts`, ensure the Hono `app` is exported by name in addition to default:

```typescript
export const app = new Hono<{ Bindings: Env }>();
// ...routes...
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {},
};
```

Update the test to import the named export:

```typescript
import { app } from '../src/index.js';
// ...
const res = await app.fetch(new Request('http://x/health'));
```

- [ ] **Step 9: Install deps and run test**

Run: `pnpm install && pnpm --filter @edgerelay/bias-sage test`
Expected: 1 passed.

- [ ] **Step 10: Create the KV namespace**

Run: `pnpm --filter @edgerelay/bias-sage exec wrangler kv:namespace create BIAS_SAGE`
Expected: returns an `id`. Paste it into `wrangler.toml` replacing `REPLACE_AFTER_KV_CREATE`.

- [ ] **Step 11: Commit**

```bash
git add workers/bias-sage pnpm-lock.yaml
git commit -m "feat(bias-sage): worker scaffold + vitest setup"
```

---

## Task 4: `user_bias_stats` aggregator in `journal-sync`

**Files:**
- Create: `workers/journal-sync/src/biasStatsAggregator.ts`
- Modify: `workers/journal-sync/src/index.ts` (call aggregator after sync)
- Create: `workers/journal-sync/test/biasStatsAggregator.test.ts`

The aggregator joins `journal_trades` against `bias_history` to compute per-(user, symbol, icc_phase) counts. Runs after every successful journal sync; idempotent.

The bias engine writes ICC phase to `bias_history(symbol, ts, phase)` (already exists from migration 0018). For each `journal_trades` row of a user, look up the phase that was active at `time` for that `symbol`, classify the trade as win (`profit > 0`) or loss, and accumulate.

- [ ] **Step 1: Write the failing test**

`workers/journal-sync/test/biasStatsAggregator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeUserBiasStats, type RawTrade, type RawPhase } from '../src/biasStatsAggregator.js';

describe('computeUserBiasStats', () => {
  it('classifies trades by symbol × icc_phase and computes win rate', () => {
    const trades: RawTrade[] = [
      { user_id: 'u1', symbol: 'EURUSD', time: 100, profit: 10, risk_reward_ratio: 2 },
      { user_id: 'u1', symbol: 'EURUSD', time: 200, profit: -5, risk_reward_ratio: -1 },
      { user_id: 'u1', symbol: 'EURUSD', time: 300, profit: 12, risk_reward_ratio: 2.4 },
      { user_id: 'u1', symbol: 'NAS100', time: 400, profit: -8, risk_reward_ratio: -1 },
    ];
    const phases: RawPhase[] = [
      { symbol: 'EURUSD', ts: 50,  phase: 'BULL_INDICATION' },
      { symbol: 'EURUSD', ts: 150, phase: 'BULL_CONTINUATION' },
      { symbol: 'EURUSD', ts: 250, phase: 'BULL_INDICATION' },
      { symbol: 'NAS100', ts: 350, phase: 'BEAR_FLIP' },
    ];

    const stats = computeUserBiasStats(trades, phases, 1000);

    const eurInd = stats.find((s) => s.symbol === 'EURUSD' && s.icc_phase === 'BULL_INDICATION');
    expect(eurInd).toBeDefined();
    expect(eurInd!.n_trades).toBe(2);
    expect(eurInd!.n_wins).toBe(2);
    expect(eurInd!.total_r).toBeCloseTo(4.4);

    const eurCont = stats.find((s) => s.symbol === 'EURUSD' && s.icc_phase === 'BULL_CONTINUATION');
    expect(eurCont!.n_trades).toBe(1);
    expect(eurCont!.n_wins).toBe(0);

    const nas = stats.find((s) => s.symbol === 'NAS100');
    expect(nas!.n_trades).toBe(1);
    expect(nas!.n_wins).toBe(0);
  });

  it('skips trades with no phase before their timestamp', () => {
    const trades: RawTrade[] = [
      { user_id: 'u1', symbol: 'EURUSD', time: 10, profit: 5, risk_reward_ratio: 1 },
    ];
    const phases: RawPhase[] = [
      { symbol: 'EURUSD', ts: 100, phase: 'BULL_INDICATION' },
    ];
    expect(computeUserBiasStats(trades, phases, 200)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `pnpm --filter @edgerelay/journal-sync test`
Expected: file `biasStatsAggregator.ts` not found.

- [ ] **Step 3: Implement the aggregator**

Create `workers/journal-sync/src/biasStatsAggregator.ts`:

```typescript
export interface RawTrade {
  user_id: string;
  symbol: string;
  time: number;          // unix seconds
  profit: number;
  risk_reward_ratio: number;
}

export interface RawPhase {
  symbol: string;
  ts: number;            // unix seconds
  phase: string;
}

export interface BiasStat {
  user_id: string;
  symbol: string;
  icc_phase: string;
  n_trades: number;
  n_wins: number;
  total_r: number;
  last_trade_at: number;
  updated_at: number;
}

/**
 * For each trade, find the most recent phase row where ts <= trade.time AND symbol matches.
 * Aggregate counts/wins/R into one row per (user, symbol, phase).
 */
export function computeUserBiasStats(
  trades: RawTrade[],
  phases: RawPhase[],
  now: number,
): BiasStat[] {
  // Index phases per symbol, sorted by ts ascending
  const phasesBySymbol = new Map<string, RawPhase[]>();
  for (const p of phases) {
    const arr = phasesBySymbol.get(p.symbol) ?? [];
    arr.push(p);
    phasesBySymbol.set(p.symbol, arr);
  }
  for (const arr of phasesBySymbol.values()) {
    arr.sort((a, b) => a.ts - b.ts);
  }

  const acc = new Map<string, BiasStat>();

  for (const t of trades) {
    const phasesForSymbol = phasesBySymbol.get(t.symbol);
    if (!phasesForSymbol) continue;
    // Binary search for the latest phase with ts <= t.time
    let lo = 0;
    let hi = phasesForSymbol.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (phasesForSymbol[mid]!.ts <= t.time) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx === -1) continue;
    const phase = phasesForSymbol[idx]!.phase;
    const key = `${t.user_id}|${t.symbol}|${phase}`;
    const existing = acc.get(key);
    if (existing) {
      existing.n_trades++;
      if (t.profit > 0) existing.n_wins++;
      existing.total_r += t.risk_reward_ratio;
      existing.last_trade_at = Math.max(existing.last_trade_at, t.time);
    } else {
      acc.set(key, {
        user_id: t.user_id,
        symbol: t.symbol,
        icc_phase: phase,
        n_trades: 1,
        n_wins: t.profit > 0 ? 1 : 0,
        total_r: t.risk_reward_ratio,
        last_trade_at: t.time,
        updated_at: now,
      });
    }
  }

  return [...acc.values()];
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm --filter @edgerelay/journal-sync test`
Expected: 2 passed.

- [ ] **Step 5: Wire into journal-sync index**

Read `workers/journal-sync/src/index.ts` to find where a sync completes for a user. After the sync writes new `journal_trades` rows, query the user's full trade list (last 90d) and the relevant phases, run the aggregator, and upsert results into `user_bias_stats`.

Add an exported function `materializeUserBiasStats(env, accountId, now)` and call it from the sync completion path. Snippet to add (adjust imports based on the existing index.ts structure):

```typescript
import { computeUserBiasStats } from './biasStatsAggregator.js';

export async function materializeUserBiasStats(
  env: { DB: D1Database },
  accountId: string,
  now: number,
): Promise<void> {
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

  const userRow = await env.DB.prepare(
    `SELECT user_id FROM accounts WHERE id = ?`,
  ).bind(accountId).first<{ user_id: string }>();
  if (!userRow) return;
  const userId = userRow.user_id;

  const trades = (await env.DB.prepare(
    `SELECT a.user_id, t.symbol, t.time, t.profit, COALESCE(t.risk_reward_ratio, 0) AS risk_reward_ratio
     FROM journal_trades t JOIN accounts a ON a.id = t.account_id
     WHERE a.user_id = ? AND t.deal_entry IN ('out','inout') AND t.time >= ?`,
  ).bind(userId, ninetyDaysAgo).all<{
    user_id: string; symbol: string; time: number; profit: number; risk_reward_ratio: number;
  }>()).results ?? [];

  if (trades.length === 0) return;

  const symbols = [...new Set(trades.map((t) => t.symbol))];
  const placeholders = symbols.map(() => '?').join(',');
  const phases = (await env.DB.prepare(
    `SELECT symbol, ts, phase FROM bias_history
     WHERE symbol IN (${placeholders}) AND ts >= ?`,
  ).bind(...symbols, ninetyDaysAgo).all<{ symbol: string; ts: number; phase: string }>()).results ?? [];

  const stats = computeUserBiasStats(trades, phases, now);
  if (stats.length === 0) return;

  // Replace this user's stats atomically
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM user_bias_stats WHERE user_id = ?`).bind(userId),
    ...stats.map((s) => env.DB.prepare(
      `INSERT INTO user_bias_stats (user_id, symbol, icc_phase, n_trades, n_wins, total_r, last_trade_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(s.user_id, s.symbol, s.icc_phase, s.n_trades, s.n_wins, s.total_r, s.last_trade_at, s.updated_at)),
  ];
  await env.DB.batch(stmts);
}
```

Then call `await materializeUserBiasStats(env, accountId, Math.floor(Date.now() / 1000));` at the end of the existing per-account sync function. If you can't immediately find that point, add a TODO comment and resolve it before moving on — the engineer must wire this in, not skip it.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @edgerelay/journal-sync typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add workers/journal-sync
git commit -m "feat(journal-sync): materialize user_bias_stats on each sync"
```

---

## Task 5: Inputs assembler (`bias-sage`)

**Files:**
- Create: `workers/bias-sage/src/inputs.ts`
- Create: `workers/bias-sage/test/inputs.test.ts`

Pure data assembler: takes a `user_id` and `Env`, returns the prompt input bundle (bias snapshot, user context, journal stats, yesterday's accuracy, prior anchor) by parallel D1 + KV reads.

- [ ] **Step 1: Write failing test**

`workers/bias-sage/test/inputs.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildPromptInputs } from '../src/inputs.js';

const MOCK_NOW = 1714636800; // 2024-05-02 06:00 UTC

function fakeEnv(rows: Record<string, unknown[]>) {
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          first: async () => rows[`first:${sql.slice(0, 30)}`]?.[0] ?? null,
          all: async () => ({ results: rows[`all:${sql.slice(0, 30)}`] ?? [] }),
        }),
      }),
    } as unknown as D1Database,
    BIAS_SAGE: {
      get: async (_k: string) => null,
    } as unknown as KVNamespace,
  };
}

describe('buildPromptInputs', () => {
  it('returns L2 inputs when user has stats', async () => {
    const env = fakeEnv({
      'first:SELECT id, name, timezone, watc': [{
        id: 'u1', name: 'Oz', timezone: 'UTC', watchlist: 'EURUSD,XAUUSD,NAS100',
      }],
      'all:SELECT symbol, icc_phase, n_trade': [
        { symbol: 'EURUSD', icc_phase: 'BULL_INDICATION', n_trades: 7, n_wins: 5, total_r: 8.4, last_trade_at: 1714000000 },
      ],
      'all:SELECT symbol, bias, score, phas': [
        { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'BULL_INDICATION', retrace_pct: 48, session: 'london' },
      ],
      'all:SELECT symbol, hit FROM bias_acc': [],
    });

    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.level).toBe('L2');
    expect(result.user.name).toBe('Oz');
    expect(result.userStats).toHaveLength(1);
    expect(result.userStats[0]!.symbol).toBe('EURUSD');
  });

  it('returns L1 inputs when no asset has >= 3 trades', async () => {
    const env = fakeEnv({
      'first:SELECT id, name, timezone, watc': [{
        id: 'u1', name: 'Oz', timezone: 'UTC', watchlist: 'EURUSD',
      }],
      'all:SELECT symbol, icc_phase, n_trade': [
        { symbol: 'EURUSD', icc_phase: 'BULL_INDICATION', n_trades: 2, n_wins: 1, total_r: 0.4, last_trade_at: 1714000000 },
      ],
      'all:SELECT symbol, bias, score, phas': [
        { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'BULL_INDICATION', retrace_pct: 48, session: 'london' },
      ],
      'all:SELECT symbol, hit FROM bias_acc': [],
    });
    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.level).toBe('L1');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: file not found.

- [ ] **Step 3: Implement `inputs.ts`**

```typescript
import type { Env } from './types.js';
import type { UserBiasStat, SageBriefLevel } from '@edgerelay/shared';

export interface UserContext {
  id: string;
  name: string;
  timezone: string;
  watchlist: string[];
}

export interface BiasSnapshotRow {
  symbol: string;
  bias: string;
  score: number;
  phase: string;
  retrace_pct: number | null;
  session: string;
}

export interface PromptInputs {
  level: SageBriefLevel;
  user: UserContext;
  userStats: UserBiasStat[];
  bias: BiasSnapshotRow[];
  yesterdayAccuracy: { symbol: string; hit: boolean }[];
  priorAnchorMd: string | null;
  generatedAt: number;
}

export async function buildPromptInputs(
  env: Pick<Env, 'DB' | 'BIAS_SAGE'>,
  userId: string,
  now: number,
): Promise<PromptInputs> {
  const userRow = await env.DB.prepare(
    `SELECT id, name, timezone, watchlist FROM users WHERE id = ?`
  ).bind(userId).first<{ id: string; name: string; timezone: string | null; watchlist: string | null }>();

  if (!userRow) {
    throw new Error(`user not found: ${userId}`);
  }

  const watchlist = (userRow.watchlist ?? 'EURUSD,XAUUSD,NAS100,USDJPY,GBPUSD')
    .split(',').map((s) => s.trim()).filter(Boolean);

  const [statsRes, biasRes, accuracyRes, priorAnchor] = await Promise.all([
    env.DB.prepare(
      `SELECT symbol, icc_phase, n_trades, n_wins, total_r, last_trade_at
       FROM user_bias_stats WHERE user_id = ?`
    ).bind(userId).all<UserBiasStat>(),
    env.DB.prepare(
      `SELECT symbol, bias, score, phase, retrace_pct, session FROM bias_state
       WHERE symbol IN (${watchlist.map(() => '?').join(',')})`
    ).bind(...watchlist).all<BiasSnapshotRow>(),
    env.DB.prepare(
      `SELECT symbol, hit FROM bias_accuracy_daily
       WHERE day = date(?, 'unixepoch', '-1 day')`
    ).bind(now).all<{ symbol: string; hit: number }>(),
    env.BIAS_SAGE.get(`anchor:${userId}:${dayKey(now - 86400)}`),
  ]);

  const userStats = statsRes.results ?? [];
  const level: SageBriefLevel =
    userStats.some((s) => watchlist.includes(s.symbol) && s.n_trades >= 3) ? 'L2' : 'L1';

  return {
    level,
    user: {
      id: userRow.id,
      name: userRow.name,
      timezone: userRow.timezone ?? 'UTC',
      watchlist,
    },
    userStats,
    bias: biasRes.results ?? [],
    yesterdayAccuracy: (accuracyRes.results ?? []).map((r) => ({ symbol: r.symbol, hit: r.hit === 1 })),
    priorAnchorMd: priorAnchor,
    generatedAt: now,
  };
}

function dayKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 3 passed (1 from Task 3, 2 from this task).

- [ ] **Step 5: Commit**

```bash
git add workers/bias-sage/src/inputs.ts workers/bias-sage/test/inputs.test.ts
git commit -m "feat(bias-sage): inputs assembler with L1/L2 detection"
```

---

## Task 6: Prompt builder + voice spec

**Files:**
- Create: `workers/bias-sage/src/prompt.ts`
- Create: `workers/bias-sage/src/voiceSpec.ts`
- Create: `workers/bias-sage/test/prompt.test.ts`

The system prompt is cacheable and shared across all users; the user message is per-call. The Mentor voice spec lives in its own file so it can be revised without touching the prompt-building logic.

- [ ] **Step 1: Write failing test**

`workers/bias-sage/test/prompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildAnchorMessages } from '../src/prompt.js';
import type { PromptInputs } from '../src/inputs.js';

const baseInputs: PromptInputs = {
  level: 'L2',
  user: { id: 'u1', name: 'Oz', timezone: 'UTC', watchlist: ['EURUSD','NAS100'] },
  userStats: [
    { symbol: 'EURUSD', icc_phase: 'BULL_INDICATION', n_trades: 7, n_wins: 5, total_r: 8.4, last_trade_at: 1714000000 },
    { symbol: 'NAS100',  icc_phase: 'BEAR_FLIP',       n_trades: 3, n_wins: 0, total_r: -3.0, last_trade_at: 1714000000 },
  ],
  bias: [
    { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'BULL_INDICATION', retrace_pct: 48, session: 'london' },
    { symbol: 'NAS100', bias: 'BEARISH', score: -55, phase: 'BEAR_FLIP', retrace_pct: null, session: 'london' },
  ],
  yesterdayAccuracy: [],
  priorAnchorMd: null,
  generatedAt: 1714636800,
};

describe('buildAnchorMessages', () => {
  it('emits a system block with voice spec and rules', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.system).toContain('Mentor');
    expect(m.system).toContain('exactly one Socratic question');
    expect(m.system).toContain('<intent>');
  });

  it('embeds user stats verbatim in user message for L2', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.user).toContain('"n_trades":7');
    expect(m.user).toContain('"symbol":"EURUSD"');
  });

  it('marks L1 in user message and omits stats when level is L1', () => {
    const m = buildAnchorMessages({ ...baseInputs, level: 'L1', userStats: [] });
    expect(m.user).toContain('"level":"L1"');
    expect(m.user).toContain('"userStats":[]');
  });

  it('includes prefill', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.assistantPrefill).toContain('Morning, Oz');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `pnpm --filter @edgerelay/bias-sage test`

- [ ] **Step 3: Write `voiceSpec.ts`**

```typescript
export const SAGE_MENTOR_VOICE = `You are Sage, a trading mentor. Your voice:

- Socratic. You ask the trader exactly one direct question that makes them think before clicking.
- Direct, not chatty. No filler ("I hope this finds you well", "let's dive in").
- Specific over vague. Cite numbers and named structure when you have them.
- Plain language. You explain what matters; you do not lecture.
- Confident but humble. You never invent numbers or claim certainty about the future.
`;

export const SAGE_HARD_RULES = `Hard rules:

1. Output exactly two blocks: <brief>...</brief> followed by <intent>...</intent>. Nothing outside.
2. The <brief> block contains markdown narrative for the trader to read. Max 3 paragraphs. Approx 120 words.
3. End the <brief> with exactly one Socratic question, italicized.
4. Never invent ticker prices, statistics, or position counts. If a number is not in the input JSON, do not state it.
5. When user_stats has data, cite the trader's own win-rate or trade count VERBATIM ("You took 7 EURUSD trades during Bullish Indication, 5 winners").
6. When level is "L1", do not cite stats. Invite the trader to journal so future briefs can reference their data.
7. The <intent> block is strict JSON matching this schema:
   {
     "greenlit": [{"symbol":"EURUSD","direction":"long","conviction":"high"}],
     "skip":     [{"symbol":"NAS100","reason":"bear-flip-no-edge"}],
     "watch":    [{"symbol":"XAUUSD","reason":"continuation-thinning-rr"}],
     "hero_symbol": "EURUSD"
   }
   Every symbol in user.watchlist must appear in exactly one of greenlit/skip/watch.
   "hero_symbol" is the single asset you most want them to focus on (or null if none qualifies).
8. Never use the phrases "financial advice", "guaranteed", "risk-free", or "always profitable".
9. The brief is generated for one specific user; address them by name in the first sentence.
`;
```

- [ ] **Step 4: Write `prompt.ts`**

```typescript
import type { PromptInputs } from './inputs.js';
import { SAGE_MENTOR_VOICE, SAGE_HARD_RULES } from './voiceSpec.js';

export interface AnchorMessages {
  system: string;
  user: string;
  assistantPrefill: string;
}

export function buildAnchorMessages(inputs: PromptInputs): AnchorMessages {
  const system = `${SAGE_MENTOR_VOICE}\n\n${SAGE_HARD_RULES}`;

  const userPayload = {
    level: inputs.level,
    user: {
      name: inputs.user.name,
      timezone: inputs.user.timezone,
      watchlist: inputs.user.watchlist,
    },
    userStats: inputs.userStats,
    bias: inputs.bias,
    yesterdayAccuracy: inputs.yesterdayAccuracy,
    priorAnchorMd: inputs.priorAnchorMd,
  };

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
    assistantPrefill: `<brief>\nMorning, ${inputs.user.name}.`,
  };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 7 passed (1 + 2 + 4).

- [ ] **Step 6: Commit**

```bash
git add workers/bias-sage/src/prompt.ts workers/bias-sage/src/voiceSpec.ts workers/bias-sage/test/prompt.test.ts
git commit -m "feat(bias-sage): mentor voice spec + anchor prompt builder"
```

---

## Task 7: Intent parser + LLM client

**Files:**
- Create: `workers/bias-sage/src/intentParser.ts`
- Create: `workers/bias-sage/src/llm.ts`
- Create: `workers/bias-sage/test/intentParser.test.ts`

The LLM returns text with a `<brief>...</brief><intent>...</intent>` shape. Parser extracts both, validates intent against the JSON schema, and returns either parsed values or a structured error.

- [ ] **Step 1: Write failing parser test**

`workers/bias-sage/test/intentParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseSageResponse } from '../src/intentParser.js';

describe('parseSageResponse', () => {
  it('parses brief and intent', () => {
    const text = `<brief>Morning, Oz. Look at this.

Some narrative.

*What's your plan for EUR?*</brief>
<intent>
{"greenlit":[{"symbol":"EURUSD","direction":"long","conviction":"high"}],
 "skip":[{"symbol":"NAS100","reason":"bear-flip"}],
 "watch":[],"hero_symbol":"EURUSD"}
</intent>`;
    const r = parseSageResponse(text);
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.briefMd).toContain('Look at this');
    expect(r.intent.greenlit).toHaveLength(1);
    expect(r.intent.hero_symbol).toBe('EURUSD');
  });

  it('returns parse_error when blocks missing', () => {
    expect(parseSageResponse('plain text').kind).toBe('parse_error');
  });

  it('returns parse_error when intent JSON invalid', () => {
    const text = `<brief>x</brief><intent>{not json}</intent>`;
    expect(parseSageResponse(text).kind).toBe('parse_error');
  });

  it('returns parse_error when intent missing required fields', () => {
    const text = `<brief>x</brief><intent>{"greenlit":[]}</intent>`;
    expect(parseSageResponse(text).kind).toBe('parse_error');
  });

  it('reattaches prefill if response begins with </brief>', () => {
    // When the model is given an assistant prefill, the streamed completion
    // starts AFTER the prefill — first chars may be mid-sentence.
    const completion = ` Look at this.</brief>
<intent>{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}</intent>`;
    const r = parseSageResponse(`<brief>\nMorning, Oz.${completion}`);
    expect(r.kind).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

- [ ] **Step 3: Implement `intentParser.ts`**

```typescript
import type { SageBriefIntent } from '@edgerelay/shared';

export type ParseResult =
  | { kind: 'ok'; briefMd: string; intent: SageBriefIntent }
  | { kind: 'parse_error'; reason: string };

const BRIEF_RE = /<brief>([\s\S]*?)<\/brief>/;
const INTENT_RE = /<intent>([\s\S]*?)<\/intent>/;

export function parseSageResponse(raw: string): ParseResult {
  const briefMatch = raw.match(BRIEF_RE);
  const intentMatch = raw.match(INTENT_RE);
  if (!briefMatch || !intentMatch) {
    return { kind: 'parse_error', reason: 'missing brief or intent block' };
  }
  let intent: unknown;
  try {
    intent = JSON.parse(intentMatch[1]!.trim());
  } catch (e) {
    return { kind: 'parse_error', reason: `intent JSON invalid: ${(e as Error).message}` };
  }
  const validated = validateIntent(intent);
  if (validated.kind === 'invalid') {
    return { kind: 'parse_error', reason: validated.reason };
  }
  return { kind: 'ok', briefMd: briefMatch[1]!.trim(), intent: validated.value };
}

function validateIntent(v: unknown): { kind: 'valid'; value: SageBriefIntent } | { kind: 'invalid'; reason: string } {
  if (!v || typeof v !== 'object') return { kind: 'invalid', reason: 'not an object' };
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.greenlit) || !Array.isArray(o.skip) || !Array.isArray(o.watch)) {
    return { kind: 'invalid', reason: 'greenlit/skip/watch must be arrays' };
  }
  if (typeof o.hero_symbol !== 'string' && o.hero_symbol !== null) {
    return { kind: 'invalid', reason: 'hero_symbol must be string or null' };
  }
  // Lenient on per-item shape; downstream consumers default-populate
  return {
    kind: 'valid',
    value: {
      greenlit: o.greenlit as SageBriefIntent['greenlit'],
      skip: o.skip as SageBriefIntent['skip'],
      watch: o.watch as SageBriefIntent['watch'],
      hero_symbol: o.hero_symbol as string | null,
    },
  };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 12 passed.

- [ ] **Step 5: Implement `llm.ts`** (no test — thin wrapper around fetch, integration-tested via the anchor handler in Task 8)

```typescript
import type { AnchorMessages } from './prompt.js';

export interface LlmStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface CallSageOpts {
  apiKey: string;
  model: string;
  maxTokens?: number;
}

/**
 * Calls Anthropic Messages API with streaming. Yields text chunks; the assistant
 * prefill is prepended to the first chunk so downstream consumers see the
 * complete response text.
 */
export async function* callSageStream(
  messages: AnchorMessages,
  opts: CallSageOpts,
): AsyncGenerator<LlmStreamChunk> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 800,
      stream: true,
      system: [
        { type: 'text', text: messages.system, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: messages.user },
        { role: 'assistant', content: messages.assistantPrefill },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', error: `HTTP ${res.status}: ${await res.text()}` };
    return;
  }

  // Re-emit the prefill so consumers get the full text.
  yield { type: 'text', text: messages.assistantPrefill };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload) as { type: string; delta?: { type: string; text?: string } };
        if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta' && obj.delta.text) {
          yield { type: 'text', text: obj.delta.text };
        }
      } catch {
        // skip malformed line
      }
    }
  }
  yield { type: 'done' };
}
```

- [ ] **Step 6: Commit**

```bash
git add workers/bias-sage/src/intentParser.ts workers/bias-sage/src/llm.ts workers/bias-sage/test/intentParser.test.ts
git commit -m "feat(bias-sage): intent parser + Anthropic streaming client"
```

---

## Task 8: Anchor handler + KV cache

**Files:**
- Create: `workers/bias-sage/src/cache.ts`
- Create: `workers/bias-sage/src/anchorHandler.ts`
- Modify: `workers/bias-sage/src/index.ts` (mount route)
- Create: `workers/bias-sage/test/anchorHandler.test.ts`

`GET /sage/anchor?user_id=...` returns the cached anchor as SSE if present; otherwise generates one (stream tokens to client and to cache simultaneously) and returns it. Cache key: `anchor:{user_id}:{yyyy-mm-dd}` with 36h TTL.

- [ ] **Step 1: Write `cache.ts`**

```typescript
import type { Env } from './types.js';

export function dayKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export const ANCHOR_KV_TTL = 36 * 60 * 60; // seconds

export interface CachedAnchor {
  briefMd: string;
  intentJson: string;
  level: 'L1' | 'L2';
  generatedAt: number;
}

export async function getAnchor(env: Env, userId: string, day: string): Promise<CachedAnchor | null> {
  const raw = await env.BIAS_SAGE.get(`anchor:${userId}:${day}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnchor;
  } catch {
    return null;
  }
}

export async function putAnchor(env: Env, userId: string, day: string, value: CachedAnchor): Promise<void> {
  await env.BIAS_SAGE.put(`anchor:${userId}:${day}`, JSON.stringify(value), { expirationTtl: ANCHOR_KV_TTL });
}
```

- [ ] **Step 2: Write failing handler test (cache hit only)**

`workers/bias-sage/test/anchorHandler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { handleAnchor } from '../src/anchorHandler.js';

const FIXED_NOW = 1714636800;

function makeEnv(kv: Map<string, string>) {
  return {
    DB: {} as D1Database,
    BIAS_SAGE: {
      get: async (k: string) => kv.get(k) ?? null,
      put: async (k: string, v: string) => { kv.set(k, v); },
    } as unknown as KVNamespace,
    ANTHROPIC_API_KEY: 'sk-fake',
    SAGE_MODEL: 'claude-sonnet-4-6',
    DELTA_DAILY_CAP: '4',
    N_PLATFORM_DIVERGENCE_THRESHOLD: '50',
  };
}

describe('handleAnchor', () => {
  it('returns 200 SSE with cached brief', async () => {
    const kv = new Map<string, string>();
    kv.set('anchor:u1:2024-05-02', JSON.stringify({
      briefMd: 'Morning, Oz.',
      intentJson: '{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}',
      level: 'L2',
      generatedAt: FIXED_NOW,
    }));
    const env = makeEnv(kv);
    const req = new Request('https://x/sage/anchor?user_id=u1');
    const res = await handleAnchor(req, env, FIXED_NOW);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('Morning, Oz.');
    expect(body).toContain('event: done');
  });

  it('returns 400 when user_id missing', async () => {
    const res = await handleAnchor(new Request('https://x/sage/anchor'), makeEnv(new Map()), FIXED_NOW);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run test, expect failure**

- [ ] **Step 4: Implement `anchorHandler.ts`**

```typescript
import type { Env } from './types.js';
import { dayKey, getAnchor, putAnchor } from './cache.js';
import { buildPromptInputs } from './inputs.js';
import { buildAnchorMessages } from './prompt.js';
import { callSageStream } from './llm.js';
import { parseSageResponse } from './intentParser.js';

export async function handleAnchor(req: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return new Response('user_id required', { status: 400 });

  const day = dayKey(now);
  const cached = await getAnchor(env, userId, day);
  if (cached) {
    return sseFromCached(cached);
  }

  // Cache miss → live generation, dual-fan to client and to cache.
  return generateAndStream(env, userId, day, now);
}

function sseFromCached(cached: { briefMd: string }): Response {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: cached.briefMd })}\n\n`));
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
  return sseResponse(stream);
}

async function generateAndStream(env: Env, userId: string, day: string, now: number): Promise<Response> {
  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildAnchorMessages(inputs);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let full = '';
      try {
        for await (const chunk of callSageStream(messages, {
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.SAGE_MODEL,
        })) {
          if (chunk.type === 'text' && chunk.text) {
            full += chunk.text;
            controller.enqueue(enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: chunk.text })}\n\n`));
          } else if (chunk.type === 'error') {
            controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`));
          }
        }
        const parsed = parseSageResponse(full);
        if (parsed.kind === 'ok') {
          await putAnchor(env, userId, day, {
            briefMd: parsed.briefMd,
            intentJson: JSON.stringify(parsed.intent),
            level: inputs.level,
            generatedAt: now,
          });
          controller.enqueue(enc.encode(`event: intent\ndata: ${JSON.stringify(parsed.intent)}\n\n`));
        } else {
          controller.enqueue(enc.encode(`event: parse_error\ndata: ${JSON.stringify({ reason: parsed.reason })}\n\n`));
        }
        controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      } catch (e) {
        controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ error: (e as Error).message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return sseResponse(stream);
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}
```

- [ ] **Step 5: Mount route in `index.ts`**

Update `workers/bias-sage/src/index.ts`:

```typescript
import { Hono } from 'hono';
import type { Env } from './types.js';
import { handleAnchor } from './anchorHandler.js';

export const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, worker: 'bias-sage' }));

app.get('/sage/anchor', (c) => handleAnchor(c.req.raw, c.env, Math.floor(Date.now() / 1000)));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Wake-time generation lands in Task 11.
  },
};
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 14 passed.

- [ ] **Step 7: Commit**

```bash
git add workers/bias-sage/src/cache.ts workers/bias-sage/src/anchorHandler.ts workers/bias-sage/src/index.ts workers/bias-sage/test/anchorHandler.test.ts
git commit -m "feat(bias-sage): anchor handler with KV cache + SSE streaming"
```

---

## Task 9: Materiality watcher

**Files:**
- Create: `workers/bias-sage/src/materiality.ts`
- Create: `workers/bias-sage/test/materiality.test.ts`

Pure-function inputs hash + materiality classifier. The classifier reads bias-engine state changes since the last brief and returns a list of users for whom a delta should regen, plus the `inputs_hash`. Hash dedup prevents re-running on the same triggering snapshot within 60 minutes.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeInputsHash, isMaterialChange } from '../src/materiality.js';

describe('materiality', () => {
  it('produces stable hash for same inputs', () => {
    const a = computeInputsHash({ phases: { EURUSD: 'BULL_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    const b = computeInputsHash({ phases: { EURUSD: 'BULL_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    expect(a).toBe(b);
  });

  it('produces different hash when phase changes', () => {
    const a = computeInputsHash({ phases: { EURUSD: 'BULL_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    const b = computeInputsHash({ phases: { EURUSD: 'BULL_CONTINUATION' }, openPositions: [], lastBriefId: 'b1' });
    expect(a).not.toBe(b);
  });

  it('detects phase flip on watchlist as material', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULL_INDICATION' },
      currentPhases:  { EURUSD: 'BEAR_FLIP' },
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    expect(r.material).toBe(true);
    expect(r.triggers).toContain('phase_flip:EURUSD');
  });

  it('ignores phase flips off the watchlist', () => {
    const r = isMaterialChange({
      watchlist: ['XAUUSD'],
      previousPhases: { EURUSD: 'BULL_INDICATION' },
      currentPhases:  { EURUSD: 'BEAR_FLIP' },
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    expect(r.material).toBe(false);
  });

  it('treats regime flip as material', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULL_INDICATION' },
      currentPhases:  { EURUSD: 'BULL_INDICATION' },
      anyAlertFiredForUser: false,
      regimeFlipped: true,
    });
    expect(r.material).toBe(true);
    expect(r.triggers).toContain('regime_flip');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

- [ ] **Step 3: Implement `materiality.ts`**

```typescript
export interface InputsHashSource {
  phases: Record<string, string>;
  openPositions: { symbol: string; direction: 'long'|'short' }[];
  lastBriefId: string | null;
}

export function computeInputsHash(src: InputsHashSource): string {
  // Sort keys for stability
  const phasesEntries = Object.entries(src.phases).sort(([a], [b]) => a.localeCompare(b));
  const positionsSorted = [...src.openPositions].sort((a, b) =>
    a.symbol === b.symbol ? a.direction.localeCompare(b.direction) : a.symbol.localeCompare(b.symbol)
  );
  const canonical = JSON.stringify({ phases: phasesEntries, positions: positionsSorted, lastBriefId: src.lastBriefId });
  // Web Crypto isn't available in plain Node tests without polyfill; use a simple FNV-1a 32-bit hash.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface MaterialityInput {
  watchlist: string[];
  previousPhases: Record<string, string>;
  currentPhases: Record<string, string>;
  anyAlertFiredForUser: boolean;
  regimeFlipped: boolean;
}

export interface MaterialityResult {
  material: boolean;
  triggers: string[];
}

export function isMaterialChange(input: MaterialityInput): MaterialityResult {
  const triggers: string[] = [];
  for (const sym of input.watchlist) {
    const prev = input.previousPhases[sym];
    const curr = input.currentPhases[sym];
    if (prev && curr && prev !== curr) triggers.push(`phase_flip:${sym}`);
  }
  if (input.anyAlertFiredForUser) triggers.push('alert');
  if (input.regimeFlipped) triggers.push('regime_flip');
  return { material: triggers.length > 0, triggers };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 19 passed.

- [ ] **Step 5: Commit**

```bash
git add workers/bias-sage/src/materiality.ts workers/bias-sage/test/materiality.test.ts
git commit -m "feat(bias-sage): materiality classifier + inputs hash"
```

---

## Task 10: Delta handler

**Files:**
- Create: `workers/bias-sage/src/deltaPrompt.ts`
- Create: `workers/bias-sage/src/deltaHandler.ts`
- Modify: `workers/bias-sage/src/index.ts` (mount route)
- Create: `workers/bias-sage/test/deltaHandler.test.ts`

`GET /sage/delta?user_id=...` returns the current delta if cached and still hot (< 60 min same hash), or generates a new one if material change detected since the anchor was written. Daily cap from `env.DELTA_DAILY_CAP`.

- [ ] **Step 1: Implement `deltaPrompt.ts`**

```typescript
import type { PromptInputs } from './inputs.js';
import { SAGE_MENTOR_VOICE } from './voiceSpec.js';

export interface DeltaContext extends PromptInputs {
  anchorBriefMd: string;
  triggers: string[];
}

export interface DeltaMessages {
  system: string;
  user: string;
  assistantPrefill: string;
}

export function buildDeltaMessages(ctx: DeltaContext): DeltaMessages {
  const system = `${SAGE_MENTOR_VOICE}

You are writing a SHORT delta update (2-3 sentences max, under 50 words). The trader already read your morning anchor; this is what changed since.

Hard rules:
1. Output exactly: <delta>...</delta><intent>...</intent>. Nothing outside.
2. Max 50 words. Reference the anchor explicitly ("this morning I said X — here's the update").
3. End with at most one Socratic question, italicized. May omit if redundant.
4. Same intent JSON schema as the anchor.
5. Never invent numbers. Never use "financial advice" / "guaranteed".
`;
  return {
    system,
    user: JSON.stringify({
      anchor_brief_md: ctx.anchorBriefMd,
      triggers: ctx.triggers,
      bias: ctx.bias,
      userStats: ctx.userStats,
      user: { name: ctx.user.name, watchlist: ctx.user.watchlist },
    }, null, 2),
    assistantPrefill: `<delta>\n`,
  };
}
```

- [ ] **Step 2: Write failing handler test**

```typescript
import { describe, it, expect } from 'vitest';
import { handleDelta } from '../src/deltaHandler.js';

const FIXED_NOW = 1714680000;

function makeEnv(kv: Map<string, string>) {
  return {
    DB: {} as D1Database,
    BIAS_SAGE: {
      get: async (k: string) => kv.get(k) ?? null,
      put: async (k: string, v: string) => { kv.set(k, v); },
    } as unknown as KVNamespace,
    ANTHROPIC_API_KEY: 'sk-fake',
    SAGE_MODEL: 'claude-sonnet-4-6',
    DELTA_DAILY_CAP: '4',
    N_PLATFORM_DIVERGENCE_THRESHOLD: '50',
  };
}

describe('handleDelta', () => {
  it('returns 200 SSE with cached delta', async () => {
    const kv = new Map<string, string>();
    const day = new Date(FIXED_NOW * 1000).toISOString().slice(0, 10);
    kv.set(`delta:u1:${day}`, JSON.stringify({
      briefMd: 'Quick note.',
      intentJson: '{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}',
      generatedAt: FIXED_NOW,
      inputsHash: 'aaaa',
    }));
    const res = await handleDelta(new Request('https://x/sage/delta?user_id=u1'), makeEnv(kv), FIXED_NOW);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Quick note.');
  });

  it('returns 204 when no delta exists yet', async () => {
    const res = await handleDelta(new Request('https://x/sage/delta?user_id=u1'), makeEnv(new Map()), FIXED_NOW);
    expect(res.status).toBe(204);
  });

  it('returns 400 when user_id missing', async () => {
    const res = await handleDelta(new Request('https://x/sage/delta'), makeEnv(new Map()), FIXED_NOW);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Implement `deltaHandler.ts`**

```typescript
import type { Env } from './types.js';
import { dayKey } from './cache.js';

export interface CachedDelta {
  briefMd: string;
  intentJson: string;
  generatedAt: number;
  inputsHash: string;
}

export async function handleDelta(req: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return new Response('user_id required', { status: 400 });

  const day = dayKey(now);
  const raw = await env.BIAS_SAGE.get(`delta:${userId}:${day}`);
  if (!raw) return new Response(null, { status: 204 });

  let cached: CachedDelta;
  try {
    cached = JSON.parse(raw) as CachedDelta;
  } catch {
    return new Response(null, { status: 204 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`event: text\ndata: ${JSON.stringify({ chunk: cached.briefMd })}\n\n`));
      controller.enqueue(enc.encode(`event: intent\ndata: ${cached.intentJson}\n\n`));
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}

/**
 * Generation path. Called by the materiality watcher (Task 11), NOT by the GET handler.
 * Caps at env.DELTA_DAILY_CAP per user per day; dedups by inputsHash within 60 min.
 */
export async function generateDelta(
  env: Env,
  userId: string,
  triggers: string[],
  inputsHash: string,
  now: number,
): Promise<{ generated: boolean; reason?: string }> {
  const day = dayKey(now);
  const cap = parseInt(env.DELTA_DAILY_CAP, 10);

  const countKey = `delta:count:${userId}:${day}`;
  const countRaw = await env.BIAS_SAGE.get(countKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  if (count >= cap) return { generated: false, reason: 'daily_cap' };

  const existingRaw = await env.BIAS_SAGE.get(`delta:${userId}:${day}`);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw) as CachedDelta;
      if (existing.inputsHash === inputsHash && now - existing.generatedAt < 3600) {
        return { generated: false, reason: 'hash_dedup' };
      }
    } catch {
      // fall through, regenerate
    }
  }

  // The actual LLM call wires in via Task 11 (which assembles full DeltaContext).
  // This stub returns true once the watcher decides regen is worthwhile;
  // the caller is responsible for writing the cache and bumping the count.
  return { generated: true };
}
```

- [ ] **Step 4: Mount route in `index.ts`**

```typescript
app.get('/sage/delta', (c) => handleDelta(c.req.raw, c.env, Math.floor(Date.now() / 1000)));
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 22 passed.

- [ ] **Step 6: Commit**

```bash
git add workers/bias-sage/src/deltaPrompt.ts workers/bias-sage/src/deltaHandler.ts workers/bias-sage/src/index.ts workers/bias-sage/test/deltaHandler.test.ts
git commit -m "feat(bias-sage): delta handler + cap/dedup logic"
```

---

## Task 11: Wake-time scheduler + delta materiality runner

**Files:**
- Create: `workers/bias-sage/src/scheduler.ts`
- Modify: `workers/bias-sage/src/index.ts` (call from `scheduled`)
- Modify: `workers/bias-sage/src/deltaHandler.ts` (export `writeDeltaToCache`)
- Create: `workers/bias-sage/test/scheduler.test.ts`

The cron runs every 5 minutes. For each user whose local time matches 06:30 ± 2.5 min (within the 5-min window), pre-generate the anchor and warm KV. Separately, scan recent bias-engine phase changes; for each affected user, check materiality and trigger delta generation.

- [ ] **Step 1: Write failing scheduler test**

```typescript
import { describe, it, expect } from 'vitest';
import { isWakeTimeNow } from '../src/scheduler.js';

describe('isWakeTimeNow', () => {
  it('returns true when now == 06:30 in user tz', () => {
    // 2024-05-02 06:30 UTC
    expect(isWakeTimeNow('UTC', 1714631400)).toBe(true);
  });
  it('returns true within ±2.5 min window', () => {
    expect(isWakeTimeNow('UTC', 1714631400 + 60)).toBe(true);
    expect(isWakeTimeNow('UTC', 1714631400 - 60)).toBe(true);
  });
  it('returns false outside window', () => {
    expect(isWakeTimeNow('UTC', 1714631400 + 600)).toBe(false);
  });
  it('handles non-UTC tz', () => {
    // 06:30 America/New_York on 2024-05-02 = 10:30 UTC = 1714645800
    expect(isWakeTimeNow('America/New_York', 1714645800)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `scheduler.ts`**

```typescript
import type { Env } from './types.js';

const WAKE_HOUR = 6;
const WAKE_MIN = 30;
const WINDOW_SEC = 150; // ±2.5 min

export function isWakeTimeNow(timezone: string, nowUnix: number): boolean {
  // Use Intl.DateTimeFormat with the user's tz to get hour/minute at nowUnix
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(nowUnix * 1000));
  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const mm = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  // Convert "user-local now" and "user-local 06:30 today" to seconds-of-day in tz
  const nowSec = hh * 3600 + mm * 60;
  const wakeSec = WAKE_HOUR * 3600 + WAKE_MIN * 60;
  let diff = Math.abs(nowSec - wakeSec);
  // Wrap-around for tz shifts at midnight
  if (diff > 43200) diff = 86400 - diff;
  return diff <= WINDOW_SEC;
}

export async function runWakeTimeScan(env: Env, now: number, ctx: ExecutionContext): Promise<void> {
  // 1. List active users (cap to those who have logged in within last 14d to avoid LLM spam)
  const users = (await env.DB.prepare(
    `SELECT id, timezone FROM users WHERE last_seen_at > ?`
  ).bind(now - 14 * 86400).all<{ id: string; timezone: string | null }>()).results ?? [];

  for (const u of users) {
    const tz = u.timezone ?? 'UTC';
    if (!isWakeTimeNow(tz, now)) continue;
    ctx.waitUntil(
      pregenerateAnchor(env, u.id, now).catch((e) => {
        console.error('anchor pregen failed', u.id, (e as Error).message);
      })
    );
  }
}

async function pregenerateAnchor(env: Env, userId: string, now: number): Promise<void> {
  // Trigger the same generation path as a cache miss in handleAnchor would.
  // Importing handleAnchor would cause cycles; reimplement minimally.
  const { dayKey, putAnchor, getAnchor } = await import('./cache.js');
  const { buildPromptInputs } = await import('./inputs.js');
  const { buildAnchorMessages } = await import('./prompt.js');
  const { callSageStream } = await import('./llm.js');
  const { parseSageResponse } = await import('./intentParser.js');

  const day = dayKey(now);
  if (await getAnchor(env, userId, day)) return;

  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildAnchorMessages(inputs);
  let full = '';
  for await (const chunk of callSageStream(messages, { apiKey: env.ANTHROPIC_API_KEY, model: env.SAGE_MODEL })) {
    if (chunk.type === 'text' && chunk.text) full += chunk.text;
  }
  const parsed = parseSageResponse(full);
  if (parsed.kind === 'ok') {
    await putAnchor(env, userId, day, {
      briefMd: parsed.briefMd,
      intentJson: JSON.stringify(parsed.intent),
      level: inputs.level,
      generatedAt: now,
    });
  }
}
```

- [ ] **Step 3: Wire scheduler into `index.ts`**

```typescript
import { runWakeTimeScan } from './scheduler.js';

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await runWakeTimeScan(env, now, ctx);
  },
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @edgerelay/bias-sage test`
Expected: 26 passed.

- [ ] **Step 5: Commit**

```bash
git add workers/bias-sage
git commit -m "feat(bias-sage): wake-time scheduler with per-user tz window"
```

> **Note for the implementer:** Delta materiality (running every 5 min, scanning bias-engine state changes since last run, and triggering `generateDelta` per affected user) is wired in this same task next.

- [ ] **Step 6: Add delta runner to scheduler**

In `workers/bias-sage/src/scheduler.ts`, add and export `runDeltaScan`:

```typescript
import { computeInputsHash, isMaterialChange } from './materiality.js';
import { generateDelta } from './deltaHandler.js';

export async function runDeltaScan(env: Env, now: number, ctx: ExecutionContext): Promise<void> {
  // 1. Read latest phase per symbol from bias_state.
  const current = (await env.DB.prepare(
    `SELECT symbol, phase FROM bias_state`
  ).all<{ symbol: string; phase: string }>()).results ?? [];
  const currentPhases = Object.fromEntries(current.map((r) => [r.symbol, r.phase]));

  // 2. Read previous phase snapshot from KV for diff.
  const prevRaw = await env.BIAS_SAGE.get('phases:last_scan');
  const previousPhases: Record<string, string> = prevRaw ? JSON.parse(prevRaw) : {};
  await env.BIAS_SAGE.put('phases:last_scan', JSON.stringify(currentPhases));

  // 3. Detect any phase flip on any symbol.
  const flippedSymbols = Object.keys(currentPhases).filter(
    (s) => previousPhases[s] && previousPhases[s] !== currentPhases[s]
  );
  if (flippedSymbols.length === 0) return;

  // 4. Find users whose watchlist intersects flippedSymbols.
  const users = (await env.DB.prepare(
    `SELECT id, watchlist FROM users WHERE last_seen_at > ?`
  ).bind(now - 14 * 86400).all<{ id: string; watchlist: string | null }>()).results ?? [];

  for (const u of users) {
    const watchlist = (u.watchlist ?? 'EURUSD,XAUUSD,NAS100,USDJPY,GBPUSD').split(',').map((s) => s.trim());
    const r = isMaterialChange({
      watchlist,
      previousPhases,
      currentPhases,
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    if (!r.material) continue;
    const hash = computeInputsHash({ phases: currentPhases, openPositions: [], lastBriefId: null });
    ctx.waitUntil(
      (async () => {
        const decision = await generateDelta(env, u.id, r.triggers, hash, now);
        if (decision.generated) {
          await runDeltaGeneration(env, u.id, r.triggers, hash, now);
        }
      })().catch((e) => console.error('delta gen failed', u.id, (e as Error).message))
    );
  }
}

async function runDeltaGeneration(env: Env, userId: string, triggers: string[], inputsHash: string, now: number): Promise<void> {
  const { dayKey, getAnchor } = await import('./cache.js');
  const { buildPromptInputs } = await import('./inputs.js');
  const { buildDeltaMessages } = await import('./deltaPrompt.js');
  const { callSageStream } = await import('./llm.js');
  const { parseSageResponse } = await import('./intentParser.js');

  const day = dayKey(now);
  const anchor = await getAnchor(env, userId, day);
  if (!anchor) return; // no anchor → no delta

  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildDeltaMessages({ ...inputs, anchorBriefMd: anchor.briefMd, triggers });
  let full = '';
  for await (const chunk of callSageStream(messages, { apiKey: env.ANTHROPIC_API_KEY, model: env.SAGE_MODEL, maxTokens: 250 })) {
    if (chunk.type === 'text' && chunk.text) full += chunk.text;
  }
  // Parser uses <brief>; rewrite tag for delta then reuse parser
  const parsed = parseSageResponse(full.replace('<delta>', '<brief>').replace('</delta>', '</brief>'));
  if (parsed.kind !== 'ok') return;

  const countKey = `delta:count:${userId}:${day}`;
  const countRaw = await env.BIAS_SAGE.get(countKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  await env.BIAS_SAGE.put(`delta:${userId}:${day}`, JSON.stringify({
    briefMd: parsed.briefMd,
    intentJson: JSON.stringify(parsed.intent),
    generatedAt: now,
    inputsHash,
  }), { expirationTtl: 24 * 60 * 60 });
  await env.BIAS_SAGE.put(countKey, String(count + 1), { expirationTtl: 36 * 60 * 60 });
}
```

- [ ] **Step 7: Wire `runDeltaScan` into `scheduled` handler**

```typescript
async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await runWakeTimeScan(env, now, ctx);
  await runDeltaScan(env, now, ctx);
},
```

- [ ] **Step 8: Run tests + typecheck**

Run: `pnpm --filter @edgerelay/bias-sage test && pnpm --filter @edgerelay/bias-sage typecheck`
Expected: 26 passed, no type errors.

- [ ] **Step 9: Commit**

```bash
git add workers/bias-sage
git commit -m "feat(bias-sage): delta scheduler scans for materiality every 5min"
```

---

## Task 12: `api-gateway` proxy routes

**Files:**
- Create: `workers/api-gateway/src/routes/biasSage.ts`
- Modify: `workers/api-gateway/src/index.ts` (mount routes, add binding)
- Modify: `workers/api-gateway/wrangler.toml` (service binding to bias-sage)

The api-gateway is the public entry point. It proxies SSE to the `bias-sage` worker via a Service Binding so the auth middleware runs first.

- [ ] **Step 1: Add service binding to api-gateway `wrangler.toml`**

```toml
[[services]]
binding = "BIAS_SAGE_SERVICE"
service = "edgerelay-bias-sage"
```

- [ ] **Step 2: Add binding type to `workers/api-gateway/src/types.ts`**

Find the `Env` interface and add:

```typescript
BIAS_SAGE_SERVICE: Fetcher;
```

- [ ] **Step 3: Write the route module**

`workers/api-gateway/src/routes/biasSage.ts`:

```typescript
import { Hono } from 'hono';
import type { Env } from '../types.js';
import { authRequired } from '../middleware/auth.js';

export const biasSage = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

biasSage.use('*', authRequired);

biasSage.get('/anchor', async (c) => {
  const userId = c.get('userId');
  const url = new URL('https://internal/sage/anchor');
  url.searchParams.set('user_id', userId);
  return c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
});

biasSage.get('/delta', async (c) => {
  const userId = c.get('userId');
  const url = new URL('https://internal/sage/delta');
  url.searchParams.set('user_id', userId);
  return c.env.BIAS_SAGE_SERVICE.fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
});
```

- [ ] **Step 4: Mount in `workers/api-gateway/src/index.ts`**

Locate the section where other routes are mounted (e.g. `app.route('/v1/bias', bias)`) and add:

```typescript
import { biasSage } from './routes/biasSage.js';
// ...
app.route('/v1/bias/sage', biasSage);
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @edgerelay/api-gateway typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add workers/api-gateway
git commit -m "feat(api-gateway): /v1/bias/sage/* proxy routes"
```

---

## Task 13: `useSageBrief` and `useSageDelta` hooks

**Files:**
- Create: `apps/web/src/hooks/useSageBrief.ts`
- Create: `apps/web/src/hooks/useSageDelta.ts`

SSE-consuming hooks. Each opens an `EventSource` on mount (using `fetch`-based SSE because `EventSource` doesn't carry cookies/auth headers properly in some browsers; use the existing `fetchEventSource` pattern if the app already has one — search for it in `apps/web/src/lib/`).

- [ ] **Step 1: Inspect existing fetch/SSE patterns**

Run: `grep -r "EventSource\|fetchEventSource" apps/web/src --include="*.ts*"`
Expected: identify which approach the app uses for streaming. If none exists, use the `fetch` + `ReadableStream` reader pattern below.

- [ ] **Step 2: Implement `useSageBrief.ts`**

```typescript
import { useEffect, useState } from 'react';
import type { SageBriefIntent } from '@edgerelay/shared';
import { useAuthStore } from '@/stores/auth';

export interface SageBriefState {
  briefMd: string;
  intent: SageBriefIntent | null;
  isStreaming: boolean;
  error: string | null;
}

export function useSageBrief(): SageBriefState {
  const token = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<SageBriefState>({
    briefMd: '',
    intent: null,
    isStreaming: true,
    error: null,
  });

  useEffect(() => {
    if (!token) {
      setState({ briefMd: '', intent: null, isStreaming: false, error: 'not_authenticated' });
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/v1/bias/sage/anchor', {
          headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split('\n\n');
          buf = events.pop() ?? '';
          for (const ev of events) {
            const m = /^event:\s*(\w+)\ndata:\s*(.*)$/m.exec(ev);
            if (!m) continue;
            const [, evt, dataStr] = m;
            const data = JSON.parse(dataStr!);
            if (evt === 'text') {
              setState((s) => ({ ...s, briefMd: s.briefMd + data.chunk }));
            } else if (evt === 'intent') {
              setState((s) => ({ ...s, intent: data as SageBriefIntent }));
            } else if (evt === 'done') {
              setState((s) => ({ ...s, isStreaming: false }));
            } else if (evt === 'error' || evt === 'parse_error') {
              setState((s) => ({ ...s, isStreaming: false, error: data.error ?? data.reason }));
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setState((s) => ({ ...s, isStreaming: false, error: (e as Error).message }));
      }
    })();
    return () => ctrl.abort();
  }, [token]);

  return state;
}
```

- [ ] **Step 3: Implement `useSageDelta.ts`** (same shape, different endpoint, accepts a `pollKey` so caller can re-run on materiality push)

```typescript
import { useEffect, useState } from 'react';
import type { SageBriefIntent } from '@edgerelay/shared';
import { useAuthStore } from '@/stores/auth';

export interface SageDeltaState {
  briefMd: string;
  intent: SageBriefIntent | null;
  isStreaming: boolean;
  hasDelta: boolean;
  error: string | null;
}

export function useSageDelta(pollKey: number = 0): SageDeltaState {
  const token = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<SageDeltaState>({
    briefMd: '', intent: null, isStreaming: true, hasDelta: false, error: null,
  });

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/v1/bias/sage/delta', {
          headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
          signal: ctrl.signal,
        });
        if (res.status === 204) {
          setState({ briefMd: '', intent: null, isStreaming: false, hasDelta: false, error: null });
          return;
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        setState((s) => ({ ...s, hasDelta: true }));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split('\n\n');
          buf = events.pop() ?? '';
          for (const ev of events) {
            const m = /^event:\s*(\w+)\ndata:\s*(.*)$/m.exec(ev);
            if (!m) continue;
            const [, evt, dataStr] = m;
            const data = JSON.parse(dataStr!);
            if (evt === 'text') setState((s) => ({ ...s, briefMd: s.briefMd + data.chunk }));
            else if (evt === 'intent') setState((s) => ({ ...s, intent: data as SageBriefIntent }));
            else if (evt === 'done') setState((s) => ({ ...s, isStreaming: false }));
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setState((s) => ({ ...s, isStreaming: false, error: (e as Error).message }));
      }
    })();
    return () => ctrl.abort();
  }, [token, pollKey]);

  return state;
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useSageBrief.ts apps/web/src/hooks/useSageDelta.ts
git commit -m "feat(web): SSE hooks for sage anchor + delta"
```

---

## Task 14: `CoverBand` component

**Files:**
- Create: `apps/web/src/components/bias/sage/CoverBand.tsx`

Top band of the new page: title, date, anchor timestamp, Listen 🔊 (Phase 1: hidden), Ask Sage chip (stub link in Phase 1).

- [ ] **Step 1: Implement**

```tsx
import { Sparkles, MessageCircle } from 'lucide-react';

interface CoverBandProps {
  generatedAt: number | null;
  userName: string | null;
}

export function CoverBand({ generatedAt, userName }: CoverBandProps) {
  const date = new Date();
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
  const stamp = generatedAt
    ? new Date(generatedAt * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  return (
    <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-neon-purple" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">Your ICC Brief</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100">
            {userName ? `Morning, ${userName}` : 'Good Morning'}
          </h1>
          <p className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
            {dateStr}{stamp ? ` · anchor ${stamp}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Audio briefings — coming in Phase 1.5"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/20 bg-neon-purple/5 px-3 py-1.5 text-[11px] font-semibold text-neon-purple opacity-50 cursor-not-allowed"
          >
            🔊 Listen
          </button>
          <a
            href="#ask-sage"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/30 bg-neon-purple/10 px-3 py-1.5 text-[11px] font-semibold text-neon-purple hover:bg-neon-purple/15 transition-colors"
          >
            <MessageCircle size={11} />
            Ask Sage
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/bias/sage/CoverBand.tsx
git commit -m "feat(web): CoverBand for /bias goldmine"
```

---

## Task 15: `AnchorBriefBand` component (with markdown render)

**Files:**
- Create: `apps/web/src/components/bias/sage/AnchorBriefBand.tsx`

Renders the streamed markdown brief in Mentor voice. Uses a minimal markdown renderer (just bold, italic, paragraphs) to avoid pulling in a heavy dependency. The streaming "typing" feel comes from the hook continuously appending — the component just renders.

- [ ] **Step 1: Implement**

```tsx
import { Sparkles } from 'lucide-react';

interface AnchorBriefBandProps {
  briefMd: string;
  isStreaming: boolean;
  level: 'L1' | 'L2' | null;
  error: string | null;
}

export function AnchorBriefBand({ briefMd, isStreaming, level, error }: AnchorBriefBandProps) {
  if (error) {
    return (
      <section className="rounded-2xl border border-neon-red/20 bg-neon-red/[0.04] p-5 animate-fade-in-up">
        <p className="text-[12px] text-neon-red font-semibold">Sage is unavailable</p>
        <p className="text-[11px] text-slate-400 mt-1">{error}</p>
      </section>
    );
  }
  if (!briefMd) {
    return (
      <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-neon-purple animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">Sage is thinking…</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-700/50 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-slate-700/50 rounded w-full animate-pulse" />
          <div className="h-3 bg-slate-700/50 rounded w-5/6 animate-pulse" />
        </div>
      </section>
    );
  }
  return (
    <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-neon-purple" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">Anchor Brief</span>
        </div>
        {level === 'L1' && (
          <span className="text-[10px] text-slate-500" title="Connect MT5 and journal trades to unlock journal-aware briefings">
            L1 · context only
          </span>
        )}
      </div>
      <div
        className="prose-sage text-slate-100 text-[13px] leading-[1.7]"
        dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(briefMd) }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-neon-purple animate-pulse align-text-bottom ml-1" />
      )}
    </section>
  );
}

// Minimal renderer: paragraphs (\n\n), **bold**, *italic*. No links, no images.
// Inputs are LLM-generated and we trust the system prompt to constrain output.
function renderInlineMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return md
    .split(/\n\n+/)
    .map((para) =>
      `<p class="mb-3 last:mb-0">${
        escape(para)
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-50">$1</strong>')
          .replace(/(^|[\s(])\*(.+?)\*([\s).,!?]|$)/g, '$1<em class="text-neon-purple">$2</em>$3')
          .replace(/\n/g, '<br>')
      }</p>`
    )
    .join('');
}
```

- [ ] **Step 2: Add scoped styles for `prose-sage`** (in `apps/web/src/app.css`, append):

```css
.prose-sage strong { font-weight: 700; }
.prose-sage em { font-style: italic; }
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter web typecheck
git add apps/web/src/components/bias/sage/AnchorBriefBand.tsx apps/web/src/app.css
git commit -m "feat(web): AnchorBriefBand with streaming markdown render"
```

---

## Task 16: `DeltaBlockBand` component

**Files:**
- Create: `apps/web/src/components/bias/sage/DeltaBlockBand.tsx`

Renders only when the delta hook reports `hasDelta === true`. Same minimal markdown render as anchor.

- [ ] **Step 1: Implement**

```tsx
import { RefreshCw } from 'lucide-react';

interface DeltaBlockBandProps {
  briefMd: string;
  hasDelta: boolean;
  isStreaming: boolean;
}

export function DeltaBlockBand({ briefMd, hasDelta, isStreaming }: DeltaBlockBandProps) {
  if (!hasDelta) return null;
  return (
    <section
      className="rounded-2xl border-l-2 p-5 animate-fade-in-up"
      style={{ borderLeftColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.04)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw size={12} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400 font-bold">
          Since you last looked
        </span>
      </div>
      <div
        className="prose-sage text-slate-100 text-[13px] leading-[1.65]"
        dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(briefMd) }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse align-text-bottom ml-1" />
      )}
    </section>
  );
}

function renderInlineMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return md
    .split(/\n\n+/)
    .map((para) =>
      `<p class="mb-2 last:mb-0">${
        escape(para)
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-50">$1</strong>')
          .replace(/(^|[\s(])\*(.+?)\*([\s).,!?]|$)/g, '$1<em class="text-emerald-400">$2</em>$3')
          .replace(/\n/g, '<br>')
      }</p>`
    )
    .join('');
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter web typecheck
git add apps/web/src/components/bias/sage/DeltaBlockBand.tsx
git commit -m "feat(web): DeltaBlockBand with conditional render"
```

---

## Task 17: `BiasEnginePage` rewrite (behind `bias_v2` flag)

**Files:**
- Modify: `apps/web/src/pages/BiasEnginePage.tsx`
- Create: `apps/web/src/pages/BiasEnginePageV2.tsx`
- Modify: `apps/web/src/lib/featureFlags.ts` (or wherever flags live — search first)

Phase 1 ships behind a `bias_v2` flag. When the flag is on, render the new page; otherwise render the existing page.

- [ ] **Step 1: Find the existing flag mechanism**

Run: `grep -rn "feature_flag\|featureFlag\|FEATURE_FLAG" apps/web/src --include="*.ts*" | head -30`

If no flag system exists, create the simplest possible one:

`apps/web/src/lib/featureFlags.ts`:

```typescript
import { useAuthStore } from '@/stores/auth';

const ADMIN_USER_IDS = new Set([
  // From memory: 3 admin/test accounts
  'oh84dev',
]);

export function useFeatureFlag(name: string): boolean {
  const userId = useAuthStore((s) => s.user?.id);
  if (!userId) return false;
  if (name === 'bias_v2') {
    // Phase 1 rollout: admin accounts only.
    return ADMIN_USER_IDS.has(userId);
  }
  return false;
}
```

If a flag system already exists, use it instead and skip creating this file.

- [ ] **Step 2: Create `BiasEnginePageV2.tsx`**

```tsx
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { useBiasData } from '@/hooks/useBiasData';
import { useMarketBiasStore } from '@/stores/marketBias';
import { useBiasAccuracyStore } from '@/stores/biasAccuracy';
import { useSageBrief } from '@/hooks/useSageBrief';
import { useSageDelta } from '@/hooks/useSageDelta';
import { useAuthStore } from '@/stores/auth';
import { AssetBiasCard } from '@/components/bias/AssetBiasCard';
import { ICCConfluencePanel } from '@/components/bias/ICCConfluencePanel';
import { CoverBand } from '@/components/bias/sage/CoverBand';
import { AnchorBriefBand } from '@/components/bias/sage/AnchorBriefBand';
import { DeltaBlockBand } from '@/components/bias/sage/DeltaBlockBand';

export function BiasEnginePageV2() {
  const { data, isLoading } = useBiasData();
  const [params, setParams] = useSearchParams();
  const selectedSymbol = useMarketBiasStore((s) => s.selectedSymbol);
  const setSelected    = useMarketBiasStore((s) => s.setSelected);
  const accuracyData   = useBiasAccuracyStore((s) => s.data);
  const fetchAccuracy  = useBiasAccuracyStore((s) => s.fetchAccuracy);
  const userName       = useAuthStore((s) => s.user?.name ?? null);

  const brief = useSageBrief();
  const delta = useSageDelta();

  useEffect(() => { fetchAccuracy(); }, [fetchAccuracy]);

  useEffect(() => {
    const urlSymbol = params.get('symbol');
    if (urlSymbol && urlSymbol !== selectedSymbol) setSelected(urlSymbol.toUpperCase());
  }, [params, selectedSymbol, setSelected]);

  const handleSelect = (symbol: string) => {
    const next = selectedSymbol === symbol ? null : symbol;
    setSelected(next);
    if (next) setParams({ symbol: next });
    else setParams({});
  };

  const selected = useMemo(() => {
    if (!data || !selectedSymbol) return null;
    return data.assets.find((a) => a.symbol === selectedSymbol) ?? null;
  }, [data, selectedSymbol]);

  // Use intent.hero_symbol to mark the star pick on AssetBiasCard
  const heroSymbol = brief.intent?.hero_symbol ?? null;

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <BackBreadcrumb trail={[{ label: 'Market Bias Engine' }]} />

        {/* 1. Cover */}
        <CoverBand generatedAt={null} userName={userName} />

        {/* 2. Anchor brief */}
        <AnchorBriefBand
          briefMd={brief.briefMd}
          isStreaming={brief.isStreaming}
          level={null}
          error={brief.error}
        />

        {/* 3. Delta */}
        <DeltaBlockBand
          briefMd={delta.briefMd}
          hasDelta={delta.hasDelta}
          isStreaming={delta.isStreaming}
        />

        {/* 5. Asset constellation (existing 5-card grid, preserved) */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Tracked Assets · 4H
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
          </div>
          {isLoading && (!data || data.assets.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-premium rounded-2xl h-[200px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {data?.assets.map((asset, i) => (
                <AssetBiasCard
                  key={asset.symbol}
                  asset={asset}
                  selected={selectedSymbol === asset.symbol}
                  onSelect={handleSelect}
                  accuracy={accuracyData?.[asset.symbol]}
                  delay={i * 60}
                  // Phase 2 will add a star marker via a new prop. For Phase 1 this is informational.
                  data-hero={asset.symbol === heroSymbol ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* 6. Detail panel (existing) */}
        {selected && (
          <ICCConfluencePanel asset={selected} accuracy={accuracyData?.[selected.symbol]} />
        )}

        {/* 8. Methodology footer (preserved from old page) */}
        <section className="glass-premium rounded-2xl p-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3">
            How this engine works
          </h3>
          <p className="text-[11px] text-terminal-muted leading-relaxed">
            4H directional bias using the Indication · Correction · Continuation method. For educational purposes only.
            Not financial advice. Past performance does not indicate future results.
          </p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire flag in `BiasEnginePage.tsx`**

At the top of the existing `BiasEnginePage`, add:

```typescript
import { useFeatureFlag } from '@/lib/featureFlags';
import { BiasEnginePageV2 } from './BiasEnginePageV2';

export function BiasEnginePage() {
  const v2 = useFeatureFlag('bias_v2');
  if (v2) return <BiasEnginePageV2 />;
  // ... existing implementation unchanged
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter web dev`

Open the browser to `/bias` while signed in as the admin test account. Expected:
- Cover band renders with "Morning, {name}" + date
- Anchor brief streams in (typing effect)
- If user has < 3 trades on any watchlist asset → L1 brief invites journaling
- If user has materiality event → delta block renders below anchor
- Asset grid still works underneath (selection toggles ICC panel)

For non-admin accounts, the old page should render unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/BiasEnginePageV2.tsx apps/web/src/pages/BiasEnginePage.tsx apps/web/src/lib/featureFlags.ts
git commit -m "feat(web): BiasEnginePageV2 behind bias_v2 flag"
```

---

## Task 18: Sage eval suite

**Files:**
- Create: `evals/sage/cases.json`
- Create: `evals/sage/runner.ts`
- Create: `evals/sage/package.json`

30 hand-crafted test cases scoring each generation on the spec's criteria. Runs against a real Anthropic key. Pass threshold 90%. This is gating for rollout, not for every PR (PR runs hit a smaller smoke-test subset).

- [ ] **Step 1: Scaffold eval package**

`evals/sage/package.json`:

```json
{
  "name": "@edgerelay/eval-sage",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "eval": "tsx runner.ts",
    "eval:smoke": "tsx runner.ts --subset smoke"
  },
  "dependencies": {
    "@edgerelay/shared": "workspace:*",
    "@edgerelay/bias-sage": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Write `cases.json` with 5 starter cases**

(The full 30 are written iteratively as the prompt is tuned. Land 5 representative cases now.)

```json
[
  {
    "id": "L2-bull-clean",
    "subset": "smoke",
    "inputs": {
      "level": "L2",
      "user": { "name": "Oz", "timezone": "UTC", "watchlist": ["EURUSD","NAS100"] },
      "userStats": [
        { "symbol":"EURUSD", "icc_phase":"BULL_INDICATION", "n_trades":7, "n_wins":5, "total_r":8.4, "last_trade_at":1714000000 }
      ],
      "bias": [
        { "symbol":"EURUSD", "bias":"BULLISH", "score":72, "phase":"BULL_INDICATION", "retrace_pct":48, "session":"london" },
        { "symbol":"NAS100", "bias":"BEARISH", "score":-55, "phase":"BEAR_FLIP", "retrace_pct":null, "session":"london" }
      ],
      "yesterdayAccuracy": [],
      "priorAnchorMd": null
    },
    "expected": {
      "must_contain_substring": ["7 EURUSD", "5"],
      "must_not_contain": ["financial advice", "guaranteed", "risk-free"],
      "exactly_one_socratic_question": true,
      "max_paragraphs": 3,
      "intent_must_have": { "hero_symbol": "EURUSD", "greenlit_symbols": ["EURUSD"] }
    }
  },
  {
    "id": "L1-empty-stats",
    "subset": "smoke",
    "inputs": {
      "level": "L1",
      "user": { "name": "Oz", "timezone": "UTC", "watchlist": ["EURUSD"] },
      "userStats": [],
      "bias": [{ "symbol":"EURUSD", "bias":"BULLISH", "score":72, "phase":"BULL_INDICATION", "retrace_pct":48, "session":"london" }],
      "yesterdayAccuracy": [],
      "priorAnchorMd": null
    },
    "expected": {
      "must_contain_substring": ["journal"],
      "must_not_contain": ["financial advice"],
      "exactly_one_socratic_question": true,
      "max_paragraphs": 3
    }
  },
  {
    "id": "all-bearish-board",
    "subset": "smoke",
    "inputs": {
      "level": "L2",
      "user": { "name": "Oz", "timezone": "UTC", "watchlist": ["EURUSD","NAS100","XAUUSD"] },
      "userStats": [
        { "symbol":"EURUSD", "icc_phase":"BEAR_FLIP", "n_trades":4, "n_wins":1, "total_r":-1.2, "last_trade_at":1714000000 }
      ],
      "bias": [
        { "symbol":"EURUSD", "bias":"BEARISH", "score":-60, "phase":"BEAR_FLIP", "retrace_pct":null, "session":"london" },
        { "symbol":"NAS100", "bias":"BEARISH", "score":-50, "phase":"BEAR_FLIP", "retrace_pct":null, "session":"london" },
        { "symbol":"XAUUSD", "bias":"BEARISH", "score":-45, "phase":"BEAR_FLIP", "retrace_pct":null, "session":"london" }
      ],
      "yesterdayAccuracy": [],
      "priorAnchorMd": null
    },
    "expected": {
      "must_not_contain": ["financial advice"],
      "exactly_one_socratic_question": true,
      "max_paragraphs": 3
    }
  },
  {
    "id": "neutral-no-edge",
    "subset": "smoke",
    "inputs": {
      "level": "L2",
      "user": { "name": "Oz", "timezone": "UTC", "watchlist": ["EURUSD"] },
      "userStats": [
        { "symbol":"EURUSD", "icc_phase":"NEUTRAL", "n_trades":5, "n_wins":2, "total_r":-0.5, "last_trade_at":1714000000 }
      ],
      "bias": [{ "symbol":"EURUSD", "bias":"NEUTRAL", "score":0, "phase":"NEUTRAL", "retrace_pct":null, "session":"asian" }],
      "yesterdayAccuracy": [],
      "priorAnchorMd": null
    },
    "expected": {
      "must_not_contain": ["financial advice"],
      "exactly_one_socratic_question": true,
      "intent_must_have": { "greenlit_symbols": [] }
    }
  },
  {
    "id": "with-prior-anchor",
    "subset": "smoke",
    "inputs": {
      "level": "L2",
      "user": { "name": "Oz", "timezone": "UTC", "watchlist": ["EURUSD"] },
      "userStats": [
        { "symbol":"EURUSD", "icc_phase":"BULL_CONTINUATION", "n_trades":4, "n_wins":3, "total_r":4.0, "last_trade_at":1714000000 }
      ],
      "bias": [{ "symbol":"EURUSD", "bias":"BULLISH", "score":68, "phase":"BULL_CONTINUATION", "retrace_pct":null, "session":"new_york" }],
      "yesterdayAccuracy": [{ "symbol":"EURUSD", "hit": true }],
      "priorAnchorMd": "Yesterday I told you EUR was the cleanest setup. Sticking with it today."
    },
    "expected": {
      "must_not_contain": ["financial advice"],
      "exactly_one_socratic_question": true,
      "max_paragraphs": 3
    }
  }
]
```

- [ ] **Step 3: Write the runner**

`evals/sage/runner.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { buildAnchorMessages } from '@edgerelay/bias-sage/src/prompt.js';
import { parseSageResponse } from '@edgerelay/bias-sage/src/intentParser.js';
import { callSageStream } from '@edgerelay/bias-sage/src/llm.js';
import type { PromptInputs } from '@edgerelay/bias-sage/src/inputs.js';

interface Case {
  id: string;
  subset: string;
  inputs: Omit<PromptInputs, 'generatedAt'>;
  expected: {
    must_contain_substring?: string[];
    must_not_contain?: string[];
    exactly_one_socratic_question?: boolean;
    max_paragraphs?: number;
    intent_must_have?: { hero_symbol?: string | null; greenlit_symbols?: string[] };
  };
}

async function main() {
  const args = process.argv.slice(2);
  const subset = args[args.indexOf('--subset') + 1];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY required'); process.exit(2); }

  const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf-8')) as Case[];
  const filtered = subset ? cases.filter((c) => c.subset === subset) : cases;
  console.log(`Running ${filtered.length} cases…\n`);

  let pass = 0;
  for (const c of filtered) {
    const inputs: PromptInputs = { ...c.inputs, generatedAt: 1714636800 };
    const messages = buildAnchorMessages(inputs);
    let full = '';
    for await (const chunk of callSageStream(messages, { apiKey, model: 'claude-sonnet-4-6' })) {
      if (chunk.type === 'text' && chunk.text) full += chunk.text;
    }
    const result = score(c, full);
    console.log(`${result.pass ? '✓' : '✗'} ${c.id}`);
    if (!result.pass) console.log(`  failures: ${result.failures.join(', ')}`);
    if (result.pass) pass++;
  }
  const rate = pass / filtered.length;
  console.log(`\n${pass}/${filtered.length} passed (${(rate * 100).toFixed(1)}%)`);
  process.exit(rate >= 0.9 ? 0 : 1);
}

function score(c: Case, raw: string): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const parsed = parseSageResponse(raw);
  if (parsed.kind !== 'ok') {
    return { pass: false, failures: [`parse_error: ${parsed.reason}`] };
  }
  const md = parsed.briefMd;
  for (const sub of c.expected.must_contain_substring ?? []) {
    if (!md.includes(sub)) failures.push(`missing "${sub}"`);
  }
  for (const sub of c.expected.must_not_contain ?? []) {
    if (md.toLowerCase().includes(sub.toLowerCase())) failures.push(`contains forbidden "${sub}"`);
  }
  if (c.expected.exactly_one_socratic_question) {
    const qcount = (md.match(/\?/g) ?? []).length;
    if (qcount !== 1) failures.push(`expected 1 question, got ${qcount}`);
  }
  if (c.expected.max_paragraphs) {
    const paras = md.split(/\n\n+/).filter((p) => p.trim()).length;
    if (paras > c.expected.max_paragraphs) failures.push(`${paras} paragraphs, max ${c.expected.max_paragraphs}`);
  }
  if (c.expected.intent_must_have?.hero_symbol !== undefined) {
    if (parsed.intent.hero_symbol !== c.expected.intent_must_have.hero_symbol) {
      failures.push(`hero_symbol expected ${c.expected.intent_must_have.hero_symbol}, got ${parsed.intent.hero_symbol}`);
    }
  }
  if (c.expected.intent_must_have?.greenlit_symbols) {
    const got = parsed.intent.greenlit.map((g) => g.symbol).sort();
    const want = [...c.expected.intent_must_have.greenlit_symbols].sort();
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      failures.push(`greenlit expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Add `tsx` to devDeps and install**

Run: `pnpm install`
Expected: tsx resolves.

- [ ] **Step 5: Run smoke subset**

Run: `ANTHROPIC_API_KEY=$YOUR_KEY pnpm --filter @edgerelay/eval-sage eval:smoke`
Expected: 5/5 passed (or close — the prompt may need iteration).

- [ ] **Step 6: Commit**

```bash
git add evals/sage
git commit -m "feat(eval-sage): 5 smoke cases + scoring runner"
```

> **Implementer note:** Expand to 30 cases as the prompt is tuned, prioritizing edge cases the smoke runs miss (mixed regime, journal-recent-loss, weekend, news-event clash, low-N watchlist, etc.). Promote 5 of the 30 to `subset:"smoke"` so PR runs stay fast.

---

## Task 19: Deploy + verify

**Files:** none (operational task)

- [ ] **Step 1: Set Anthropic secret**

Run: `pnpm --filter @edgerelay/bias-sage exec wrangler secret put ANTHROPIC_API_KEY`
Provide the API key when prompted.

- [ ] **Step 2: Deploy bias-sage**

Run: `pnpm --filter @edgerelay/bias-sage deploy`
Expected: `https://edgerelay-bias-sage.<your-subdomain>.workers.dev` reported.

- [ ] **Step 3: Apply migration to remote D1**

Run: `pnpm exec wrangler d1 migrations apply edgerelay-db --remote`
Expected: migration `0023_bias_goldmine.sql` applied.

- [ ] **Step 4: Deploy api-gateway**

Run: `pnpm --filter @edgerelay/api-gateway deploy`

- [ ] **Step 5: Deploy journal-sync**

Run: `pnpm --filter @edgerelay/journal-sync deploy`

- [ ] **Step 6: Build and deploy web**

Run: `pnpm --filter web build && pnpm --filter web deploy` (or whatever the existing deploy command is — check `apps/web/package.json` for the script).

- [ ] **Step 7: End-to-end smoke**

Sign in as the admin test account at `https://trademetricspro.com/bias`. Verify:
- New page renders (Cover + Anchor + asset grid + footer)
- Anchor brief streams in within 3-5 seconds
- Brief mentions journaled stats if any exist (else L1 invitation)
- Asset grid + ICC confluence panel still work
- For non-admin accounts, the old page renders unchanged

If any verification fails, note the symptom and roll back the flag (set `useFeatureFlag('bias_v2')` to return `false` for all users) before debugging.

- [ ] **Step 8: Commit deploy notes if any docs changed**

(No commit needed if no files changed; if you updated `wrangler.toml` IDs or env vars, commit those.)

---

## Self-review

Run this after writing the plan:

**Spec coverage** — every Section in the spec maps to at least one task:
- §1 Goal — implicit, covered by all tasks
- §2 Decisions Locked — recap only, no implementation needed
- §3 Page Anatomy — Tasks 14, 15, 16, 17 (Cover, Anchor, Delta, page composition); Pulse/Crowd/Plans bands explicitly deferred to Phase 2
- §4 System Architecture — Tasks 3, 4, 12 (bias-sage scaffold, journal-sync extension, api-gateway routes); crowd-fetcher deferred
- §5 Sage L2 Brief Generation — Tasks 5, 6, 7, 8, 11 (inputs, prompt, LLM, anchor handler, scheduler); audio explicitly deferred to Phase 1.5
- §6 Crowd Hybrid Pipeline — deferred to Phase 2
- §7 Pulse Strip — deferred to Phase 2
- §8 Execute Pathway — deferred to Phase 2
- §9 Data Model — Task 1 (migration); only Phase 1 tables in this migration
- §10 Cache Layout — Task 8 (KV helpers)
- §11 Materiality — Tasks 9, 11
- §12 Phasing — this plan IS Phase 1
- §13 Fallbacks — Task 17 manual verification covers; production fallback wiring lives in handler error paths (Task 8 anchor handler, Task 13 hooks)
- §14 Testing — Task 18 (eval suite); unit tests scattered in Tasks 4, 5, 6, 7, 8, 9, 11
- §15 Success Metrics — instrumentation deferred (no analytics tasks in Phase 1; will add in Phase 2 with Crowd's analytics work)
- §16 Out of Scope — respected
- §17 Open Questions — flagged in spec; no tasks needed

**Placeholder scan** — searched for "TBD", "TODO", "appropriate error handling", "implement later", "fill in details". One TODO comment is intentionally left in Task 4 Step 5 with explicit instructions to resolve before moving on. No other placeholders.

**Type consistency** — `SageBriefIntent` (Task 2) is used in Tasks 7, 8, 13, 17. `UserBiasStat` is used in Tasks 2, 5, 6, 18. `PromptInputs` (Task 5) is used in Tasks 6, 18. `Env` shape is consistent across `bias-sage` worker. `CachedAnchor` (Task 8) and `CachedDelta` (Task 10) live in their handler modules. No type drift.

**Materiality regen for delta** — initially the delta handler in Task 10 returned `{ generated: true }` without actually generating. Task 11 Step 6 adds `runDeltaGeneration` which performs the actual LLM call when materiality fires. Verified the chain.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-bias-goldmine-phase-1.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan because the tasks have clear contracts and TDD discipline; subagents can execute each in isolation without context bloat.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

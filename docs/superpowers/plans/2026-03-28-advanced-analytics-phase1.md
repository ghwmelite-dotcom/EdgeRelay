# Advanced Analytics Phase 1: Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 analytics API endpoints — Performance Attribution, Equity Curve Health, Edge Validation, and AI-powered Trade Insights — all computing from existing journal_trades data, with Workers AI integration for personalized insights.

**Architecture:** New analytics route file in api-gateway with 4 GET endpoints. Attribution/equity/edge are pure SQL + TypeScript math. AI insights uses Cloudflare Workers AI binding (Llama 3.3 70B) with 24h caching in a new ai_insights_cache table. Fallback template insights when AI is unavailable.

**Tech Stack:** Cloudflare Workers (Hono), D1 SQLite, Workers AI, TypeScript

**Spec Reference:** `docs/superpowers/specs/2026-03-28-advanced-analytics-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|----------------|
| `migrations/0015_ai_insights_cache.sql` | Creates ai_insights_cache table |
| `workers/api-gateway/src/routes/analytics.ts` | All 4 analytics endpoints |

### Modified Files
| File | Change |
|------|--------|
| `workers/api-gateway/src/index.ts` | Mount analytics routes |
| `workers/api-gateway/src/types.ts` | Add AI binding to Env type |
| `workers/api-gateway/wrangler.toml` | Add [ai] binding |

---

### Task 1: Database Migration + Worker Config

**Files:**
- Create: `migrations/0015_ai_insights_cache.sql`
- Modify: `workers/api-gateway/wrangler.toml`
- Modify: `workers/api-gateway/src/types.ts`

- [ ] **Step 1: Create migration**

```sql
-- AI Insights Cache

CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  insights_json TEXT NOT NULL,
  stats_hash TEXT NOT NULL,
  computed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights_cache(user_id);
```

- [ ] **Step 2: Add AI binding to wrangler.toml**

Read `workers/api-gateway/wrangler.toml` and add at the end:

```toml
[ai]
binding = "AI"
```

- [ ] **Step 3: Add AI to Env type**

Read `workers/api-gateway/src/types.ts` and add `AI: Ai;` to the Env interface. The `Ai` type comes from `@cloudflare/workers-types`.

- [ ] **Step 4: Commit**

```bash
git add migrations/0015_ai_insights_cache.sql workers/api-gateway/wrangler.toml workers/api-gateway/src/types.ts
git commit -m "feat(db): add ai_insights_cache table and Workers AI binding"
```

---

### Task 2: Analytics Route — Performance Attribution

**Files:**
- Create: `workers/api-gateway/src/routes/analytics.ts`
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Create analytics route file with attribution endpoint**

Read these files first for patterns:
- `workers/api-gateway/src/routes/marketplace.ts` — route structure
- `workers/api-gateway/src/index.ts` — how routes are mounted
- `migrations/0006_journal_trades.sql` — journal_trades schema (columns: account_id, symbol, direction, deal_entry, volume, price, profit, pips, duration_seconds, session_tag, close_time, balance_at_trade)

Create `workers/api-gateway/src/routes/analytics.ts`:

```typescript
import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const analytics = new Hono<{ Bindings: Env }>();

// ── Helper: get all user's account IDs ──────────────────────────

async function getUserAccountIds(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT id FROM accounts WHERE user_id = ? AND is_active = true')
    .bind(userId)
    .all<{ id: string }>();
  return results?.map((r) => r.id) ?? [];
}

// ── Helper: build IN clause for account IDs ─────────────────────

function inClause(ids: string[]): { placeholders: string; values: string[] } {
  return {
    placeholders: ids.map(() => '?').join(','),
    values: ids,
  };
}

// Day number to name mapping
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── GET /analytics/attribution ──────────────────────────────────

analytics.get('/attribution', async (c) => {
  const userId = c.get('userId');
  const accountIds = await getUserAccountIds(c.env.DB, userId);

  if (accountIds.length === 0) {
    return c.json<ApiResponse>({
      data: { by_session: [], by_day: [], by_symbol: [], by_direction: [], hour_heatmap: [], total_trades: 0, total_pnl: 0 },
      error: null,
    });
  }

  const { placeholders, values } = inClause(accountIds);
  const baseWhere = `account_id IN (${placeholders}) AND deal_entry = 'out'`;

  // By session
  const { results: bySession } = await c.env.DB.prepare(
    `SELECT session_tag as session,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY session_tag ORDER BY pnl DESC`,
  ).bind(...values).all();

  // By day of week
  const { results: byDay } = await c.env.DB.prepare(
    `SELECT CAST(strftime('%w', close_time) AS INTEGER) as day_num,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY day_num ORDER BY day_num`,
  ).bind(...values).all();

  // Map day numbers to names
  const byDayNamed = (byDay ?? []).map((d: Record<string, unknown>) => ({
    day: DAY_NAMES[(d.day_num as number) ?? 0],
    day_num: d.day_num,
    trades: d.trades,
    pnl: d.pnl,
    win_rate: d.win_rate,
  }));

  // By symbol
  const { results: bySymbol } = await c.env.DB.prepare(
    `SELECT symbol,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY symbol ORDER BY pnl DESC`,
  ).bind(...values).all();

  // By direction
  const { results: byDirection } = await c.env.DB.prepare(
    `SELECT direction,
            COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY direction`,
  ).bind(...values).all();

  // Hour heatmap
  const { results: heatmap } = await c.env.DB.prepare(
    `SELECT CAST(strftime('%w', close_time) AS INTEGER) as day_num,
            CAST(strftime('%H', close_time) AS INTEGER) as hour,
            COALESCE(SUM(profit), 0) as pnl,
            COUNT(*) as trades
     FROM journal_trades WHERE ${baseWhere}
     GROUP BY day_num, hour`,
  ).bind(...values).all();

  // Totals
  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_trades, COALESCE(SUM(profit), 0) as total_pnl
     FROM journal_trades WHERE ${baseWhere}`,
  ).bind(...values).first<{ total_trades: number; total_pnl: number }>();

  return c.json<ApiResponse>({
    data: {
      by_session: bySession ?? [],
      by_day: byDayNamed,
      by_symbol: bySymbol ?? [],
      by_direction: byDirection ?? [],
      hour_heatmap: heatmap ?? [],
      total_trades: totals?.total_trades ?? 0,
      total_pnl: totals?.total_pnl ?? 0,
    },
    error: null,
  });
});
```

- [ ] **Step 2: Mount route in index.ts**

Add import:
```typescript
import { analytics } from './routes/analytics.js';
```

Mount as protected route:
```typescript
protectedApp.route('/analytics', analytics);
```

- [ ] **Step 3: Typecheck**

Run: `cd workers/api-gateway && pnpm exec tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/routes/analytics.ts workers/api-gateway/src/index.ts
git commit -m "feat(api): add performance attribution endpoint — P&L by session, day, symbol, direction, hour"
```

---

### Task 3: Equity Curve Health Endpoint

**Files:**
- Modify: `workers/api-gateway/src/routes/analytics.ts`

- [ ] **Step 1: Add equity health endpoint**

Append to `analytics.ts`:

```typescript
// ── GET /analytics/equity-health ────────────────────────────────

analytics.get('/equity-health', async (c) => {
  const userId = c.get('userId');
  const accountIds = await getUserAccountIds(c.env.DB, userId);

  if (accountIds.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NO_DATA', message: 'No trading data found' } }, 404);
  }

  const { placeholders, values } = inClause(accountIds);
  const baseWhere = `account_id IN (${placeholders}) AND deal_entry = 'out'`;

  // Get all trades ordered by time for equity curve computation
  const { results: trades } = await c.env.DB.prepare(
    `SELECT profit, balance_at_trade, close_time, DATE(close_time) as trade_date
     FROM journal_trades WHERE ${baseWhere}
     ORDER BY close_time ASC`,
  ).bind(...values).all<{
    profit: number;
    balance_at_trade: number;
    close_time: string;
    trade_date: string;
  }>();

  if (!trades || trades.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NO_DATA', message: 'No closed trades found' } }, 404);
  }

  // Equity curve — daily balance snapshots (last balance per day)
  const dailyBalances: { date: string; balance: number }[] = [];
  let lastDate = '';
  for (const t of trades) {
    if (t.trade_date !== lastDate) {
      if (lastDate) {
        // Push the previous day's last balance
      }
      lastDate = t.trade_date;
    }
    // Always update — last trade of the day wins
    const idx = dailyBalances.findIndex((d) => d.date === t.trade_date);
    if (idx >= 0) {
      dailyBalances[idx].balance = t.balance_at_trade;
    } else {
      dailyBalances.push({ date: t.trade_date, balance: t.balance_at_trade });
    }
  }

  // Basic stats
  const profits = trades.map((t) => t.profit);
  const totalPnl = profits.reduce((a, b) => a + b, 0);
  const wins = profits.filter((p) => p > 0);
  const losses = profits.filter((p) => p < 0);
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const expectancy = trades.length > 0 ? totalPnl / trades.length : 0;
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  // Max drawdown
  let peak = dailyBalances[0]?.balance ?? 0;
  let maxDdAmount = 0;
  let maxDdPct = 0;
  let underwaterStart = 0;
  let maxUnderwaterDays = 0;
  let currentUnderwaterDays = 0;

  for (let i = 0; i < dailyBalances.length; i++) {
    const bal = dailyBalances[i].balance;
    if (bal > peak) {
      peak = bal;
      if (currentUnderwaterDays > maxUnderwaterDays) {
        maxUnderwaterDays = currentUnderwaterDays;
      }
      currentUnderwaterDays = 0;
    } else {
      currentUnderwaterDays++;
      const dd = peak - bal;
      if (dd > maxDdAmount) {
        maxDdAmount = dd;
        maxDdPct = peak > 0 ? (dd / peak) * 100 : 0;
      }
    }
  }
  if (currentUnderwaterDays > maxUnderwaterDays) maxUnderwaterDays = currentUnderwaterDays;

  // Recovery factor
  const recoveryFactor = maxDdAmount > 0 ? totalPnl / maxDdAmount : totalPnl > 0 ? 999 : 0;

  // Total return %
  const startBalance = dailyBalances[0]?.balance ?? 0;
  const endBalance = dailyBalances[dailyBalances.length - 1]?.balance ?? 0;
  const totalReturnPct = startBalance > 0 ? ((endBalance - startBalance) / startBalance) * 100 : 0;

  // Sharpe ratio (daily returns, annualized)
  let sharpeRatio = 0;
  if (dailyBalances.length > 2) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < dailyBalances.length; i++) {
      const prev = dailyBalances[i - 1].balance;
      if (prev > 0) dailyReturns.push((dailyBalances[i].balance - prev) / prev);
    }
    if (dailyReturns.length > 1) {
      const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
      const stddev = Math.sqrt(variance);
      sharpeRatio = stddev > 0 ? (mean / stddev) * Math.sqrt(252) : 0;
    }
  }

  // R² (coefficient of determination) — how linear the equity growth is
  let rSquared = 0;
  if (dailyBalances.length > 2) {
    const n = dailyBalances.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const ys = dailyBalances.map((d) => d.balance);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0, ssTot = 0, ssXY = 0, ssXX = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (xs[i] - xMean) * (ys[i] - yMean);
      ssXX += (xs[i] - xMean) ** 2;
      ssTot += (ys[i] - yMean) ** 2;
    }
    const slope = ssXX > 0 ? ssXY / ssXX : 0;
    const intercept = yMean - slope * xMean;
    for (let i = 0; i < n; i++) {
      const predicted = slope * xs[i] + intercept;
      ssRes += (ys[i] - predicted) ** 2;
    }
    rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }

  // Prop firm compliance (FTMO rules: max 5% daily, max 10% total)
  // Check max daily loss from trade data
  let maxDailyLossPct = 0;
  const dailyPnls = new Map<string, number>();
  for (const t of trades) {
    dailyPnls.set(t.trade_date, (dailyPnls.get(t.trade_date) ?? 0) + t.profit);
  }
  for (const [, dayPnl] of dailyPnls) {
    if (dayPnl < 0 && startBalance > 0) {
      const lossPct = (Math.abs(dayPnl) / startBalance) * 100;
      if (lossPct > maxDailyLossPct) maxDailyLossPct = lossPct;
    }
  }

  const ftmoDailyOk = maxDailyLossPct < 5;
  const ftmoTotalOk = maxDdPct < 10;
  const propScore = Math.max(0, Math.round(100 - maxDdPct * 5));

  return c.json<ApiResponse>({
    data: {
      r_squared: Math.round(rSquared * 100) / 100,
      recovery_factor: Math.round(recoveryFactor * 100) / 100,
      max_drawdown_pct: Math.round(maxDdPct * 100) / 100,
      max_drawdown_amount: Math.round(maxDdAmount * 100) / 100,
      max_underwater_days: maxUnderwaterDays,
      profit_factor: Math.round(profitFactor * 100) / 100,
      sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
      total_return_pct: Math.round(totalReturnPct * 100) / 100,
      avg_win: Math.round(avgWin * 100) / 100,
      avg_loss: Math.round(avgLoss * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      win_rate: Math.round(winRate * 10) / 10,
      total_trades: trades.length,
      prop_compliance: {
        ftmo_daily_ok: ftmoDailyOk,
        ftmo_total_ok: ftmoTotalOk,
        max_daily_loss_pct: Math.round(maxDailyLossPct * 100) / 100,
        max_total_dd_pct: Math.round(maxDdPct * 100) / 100,
        score: propScore,
      },
      equity_curve: dailyBalances,
    },
    error: null,
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/routes/analytics.ts
git commit -m "feat(api): add equity curve health endpoint — R², Sharpe, drawdown, prop compliance"
```

---

### Task 4: Edge Validation Endpoint

**Files:**
- Modify: `workers/api-gateway/src/routes/analytics.ts`

- [ ] **Step 1: Add edge validation endpoint**

Append to `analytics.ts`. This implements t-test, bootstrap confidence intervals, and Monte Carlo drawdown simulation — all in pure TypeScript (no external libs).

```typescript
// ── GET /analytics/edge-validation ──────────────────────────────

analytics.get('/edge-validation', async (c) => {
  const userId = c.get('userId');
  const accountIds = await getUserAccountIds(c.env.DB, userId);

  if (accountIds.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NO_DATA', message: 'No trading data found' } }, 404);
  }

  const { placeholders, values } = inClause(accountIds);

  const { results: trades } = await c.env.DB.prepare(
    `SELECT profit FROM journal_trades
     WHERE account_id IN (${placeholders}) AND deal_entry = 'out'
     ORDER BY close_time ASC`,
  ).bind(...values).all<{ profit: number }>();

  if (!trades || trades.length < 10) {
    return c.json<ApiResponse>({
      data: {
        sample_size: trades?.length ?? 0,
        sample_adequate: false,
        min_recommended: 200,
        verdict: 'OVERFITTED',
        explanation: `Only ${trades?.length ?? 0} trades. Minimum 50 trades needed for any statistical analysis, 200+ recommended.`,
      },
      error: null,
    });
  }

  const profits = trades.map((t) => t.profit);
  const n = profits.length;

  // Mean and standard deviation
  const mean = profits.reduce((a, b) => a + b, 0) / n;
  const variance = profits.reduce((s, p) => s + (p - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  // t-test (H0: mean return = 0)
  const tStat = std > 0 ? (mean / (std / Math.sqrt(n))) : 0;

  // Approximate p-value from t-distribution using normal approximation (good for n > 30)
  const absT = Math.abs(tStat);
  // Standard normal CDF approximation
  const z = absT;
  const pValue = 2 * (1 - (0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)))));

  // Profit factor
  const grossProfit = profits.filter((p) => p > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(profits.filter((p) => p < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  // Bootstrap profit factor confidence interval (1000 resamples)
  const bootstrapPFs: number[] = [];
  for (let i = 0; i < 1000; i++) {
    let bGross = 0, bLoss = 0;
    for (let j = 0; j < n; j++) {
      const sample = profits[Math.floor(Math.random() * n)];
      if (sample > 0) bGross += sample;
      else bLoss += Math.abs(sample);
    }
    bootstrapPFs.push(bLoss > 0 ? bGross / bLoss : bGross > 0 ? 999 : 0);
  }
  bootstrapPFs.sort((a, b) => a - b);
  const pfCiLower = bootstrapPFs[Math.floor(bootstrapPFs.length * 0.025)];
  const pfCiUpper = bootstrapPFs[Math.floor(bootstrapPFs.length * 0.975)];

  // Monte Carlo max drawdown simulation (1000 shuffles)
  const mcDrawdowns: number[] = [];
  for (let i = 0; i < 1000; i++) {
    // Shuffle profits
    const shuffled = [...profits];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    // Compute max drawdown of shuffled sequence
    let cumulative = 0;
    let peak = 0;
    let maxDd = 0;
    for (const p of shuffled) {
      cumulative += p;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDd) maxDd = dd;
    }
    mcDrawdowns.push(maxDd);
  }
  mcDrawdowns.sort((a, b) => a - b);
  const mcMedianDd = mcDrawdowns[Math.floor(mcDrawdowns.length * 0.5)];
  const mcWorst95 = mcDrawdowns[Math.floor(mcDrawdowns.length * 0.95)];

  // Verdict
  const sampleAdequate = n >= 200;
  let verdict: string;
  let explanation: string;

  if (n < 50) {
    verdict = 'OVERFITTED';
    explanation = `Only ${n} trades — too few for reliable statistical analysis. Need at least 50, recommended 200+.`;
  } else if (pValue < 0.05 && pfCiLower > 1.0 && n >= 200) {
    verdict = 'VALIDATED';
    explanation = `Edge is statistically significant (p=${pValue.toFixed(3)}). Profit factor stays above 1.0 at 95% confidence [${pfCiLower.toFixed(2)}-${pfCiUpper.toFixed(2)}]. Sample size (${n}) is adequate.`;
  } else if (pValue < 0.05 && pfCiLower > 1.0 && n >= 100) {
    verdict = 'LIKELY_VALID';
    explanation = `Edge appears real (p=${pValue.toFixed(3)}) but sample size (${n}) is below the recommended 200. Continue trading to strengthen confidence.`;
  } else if (pValue < 0.10 || pfCiLower > 0.9) {
    verdict = 'INCONCLUSIVE';
    explanation = `Results are mixed — p-value is ${pValue.toFixed(3)} and profit factor CI lower bound is ${pfCiLower.toFixed(2)}. More trades needed for a definitive answer.`;
  } else {
    verdict = 'LIKELY_NOISE';
    explanation = `No statistical evidence of an edge. P-value ${pValue.toFixed(3)} suggests returns could be random. Profit factor CI includes values below 1.0.`;
  }

  return c.json<ApiResponse>({
    data: {
      sample_size: n,
      sample_adequate: sampleAdequate,
      min_recommended: 200,
      mean_return: Math.round(mean * 100) / 100,
      std_return: Math.round(std * 100) / 100,
      t_statistic: Math.round(tStat * 100) / 100,
      p_value: Math.round(pValue * 1000) / 1000,
      profit_factor: Math.round(profitFactor * 100) / 100,
      profit_factor_ci_lower: Math.round(pfCiLower * 100) / 100,
      profit_factor_ci_upper: Math.round(pfCiUpper * 100) / 100,
      monte_carlo_median_dd: Math.round(mcMedianDd * 100) / 100,
      monte_carlo_worst_dd_95: Math.round(mcWorst95 * 100) / 100,
      verdict,
      explanation,
    },
    error: null,
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add workers/api-gateway/src/routes/analytics.ts
git commit -m "feat(api): add edge validation endpoint — t-test, bootstrap CI, Monte Carlo drawdown"
```

---

### Task 5: AI Insights Endpoint

**Files:**
- Modify: `workers/api-gateway/src/routes/analytics.ts`

- [ ] **Step 1: Add AI insights endpoint**

Append to `analytics.ts`. This endpoint:
1. Computes a stats hash for cache invalidation
2. Checks cache (ai_insights_cache) — returns cached if hash matches and < 24h old
3. Fetches attribution + equity data via internal function calls (NOT HTTP — reuse the same query logic)
4. Sends pre-computed stats to Workers AI
5. Parses response, caches, returns

Read the existing analytics.ts file first to reuse the `getUserAccountIds` and `inClause` helpers.

The AI call uses `c.env.AI.run()` which is the Workers AI binding. The model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. If it fails, fall back to `@cf/meta/llama-3.1-8b-instruct-fast`. If that also fails, return template insights.

```typescript
// ── GET /analytics/ai-insights ──────────────────────────────────

analytics.get('/ai-insights', async (c) => {
  const userId = c.get('userId');
  const accountIds = await getUserAccountIds(c.env.DB, userId);

  if (accountIds.length === 0) {
    return c.json<ApiResponse>({ data: { insights: [], generated_at: null, cached: false, model: null }, error: null });
  }

  const { placeholders, values } = inClause(accountIds);
  const baseWhere = `account_id IN (${placeholders}) AND deal_entry = 'out'`;

  // Compute stats hash for cache check
  const hashRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(profit), 0) as total, MAX(close_time) as latest
     FROM journal_trades WHERE ${baseWhere}`,
  ).bind(...values).first<{ cnt: number; total: number; latest: string }>();

  const statsHash = `${hashRow?.cnt ?? 0}:${Math.round((hashRow?.total ?? 0) * 100)}:${hashRow?.latest ?? ''}`;

  // Check cache
  const cached = await c.env.DB.prepare(
    "SELECT insights_json, stats_hash, computed_at FROM ai_insights_cache WHERE user_id = ?",
  ).bind(userId).first<{ insights_json: string; stats_hash: string; computed_at: string }>();

  if (cached && cached.stats_hash === statsHash) {
    const cacheAge = Date.now() - new Date(cached.computed_at).getTime();
    if (cacheAge < 24 * 60 * 60 * 1000) {
      return c.json<ApiResponse>({
        data: {
          insights: JSON.parse(cached.insights_json),
          generated_at: cached.computed_at,
          cached: true,
          model: 'cached',
        },
        error: null,
      });
    }
  }

  // Compute quick stats for AI prompt
  const { results: sessionStats } = await c.env.DB.prepare(
    `SELECT session_tag as session, COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere} GROUP BY session_tag`,
  ).bind(...values).all();

  const { results: dayStats } = await c.env.DB.prepare(
    `SELECT CAST(strftime('%w', close_time) AS INTEGER) as day_num, COUNT(*) as trades,
            COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere} GROUP BY day_num`,
  ).bind(...values).all();

  const { results: symbolStats } = await c.env.DB.prepare(
    `SELECT symbol, COUNT(*) as trades, COALESCE(SUM(profit), 0) as pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as win_rate
     FROM journal_trades WHERE ${baseWhere} GROUP BY symbol ORDER BY pnl DESC LIMIT 10`,
  ).bind(...values).all();

  const overallStats = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_trades, COALESCE(SUM(profit), 0) as total_pnl,
            ROUND(SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate,
            ROUND(AVG(CASE WHEN profit > 0 THEN profit END), 2) as avg_win,
            ROUND(AVG(CASE WHEN profit < 0 THEN profit END), 2) as avg_loss
     FROM journal_trades WHERE ${baseWhere}`,
  ).bind(...values).first();

  const statsPayload = {
    overall: overallStats,
    by_session: sessionStats,
    by_day: (dayStats ?? []).map((d: Record<string, unknown>) => ({
      day: DAY_NAMES[(d.day_num as number) ?? 0],
      ...d,
    })),
    by_symbol: symbolStats,
  };

  const systemPrompt = `You are an elite forex trading analyst reviewing a trader's performance data. Analyze the data and return ONLY a valid JSON array of 3-5 actionable insights. No markdown, no explanation outside the JSON. Each insight object must have exactly these fields:
- "severity": one of "critical", "warning", "info", "positive"
- "title": short headline (max 60 chars)
- "detail": 2-3 sentences with specific numbers from the data
- "recommendation": one actionable sentence

Focus on: sessions/days/symbols losing money, edge strength, risk issues, patterns suggesting improvements, and what's working well. Be specific with numbers. Every insight must reference actual data provided.`;

  const userPrompt = `Analyze this trader's performance data:\n\n${JSON.stringify(statsPayload, null, 2)}`;

  let insights: unknown[] = [];
  let modelUsed = '';

  // Try 70B first, fall back to 8B
  for (const model of [
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.1-8b-instruct-fast',
  ]) {
    try {
      const aiResponse = await c.env.AI.run(model as Parameters<typeof c.env.AI.run>[0], {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
      });

      const text = typeof aiResponse === 'string' ? aiResponse : (aiResponse as { response?: string }).response ?? '';

      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
        modelUsed = model;
        break;
      }
    } catch {
      // Try next model
      continue;
    }
  }

  // Fallback: template insights if AI failed
  if (insights.length === 0) {
    modelUsed = 'template-fallback';
    insights = generateFallbackInsights(statsPayload);
  }

  // Cache result
  const insightsJson = JSON.stringify(insights);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO ai_insights_cache (user_id, insights_json, stats_hash, computed_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET insights_json = excluded.insights_json, stats_hash = excluded.stats_hash, computed_at = excluded.computed_at`,
  ).bind(userId, insightsJson, statsHash, now).run();

  return c.json<ApiResponse>({
    data: {
      insights,
      generated_at: now,
      cached: false,
      model: modelUsed,
    },
    error: null,
  });
});

// ── Fallback insights when AI is unavailable ────────────────────

function generateFallbackInsights(stats: {
  overall: Record<string, unknown> | null;
  by_session: Record<string, unknown>[] | null;
  by_day: Record<string, unknown>[] | null;
  by_symbol: Record<string, unknown>[] | null;
}): unknown[] {
  const insights: unknown[] = [];

  // Check for losing sessions
  for (const s of stats.by_session ?? []) {
    if ((s.pnl as number) < 0 && (s.trades as number) >= 5) {
      insights.push({
        severity: 'warning',
        title: `${String(s.session).charAt(0).toUpperCase() + String(s.session).slice(1)} session is losing money`,
        detail: `Your ${s.session} session trades show ${s.pnl} P&L with ${s.win_rate}% win rate across ${s.trades} trades.`,
        recommendation: `Review your ${s.session} session strategy or consider reducing position size during these hours.`,
      });
    }
  }

  // Check for losing days
  for (const d of stats.by_day ?? []) {
    if ((d.pnl as number) < 0 && (d.trades as number) >= 3) {
      insights.push({
        severity: 'info',
        title: `${d.day} trades tend to lose money`,
        detail: `Your ${d.day} trades show ${d.pnl} P&L with ${d.win_rate}% win rate across ${d.trades} trades.`,
        recommendation: `Consider reducing activity on ${d.day}s or tightening entry criteria.`,
      });
    }
  }

  // Best performing symbol
  const bestSymbol = (stats.by_symbol ?? []).sort((a, b) => (b.pnl as number) - (a.pnl as number))[0];
  if (bestSymbol && (bestSymbol.pnl as number) > 0) {
    insights.push({
      severity: 'positive',
      title: `${bestSymbol.symbol} is your strongest instrument`,
      detail: `${bestSymbol.symbol} shows +${bestSymbol.pnl} P&L with ${bestSymbol.win_rate}% win rate across ${bestSymbol.trades} trades.`,
      recommendation: `Consider focusing more of your trading activity on ${bestSymbol.symbol}.`,
    });
  }

  // Overall win rate
  const overall = stats.overall;
  if (overall && (overall.win_rate as number) > 55) {
    insights.push({
      severity: 'positive',
      title: 'Solid overall win rate',
      detail: `Your overall win rate is ${overall.win_rate}% across ${overall.total_trades} trades with total P&L of ${overall.total_pnl}.`,
      recommendation: 'Focus on maintaining consistency and managing risk to protect your edge.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: 'info',
      title: 'Keep trading to unlock insights',
      detail: 'More trading data is needed to generate meaningful insights. The AI analyzes patterns across sessions, days, and instruments.',
      recommendation: 'Continue trading and check back when you have 20+ closed trades.',
    });
  }

  return insights.slice(0, 5);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd workers/api-gateway && pnpm exec tsc --noEmit`

Note: The `AI.run()` call may need a type assertion since the model name is dynamic. If typecheck fails on the AI binding, cast: `(c.env.AI as any).run(model, {...})`

- [ ] **Step 3: Commit**

```bash
git add workers/api-gateway/src/routes/analytics.ts
git commit -m "feat(api): add AI insights endpoint — Workers AI Llama 3.3 70B with fallback + caching"
```

---

### Task 6: Deploy and Verify

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verify CI passes**

All jobs should pass including the new AI binding.

- [ ] **Step 3: Test endpoints**

Test attribution (needs auth token — verify via browser network tab or curl with token):
```bash
curl -s https://edgerelay-api.ghwmelite.workers.dev/v1/analytics/attribution \
  -H "Authorization: Bearer <token>" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2)[:500])"
```

---

## Summary

| Task | What it creates |
|------|----------------|
| 1 | ai_insights_cache table + Workers AI binding |
| 2 | Attribution endpoint (session, day, symbol, direction, heatmap) |
| 3 | Equity health endpoint (R², Sharpe, drawdown, prop compliance) |
| 4 | Edge validation endpoint (t-test, bootstrap, Monte Carlo) |
| 5 | AI insights endpoint (Workers AI + cache + fallback) |
| 6 | Deploy and verify |

**Next phase:** Sub-project 2 (Frontend — 4-tab analytics page with SVG charts).

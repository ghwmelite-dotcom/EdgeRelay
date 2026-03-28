# Signal Marketplace Phase 1: Provider Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to become signal providers with verified performance stats, setting the foundation for the public marketplace.

**Architecture:** Three new database tables (provider_profiles, provider_stats, marketplace_subscriptions). New marketplace API routes in the existing api-gateway worker. New provider-stats cron worker for hourly stat computation. New frontend page for provider onboarding and dashboard. All tables created in one migration for atomicity.

**Tech Stack:** Cloudflare Workers (Hono), D1 SQLite, TypeScript, React + Zustand, Tailwind CSS

**Spec Reference:** `docs/superpowers/specs/2026-03-28-signal-marketplace-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|----------------|
| `migrations/0012_marketplace_tables.sql` | Creates provider_profiles, provider_stats, marketplace_subscriptions tables |
| `workers/provider-stats/wrangler.toml` | Cron worker config (hourly trigger, D1 binding) |
| `workers/provider-stats/src/index.ts` | Stats computation logic |
| `workers/provider-stats/package.json` | Worker package metadata |
| `workers/provider-stats/tsconfig.json` | TypeScript config |
| `workers/api-gateway/src/routes/marketplace.ts` | Provider profile CRUD + qualification check |
| `apps/web/src/stores/marketplace.ts` | Zustand store for provider state |
| `apps/web/src/pages/ProviderSetupPage.tsx` | Become a Provider form + provider dashboard |

### Modified Files
| File | Change |
|------|--------|
| `workers/api-gateway/src/index.ts` | Mount marketplace routes |
| `apps/web/src/main.tsx` | Add ProviderSetupPage route |
| `apps/web/src/components/layout/AppLayout.tsx` | Add Marketplace sidebar item |
| `.github/workflows/deploy.yml` | Add provider-stats worker deploy job |

---

### Task 1: Database Migration

**Files:**
- Create: `migrations/0012_marketplace_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Signal Marketplace tables

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  master_account_id TEXT NOT NULL REFERENCES accounts(id),
  display_name TEXT NOT NULL,
  bio TEXT,
  instruments TEXT,
  strategy_style TEXT DEFAULT 'mixed' CHECK(strategy_style IN ('scalper','swing','position','mixed')),
  is_listed BOOLEAN DEFAULT false,
  listed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_listed ON provider_profiles(is_listed);

CREATE TABLE IF NOT EXISTS provider_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  provider_id TEXT UNIQUE NOT NULL REFERENCES provider_profiles(id),
  total_trades INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  avg_pips REAL DEFAULT 0,
  max_drawdown_pct REAL DEFAULT 0,
  sharpe_ratio REAL DEFAULT 0,
  avg_trade_duration_sec INTEGER DEFAULT 0,
  profit_factor REAL DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  equity_curve_json TEXT DEFAULT '[]',
  computed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscriber_user_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES provider_profiles(id),
  follower_account_id TEXT NOT NULL REFERENCES accounts(id),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','cancelled')),
  subscribed_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  UNIQUE(subscriber_user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON marketplace_subscriptions(subscriber_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON marketplace_subscriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON marketplace_subscriptions(status);
```

- [ ] **Step 2: Apply migration locally**

Run: `cd workers/api-gateway && pnpm exec wrangler d1 execute edgerelay-db --local --file=../../migrations/0012_marketplace_tables.sql`

Expected: Tables created successfully.

- [ ] **Step 3: Commit**

```bash
git add migrations/0012_marketplace_tables.sql
git commit -m "feat(db): add marketplace tables — provider_profiles, provider_stats, marketplace_subscriptions"
```

---

### Task 2: Marketplace API Routes — Provider Profile CRUD

**Files:**
- Create: `workers/api-gateway/src/routes/marketplace.ts`
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Create the marketplace route file**

```typescript
import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

export const marketplace = new Hono<{ Bindings: Env }>();

// ── Qualification Constants ─────────────────────────────────────

const MIN_TRADES = 20;
const MIN_DAYS = 14;

// ── Helpers ─────────────────────────────────────────────────────

interface QualificationResult {
  qualified: boolean;
  trade_count: number;
  active_days: number;
  required_trades: number;
  required_days: number;
}

async function checkQualification(
  db: D1Database,
  masterAccountId: string,
): Promise<QualificationResult> {
  const stats = await db
    .prepare(
      `SELECT
        COUNT(*) as trade_count,
        COUNT(DISTINCT DATE(close_time)) as active_days
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(masterAccountId)
    .first<{ trade_count: number; active_days: number }>();

  const tradeCount = stats?.trade_count ?? 0;
  const activeDays = stats?.active_days ?? 0;

  return {
    qualified: tradeCount >= MIN_TRADES && activeDays >= MIN_DAYS,
    trade_count: tradeCount,
    active_days: activeDays,
    required_trades: MIN_TRADES,
    required_days: MIN_DAYS,
  };
}

// ── POST /marketplace/provider — Become a provider ──────────────

marketplace.post('/provider', async (c) => {
  const userId = c.get('userId');

  // Check if already a provider
  const existing = await c.env.DB.prepare(
    'SELECT id FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ id: string }>();

  if (existing) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'ALREADY_EXISTS', message: 'You already have a provider profile' } },
      409,
    );
  }

  const body = await c.req.json<{
    display_name?: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    master_account_id?: string;
  }>();

  if (!body.display_name?.trim() || !body.master_account_id) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'display_name and master_account_id are required' } },
      400,
    );
  }

  // Verify master account belongs to user and is active
  const master = await c.env.DB.prepare(
    'SELECT id FROM accounts WHERE id = ? AND user_id = ? AND role = ? AND is_active = true',
  )
    .bind(body.master_account_id, userId, 'master')
    .first<{ id: string }>();

  if (!master) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'Master account not found or not active' } },
      404,
    );
  }

  // Check qualification
  const qualification = await checkQualification(c.env.DB, body.master_account_id);

  const validStyles = ['scalper', 'swing', 'position', 'mixed'];
  const style = validStyles.includes(body.strategy_style ?? '') ? body.strategy_style : 'mixed';

  const profile = await c.env.DB.prepare(
    `INSERT INTO provider_profiles (user_id, master_account_id, display_name, bio, instruments, strategy_style, is_listed, listed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(
      userId,
      body.master_account_id,
      body.display_name.trim(),
      body.bio?.trim() || null,
      body.instruments?.trim() || null,
      style,
      qualification.qualified,
      qualification.qualified ? new Date().toISOString() : null,
    )
    .first();

  if (!profile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create provider profile' } },
      500,
    );
  }

  // Create empty stats row
  await c.env.DB.prepare(
    'INSERT INTO provider_stats (provider_id) VALUES (?)',
  )
    .bind((profile as Record<string, unknown>).id as string)
    .run();

  return c.json<ApiResponse>(
    { data: { profile, qualification }, error: null },
    201,
  );
});

// ── PUT /marketplace/provider — Update own profile ──────────────

marketplace.put('/provider', async (c) => {
  const userId = c.get('userId');

  const profile = await c.env.DB.prepare(
    'SELECT id, is_listed FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ id: string; is_listed: number }>();

  if (!profile) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No provider profile found' } },
      404,
    );
  }

  const body = await c.req.json<{
    display_name?: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    is_listed?: boolean;
  }>();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.display_name?.trim()) {
    updates.push('display_name = ?');
    values.push(body.display_name.trim());
  }
  if (body.bio !== undefined) {
    updates.push('bio = ?');
    values.push(body.bio?.trim() || null);
  }
  if (body.instruments !== undefined) {
    updates.push('instruments = ?');
    values.push(body.instruments?.trim() || null);
  }
  if (body.strategy_style) {
    const validStyles = ['scalper', 'swing', 'position', 'mixed'];
    if (validStyles.includes(body.strategy_style)) {
      updates.push('strategy_style = ?');
      values.push(body.strategy_style);
    }
  }
  if (body.is_listed !== undefined) {
    updates.push('is_listed = ?');
    values.push(body.is_listed);
    if (body.is_listed && !profile.is_listed) {
      updates.push('listed_at = ?');
      values.push(new Date().toISOString());
    }
  }

  if (updates.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } }, 400);
  }

  values.push(profile.id);

  const updated = await c.env.DB.prepare(
    `UPDATE provider_profiles SET ${updates.join(', ')} WHERE id = ? RETURNING *`,
  )
    .bind(...values)
    .first();

  return c.json<ApiResponse>({ data: updated, error: null });
});

// ── GET /marketplace/provider/me — Own profile + stats ──────────

marketplace.get('/provider/me', async (c) => {
  const userId = c.get('userId');

  const profile = await c.env.DB.prepare(
    'SELECT * FROM provider_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first();

  if (!profile) {
    return c.json<ApiResponse>({ data: null, error: null });
  }

  const stats = await c.env.DB.prepare(
    'SELECT * FROM provider_stats WHERE provider_id = ?',
  )
    .bind((profile as Record<string, unknown>).id as string)
    .first();

  const qualification = await checkQualification(
    c.env.DB,
    (profile as Record<string, unknown>).master_account_id as string,
  );

  return c.json<ApiResponse>({
    data: { profile, stats, qualification },
    error: null,
  });
});
```

- [ ] **Step 2: Mount the route in api-gateway**

In `workers/api-gateway/src/index.ts`, add import and mount:

Add to imports:
```typescript
import { marketplace } from './routes/marketplace.js';
```

Add after the existing `protectedApp.route('/market-news', marketNews);` line:
```typescript
protectedApp.route('/marketplace', marketplace);
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd workers/api-gateway && pnpm exec tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add workers/api-gateway/src/routes/marketplace.ts workers/api-gateway/src/index.ts
git commit -m "feat(api): add marketplace provider routes — create, update, get own profile"
```

---

### Task 3: Provider Stats Cron Worker

**Files:**
- Create: `workers/provider-stats/wrangler.toml`
- Create: `workers/provider-stats/package.json`
- Create: `workers/provider-stats/tsconfig.json`
- Create: `workers/provider-stats/src/index.ts`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "edgerelay-provider-stats"
main = "src/index.ts"
compatibility_date = "2024-12-30"

[triggers]
crons = ["0 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@edgerelay/provider-stats",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create the stats worker**

```typescript
interface Env {
  DB: D1Database;
}

interface ProviderRow {
  id: string;
  master_account_id: string;
}

interface TradeAgg {
  total_trades: number;
  win_count: number;
  total_pnl: number;
  total_pips: number;
  total_duration_sec: number;
  gross_profit: number;
  gross_loss: number;
}

interface DailyBalance {
  day: string;
  balance: number;
}

const MIN_TRADES = 20;
const MIN_DAYS = 14;

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const { results: providers } = await env.DB.prepare(
      'SELECT id, master_account_id FROM provider_profiles',
    ).all<ProviderRow>();

    if (!providers || providers.length === 0) return;

    for (const provider of providers) {
      await computeStats(env.DB, provider);
    }
  },
};

async function computeStats(db: D1Database, provider: ProviderRow): Promise<void> {
  const accountId = provider.master_account_id;

  // Aggregate trade stats
  const agg = await db
    .prepare(
      `SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as win_count,
        COALESCE(SUM(profit), 0) as total_pnl,
        COALESCE(SUM(pips), 0) as total_pips,
        COALESCE(SUM(duration_seconds), 0) as total_duration_sec,
        COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) as gross_profit,
        COALESCE(ABS(SUM(CASE WHEN profit < 0 THEN profit ELSE 0 END)), 0) as gross_loss
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(accountId)
    .first<TradeAgg>();

  if (!agg) return;

  const totalTrades = agg.total_trades;
  const winRate = totalTrades > 0 ? (agg.win_count / totalTrades) * 100 : 0;
  const avgPips = totalTrades > 0 ? agg.total_pips / totalTrades : 0;
  const avgDuration = totalTrades > 0 ? Math.round(agg.total_duration_sec / totalTrades) : 0;
  const profitFactor = agg.gross_loss > 0 ? agg.gross_profit / agg.gross_loss : agg.gross_profit > 0 ? 999 : 0;

  // Active days
  const daysRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT DATE(close_time)) as active_days
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'`,
    )
    .bind(accountId)
    .first<{ active_days: number }>();

  const activeDays = daysRow?.active_days ?? 0;

  // Equity curve — daily running balance, last 90 days
  const { results: dailyBalances } = await db
    .prepare(
      `SELECT DATE(close_time) as day, balance_at_trade as balance
      FROM journal_trades
      WHERE account_id = ? AND deal_entry = 'out'
        AND close_time >= datetime('now', '-90 days')
      GROUP BY DATE(close_time)
      HAVING close_time = MAX(close_time)
      ORDER BY day`,
    )
    .bind(accountId)
    .all<DailyBalance>();

  const equityCurve = (dailyBalances ?? []).map((d) => ({
    date: d.day,
    balance: d.balance,
  }));

  // Max drawdown from equity curve
  let maxDrawdownPct = 0;
  if (equityCurve.length > 1) {
    let peak = equityCurve[0].balance;
    for (const point of equityCurve) {
      if (point.balance > peak) peak = point.balance;
      if (peak > 0) {
        const dd = ((peak - point.balance) / peak) * 100;
        if (dd > maxDrawdownPct) maxDrawdownPct = dd;
      }
    }
  }

  // Sharpe ratio (simplified: avg daily return / stddev)
  let sharpeRatio = 0;
  if (equityCurve.length > 2) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].balance;
      if (prev > 0) {
        dailyReturns.push((equityCurve[i].balance - prev) / prev);
      }
    }
    if (dailyReturns.length > 1) {
      const avg = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / dailyReturns.length;
      const stddev = Math.sqrt(variance);
      sharpeRatio = stddev > 0 ? (avg / stddev) * Math.sqrt(252) : 0;
    }
  }

  // Subscriber count
  const subRow = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM marketplace_subscriptions
      WHERE provider_id = ? AND status = 'active'`,
    )
    .bind(provider.id)
    .first<{ cnt: number }>();

  const subscriberCount = subRow?.cnt ?? 0;

  // Upsert stats
  await db
    .prepare(
      `INSERT INTO provider_stats (provider_id, total_trades, win_rate, total_pnl, avg_pips, max_drawdown_pct, sharpe_ratio, avg_trade_duration_sec, profit_factor, active_days, subscriber_count, equity_curve_json, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(provider_id) DO UPDATE SET
        total_trades = excluded.total_trades,
        win_rate = excluded.win_rate,
        total_pnl = excluded.total_pnl,
        avg_pips = excluded.avg_pips,
        max_drawdown_pct = excluded.max_drawdown_pct,
        sharpe_ratio = excluded.sharpe_ratio,
        avg_trade_duration_sec = excluded.avg_trade_duration_sec,
        profit_factor = excluded.profit_factor,
        active_days = excluded.active_days,
        subscriber_count = excluded.subscriber_count,
        equity_curve_json = excluded.equity_curve_json,
        computed_at = excluded.computed_at`,
    )
    .bind(
      provider.id,
      totalTrades,
      Math.round(winRate * 100) / 100,
      Math.round(agg.total_pnl * 100) / 100,
      Math.round(avgPips * 10) / 10,
      Math.round(maxDrawdownPct * 100) / 100,
      Math.round(sharpeRatio * 100) / 100,
      avgDuration,
      Math.round(profitFactor * 100) / 100,
      activeDays,
      subscriberCount,
      JSON.stringify(equityCurve),
    )
    .run();

  // Re-check qualification — delist if below threshold
  if (totalTrades < MIN_TRADES || activeDays < MIN_DAYS) {
    await db
      .prepare('UPDATE provider_profiles SET is_listed = false WHERE id = ?')
      .bind(provider.id)
      .run();
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd workers/provider-stats && pnpm install`

- [ ] **Step 6: Verify typecheck passes**

Run: `cd workers/provider-stats && pnpm exec tsc --noEmit`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add workers/provider-stats/
git commit -m "feat(worker): add provider-stats cron worker — hourly performance computation"
```

---

### Task 4: CI/CD — Add Provider Stats Worker to Deploy Pipeline

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add deploy job**

Add the following job after the `deploy-api-gateway` job:

```yaml
  deploy-provider-stats:
    name: Deploy Provider Stats
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Deploy Provider Stats
        working-directory: workers/provider-stats
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add provider-stats worker to deploy pipeline"
```

---

### Task 5: Frontend — Marketplace Store

**Files:**
- Create: `apps/web/src/stores/marketplace.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProviderProfile {
  id: string;
  user_id: string;
  master_account_id: string;
  display_name: string;
  bio: string | null;
  instruments: string | null;
  strategy_style: 'scalper' | 'swing' | 'position' | 'mixed';
  is_listed: boolean;
  listed_at: string | null;
  created_at: string;
}

export interface ProviderStats {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pips: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  avg_trade_duration_sec: number;
  profit_factor: number;
  active_days: number;
  subscriber_count: number;
  equity_curve_json: string;
  computed_at: string;
}

export interface Qualification {
  qualified: boolean;
  trade_count: number;
  active_days: number;
  required_trades: number;
  required_days: number;
}

interface MarketplaceState {
  profile: ProviderProfile | null;
  stats: ProviderStats | null;
  qualification: Qualification | null;
  isLoading: boolean;
  error: string | null;
  fetchMyProfile: () => Promise<void>;
  createProfile: (data: {
    display_name: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    master_account_id: string;
  }) => Promise<boolean>;
  updateProfile: (data: Partial<{
    display_name: string;
    bio: string;
    instruments: string;
    strategy_style: string;
    is_listed: boolean;
  }>) => Promise<boolean>;
}

export const useMarketplaceStore = create<MarketplaceState>()((set) => ({
  profile: null,
  stats: null,
  qualification: null,
  isLoading: false,
  error: null,

  fetchMyProfile: async () => {
    set({ isLoading: true });
    const res = await api.get<{
      profile: ProviderProfile | null;
      stats: ProviderStats | null;
      qualification: Qualification | null;
    }>('/marketplace/provider/me');
    if (res.data) {
      set({
        profile: res.data.profile,
        stats: res.data.stats,
        qualification: res.data.qualification,
        isLoading: false,
        error: null,
      });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load profile' });
    }
  },

  createProfile: async (data) => {
    set({ isLoading: true, error: null });
    const res = await api.post<{
      profile: ProviderProfile;
      qualification: Qualification;
    }>('/marketplace/provider', data);
    if (res.data) {
      set({
        profile: res.data.profile,
        qualification: res.data.qualification,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error?.message ?? 'Failed to create profile' });
    return false;
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    const res = await api.put<ProviderProfile>('/marketplace/provider', data);
    if (res.data) {
      set({ profile: res.data, isLoading: false });
      return true;
    }
    set({ isLoading: false, error: res.error?.message ?? 'Failed to update profile' });
    return false;
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/stores/marketplace.ts
git commit -m "feat(web): add marketplace zustand store for provider profile state"
```

---

### Task 6: Frontend — Provider Setup Page

**Files:**
- Create: `apps/web/src/pages/ProviderSetupPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import {
  Radio,
  TrendingUp,
  Target,
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { useMarketplaceStore } from '@/stores/marketplace';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const STRATEGY_OPTIONS = [
  { value: 'scalper', label: 'Scalper' },
  { value: 'swing', label: 'Swing Trader' },
  { value: 'position', label: 'Position Trader' },
  { value: 'mixed', label: 'Mixed' },
];

function QualificationProgress({
  qualification,
}: {
  qualification: { trade_count: number; active_days: number; required_trades: number; required_days: number; qualified: boolean };
}) {
  const tradesPct = Math.min(100, (qualification.trade_count / qualification.required_trades) * 100);
  const daysPct = Math.min(100, (qualification.active_days / qualification.required_days) * 100);

  if (qualification.qualified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-neon-green/30 bg-neon-green/5 p-3">
        <Check size={16} className="text-neon-green" />
        <span className="text-sm text-neon-green font-medium">Qualified — your signals are live on the marketplace</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-neon-amber" />
        <span className="text-sm text-neon-amber font-medium">Not yet qualified</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
            <span>Closed Trades</span>
            <span>{qualification.trade_count}/{qualification.required_trades}</span>
          </div>
          <div className="h-1.5 rounded-full bg-terminal-border/50 overflow-hidden">
            <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${tradesPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-terminal-muted mb-1">
            <span>Active Days</span>
            <span>{qualification.active_days}/{qualification.required_days}</span>
          </div>
          <div className="h-1.5 rounded-full bg-terminal-border/50 overflow-hidden">
            <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${daysPct}%` }} />
          </div>
        </div>
      </div>
      <p className="text-xs text-terminal-muted">Keep trading to qualify. Stats update hourly.</p>
    </div>
  );
}

function StatBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-premium rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-terminal-muted">{icon}</span>
        <span className="text-[10px] uppercase tracking-[2px] text-terminal-muted font-semibold">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono-nums text-white">{value}</p>
    </div>
  );
}

function ProviderDashboard() {
  const { profile, stats, qualification, updateProfile } = useMarketplaceStore();
  const [isToggling, setIsToggling] = useState(false);

  if (!profile) return null;

  const handleToggleListing = async () => {
    if (!qualification?.qualified && !profile.is_listed) return;
    setIsToggling(true);
    await updateProfile({ is_listed: !profile.is_listed });
    setIsToggling(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{profile.display_name}</h2>
          <p className="text-sm text-terminal-muted">{profile.bio || 'No bio set'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={profile.is_listed ? 'green' : 'muted'}>
            {profile.is_listed ? 'Listed' : 'Unlisted'}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleListing}
            isLoading={isToggling}
            disabled={!qualification?.qualified && !profile.is_listed}
          >
            {profile.is_listed ? 'Unlist' : 'Go Live'}
          </Button>
        </div>
      </div>

      {/* Qualification */}
      {qualification && <QualificationProgress qualification={qualification} />}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBlock label="Win Rate" value={`${stats.win_rate.toFixed(1)}%`} icon={<Target size={12} />} />
          <StatBlock label="Total P&L" value={`$${stats.total_pnl.toFixed(2)}`} icon={<TrendingUp size={12} />} />
          <StatBlock label="Profit Factor" value={stats.profit_factor.toFixed(2)} icon={<BarChart3 size={12} />} />
          <StatBlock label="Subscribers" value={String(stats.subscriber_count)} icon={<Users size={12} />} />
          <StatBlock label="Max Drawdown" value={`${stats.max_drawdown_pct.toFixed(1)}%`} icon={<AlertTriangle size={12} />} />
          <StatBlock label="Avg Duration" value={formatDuration(stats.avg_trade_duration_sec)} icon={<Clock size={12} />} />
          <StatBlock label="Total Trades" value={String(stats.total_trades)} icon={<Radio size={12} />} />
          <StatBlock label="Active Days" value={String(stats.active_days)} icon={<Check size={12} />} />
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function ProviderSetupPage() {
  const { accounts, fetchAccounts } = useAccountsStore();
  const { profile, isLoading, error, fetchMyProfile, createProfile } = useMarketplaceStore();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [instruments, setInstruments] = useState('');
  const [strategyStyle, setStrategyStyle] = useState('mixed');
  const [masterAccountId, setMasterAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchMyProfile();
  }, [fetchAccounts, fetchMyProfile]);

  const masters = accounts.filter((a) => a.role === 'master' && a.is_active);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!displayName.trim()) { setFormError('Display name is required'); return; }
    if (!masterAccountId) { setFormError('Select a master account'); return; }

    setIsSubmitting(true);
    const success = await createProfile({
      display_name: displayName.trim(),
      bio: bio.trim() || undefined,
      instruments: instruments.trim() || undefined,
      strategy_style: strategyStyle,
      master_account_id: masterAccountId,
    });
    setIsSubmitting(false);
    if (!success) {
      setFormError(useMarketplaceStore.getState().error ?? 'Failed to create profile');
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-20 text-terminal-muted text-sm">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00e5ff]" />
          Loading...
        </div>
      </div>
    );
  }

  // Already a provider — show dashboard
  if (profile) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <p className="text-[10px] uppercase tracking-[2px] text-terminal-muted font-semibold mb-1">Signal Provider</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">Provider Dashboard</h1>
        </div>
        <ProviderDashboard />
      </div>
    );
  }

  // Not a provider — show setup form
  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="text-[10px] uppercase tracking-[2px] text-terminal-muted font-semibold mb-1">Signal Marketplace</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">Become a Provider</h1>
        <p className="text-sm text-terminal-muted mt-2 max-w-lg">
          Share your trading signals with the community. Your performance is verified through your trade journal — no fake screenshots, no BS.
        </p>
      </div>

      {masters.length === 0 ? (
        <Card className="glass-premium rounded-2xl p-8 text-center">
          <Radio size={32} className="text-terminal-muted mx-auto mb-4" />
          <p className="text-sm text-terminal-muted">
            You need a master account with trading history to become a provider.
          </p>
        </Card>
      ) : (
        <Card className="glass-premium rounded-2xl p-6">
          <form onSubmit={handleCreate} className="space-y-5 max-w-lg">
            <Input
              label="Display Name"
              placeholder="e.g. GoldEdge Trading"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                Bio
              </label>
              <textarea
                placeholder="Describe your strategy in a sentence..."
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-surface/50 px-4 py-3 text-sm text-terminal-text placeholder:text-terminal-muted/50 focus:border-neon-cyan focus:outline-none resize-none h-20"
              />
              <p className="text-[10px] text-terminal-muted text-right">{bio.length}/280</p>
            </div>

            <Input
              label="Instruments"
              placeholder="e.g. XAUUSD, EURUSD, GBPJPY"
              value={instruments}
              onChange={(e) => setInstruments(e.target.value)}
            />

            <Select
              label="Strategy Style"
              options={STRATEGY_OPTIONS}
              value={strategyStyle}
              onChange={(e) => setStrategyStyle(e.target.value)}
            />

            <Select
              label="Signal Source (Master Account)"
              options={[
                { value: '', label: 'Select master account...' },
                ...masters.map((m) => ({ value: m.id, label: m.alias })),
              ]}
              value={masterAccountId}
              onChange={(e) => setMasterAccountId(e.target.value)}
            />

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
                <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
                <p className="text-sm text-neon-red">{formError}</p>
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              <Radio size={14} /> Become a Provider
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/ProviderSetupPage.tsx
git commit -m "feat(web): add Provider Setup page with onboarding form and stats dashboard"
```

---

### Task 7: Frontend — Wire Up Routes and Sidebar

**Files:**
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add route to main.tsx**

Add import at the top:
```typescript
import { ProviderSetupPage } from '@/pages/ProviderSetupPage';
```

Add route inside the `ProtectedRoute > AppLayout` block, after the `/app/firms/:firmName` route:
```tsx
<Route path="/provider/setup" element={<ProviderSetupPage />} />
```

- [ ] **Step 2: Add sidebar nav item**

In `AppLayout.tsx`, add `Store` to the lucide-react import:
```typescript
import { ..., Store, ... } from 'lucide-react';
```

In the `NAV_GROUPS` array, add to the Portfolio group (after the Copier item):
```typescript
{ label: 'Marketplace', icon: Store, to: '/provider/setup' },
```

The Portfolio group should now be:
```typescript
{
  label: 'Portfolio',
  items: [
    { label: 'Copier', icon: ArrowLeftRight, to: '/accounts' },
    { label: 'Marketplace', icon: Store, to: '/provider/setup' },
    { label: 'Journal', icon: BookOpen, to: '/journal' },
    { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  ],
},
```

- [ ] **Step 3: Build to verify**

Run: `cd apps/web && pnpm run build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(web): wire up Provider Setup route and Marketplace sidebar item"
```

---

### Task 8: Final Integration — Push and Deploy

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

Expected: CI pipeline runs — typecheck, deploy all workers (including new provider-stats), deploy frontend, run migrations (creates 3 new tables).

- [ ] **Step 2: Verify deployment**

Check: `gh run list --limit 1` — all jobs should pass.

- [ ] **Step 3: Test the flow**

1. Log into trademetricspro.com
2. Navigate to Marketplace in sidebar
3. If you have a master account with trades: fill in the form and click "Become a Provider"
4. If not qualified yet: verify progress bars show correct counts
5. If qualified: verify stats dashboard loads with computed metrics

---

## Summary

| Task | What it creates |
|------|----------------|
| 1 | 3 new database tables |
| 2 | Marketplace API routes (create, update, get profile) |
| 3 | Provider stats cron worker (hourly computation) |
| 4 | CI/CD pipeline for new worker |
| 5 | Frontend Zustand store |
| 6 | Provider Setup page (form + dashboard) |
| 7 | Route + sidebar wiring |
| 8 | Deploy and verify |

**Next phases:** Sub-project 2 (Marketplace Discovery — public leaderboard) and Sub-project 3 (Copy & Subscribe — one-click copying) will be planned after Phase 1 is live and verified.

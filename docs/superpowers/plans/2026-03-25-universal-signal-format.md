# Universal Signal Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend EdgeRelay's signal types and DO symbol mapper for cross-platform trade copying — backward-compatible with existing MT5 pipeline.

**Architecture:** Add 3 optional fields to SignalPayload (source_platform, normalized_order_type, platform_specific), upgrade symbolMapper with rule-based normalization and alias map, add platform column to follower_config and symbol_mappings, relax signals table CHECK constraint. All changes backward-compatible — existing MT5 EAs send nothing new.

**Tech Stack:** TypeScript, Zod, Hono, D1/SQLite, Cloudflare Workers

**Spec:** `docs/superpowers/specs/2026-03-25-universal-signal-format-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `migrations/0007_platform_bridge.sql` | Create | Add platform columns to follower_config, symbol_mappings, signals; relax signals CHECK |
| `packages/shared/src/types.ts` | Modify | Add SourcePlatform, NormalizedOrderType enums; extend SignalPayload, OrderType, FollowerSignal |
| `workers/account-relay/src/symbolMapper.ts` | Modify | Add normalizeSymbol, alias map, update mapSymbol signature |
| `workers/account-relay/src/AccountRelay.ts` | Modify | Add platform to FollowerConfig, update loadFollowersFromD1, derive normalized_order_type in fan-out |
| `workers/signal-ingestion/src/index.ts` | Modify | Update D1 INSERT to include source_platform and normalized_order_type |

---

## Task 1: D1 Migration

**Files:**
- Create: `migrations/0007_platform_bridge.sql`

- [ ] **Step 1: Create the migration file**

Create `migrations/0007_platform_bridge.sql`:

```sql
-- Platform Bridge: add cross-platform support columns

-- 1. Add platform to follower_config
ALTER TABLE follower_config ADD COLUMN platform TEXT NOT NULL DEFAULT 'mt5';

-- 2. Add platform columns to symbol_mappings
ALTER TABLE symbol_mappings ADD COLUMN source_platform TEXT NOT NULL DEFAULT 'mt5';
ALTER TABLE symbol_mappings ADD COLUMN target_platform TEXT NOT NULL DEFAULT 'mt5';

-- 3. Recreate signals table to relax CHECK constraint and add platform columns.
-- The old table has CHECK(order_type IN (...)) which blocks future platform order types.

CREATE TABLE signals_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  master_account_id TEXT NOT NULL REFERENCES accounts(id),
  sequence_num INTEGER NOT NULL,
  action TEXT NOT NULL,
  order_type TEXT,
  symbol TEXT NOT NULL,
  volume REAL,
  price REAL,
  sl REAL,
  tp REAL,
  magic_number INTEGER,
  ticket INTEGER,
  comment TEXT,
  source_platform TEXT,
  normalized_order_type TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  UNIQUE(master_account_id, sequence_num)
);

INSERT INTO signals_new (id, master_account_id, sequence_num, action, order_type, symbol, volume, price, sl, tp, magic_number, ticket, comment, received_at)
SELECT id, master_account_id, sequence_num, action, order_type, symbol, volume, price, sl, tp, magic_number, ticket, comment, received_at FROM signals;

DROP TABLE signals;
ALTER TABLE signals_new RENAME TO signals;

-- Recreate signals indexes
CREATE INDEX idx_signals_master ON signals(master_account_id, received_at);
CREATE INDEX idx_signals_dedup ON signals(master_account_id, sequence_num);
```

- [ ] **Step 2: Apply migration to remote D1**

Run:
```bash
cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay"
npx wrangler d1 migrations apply edgerelay-db --remote
```

If wrangler's migration runner can't handle the table recreation (PRAGMA issue like Task 1 of journal sync), use:
```bash
npx wrangler d1 execute edgerelay-db --remote --file=migrations/0007_platform_bridge.sql
```
Then manually insert the migration tracking record.

- [ ] **Step 3: Verify migration**

Run:
```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT sql FROM sqlite_master WHERE name='signals'"
```
Expected: No CHECK constraint on order_type, has `source_platform TEXT` and `normalized_order_type TEXT` columns.

```bash
npx wrangler d1 execute edgerelay-db --remote --command "PRAGMA table_info(follower_config)"
```
Expected: Has `platform` column with default `mt5`.

- [ ] **Step 4: Commit**

```bash
git add migrations/0007_platform_bridge.sql
git commit -m "feat(bridge): add D1 migration for cross-platform support columns"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add SourcePlatform and NormalizedOrderType enums**

Read `packages/shared/src/types.ts`. After the existing `OrderType` enum (line 22), add:

```typescript
export const SourcePlatform = z.enum(['mt5', 'ctrader', 'dxtrade', 'tradelocker']);
export type SourcePlatform = z.infer<typeof SourcePlatform>;

export const NormalizedOrderType = z.enum([
  'market_buy', 'market_sell',
  'limit_buy', 'limit_sell',
  'stop_buy', 'stop_sell',
  'stop_limit_buy', 'stop_limit_sell',
]);
export type NormalizedOrderType = z.infer<typeof NormalizedOrderType>;
```

- [ ] **Step 2: Fix OrderType enum — add stop-limit types**

Replace the existing `OrderType` enum (lines 14-22):

```typescript
export const OrderType = z.enum([
  'buy',
  'sell',
  'buy_limit',
  'buy_stop',
  'sell_limit',
  'sell_stop',
  'buy_stop_limit',
  'sell_stop_limit',
]);
export type OrderType = z.infer<typeof OrderType>;
```

- [ ] **Step 3: Extend SignalPayload with 3 optional fields**

Add these 3 fields to the existing `SignalPayload` z.object (after `hmac_signature` on line 40):

```typescript
  source_platform: SourcePlatform.optional(),
  normalized_order_type: NormalizedOrderType.optional(),
  platform_specific: z.record(z.unknown()).optional(),
```

- [ ] **Step 4: Extend FollowerSignal interface**

Find the `FollowerSignal` interface (around line 105) and add `normalized_order_type`:

```typescript
export interface FollowerSignal {
  signal_id: string;
  action: SignalAction;
  order_type?: OrderType;
  symbol: string;
  volume?: number;
  price?: number;
  sl?: number;
  tp?: number;
  magic_number?: number;
  ticket?: number;
  comment?: string;
  master_timestamp: number;
  normalized_order_type?: NormalizedOrderType;  // NEW
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(bridge): add SourcePlatform, NormalizedOrderType enums and extend SignalPayload"
```

---

## Task 3: Symbol Mapper — Rule-Based Normalization

**Files:**
- Modify: `workers/account-relay/src/symbolMapper.ts`

- [ ] **Step 1: Rewrite symbolMapper.ts with normalization support**

Replace the entire content of `workers/account-relay/src/symbolMapper.ts`:

```typescript
/**
 * Symbol mapper — translates master symbols to follower-broker symbols.
 *
 * Priority:
 * 1. Explicit mapping (e.g., XAUUSD → GOLD)
 * 2. Cross-platform normalization (if platforms differ)
 * 3. Suffix append (e.g., EURUSD → EURUSDm)
 * 4. Passthrough (return original symbol)
 */

export interface SymbolMapperConfig {
  symbol_suffix: string;
}

// ── Alias Map ────────────────────────────────────────────────
// Normalizes known instrument name variants to a canonical form.

const SYMBOL_ALIASES: Map<string, string> = new Map([
  ['GOLD', 'XAUUSD'],
  ['SILVER', 'XAGUSD'],
  ['SPX500', 'US500'],
  ['SP500', 'US500'],
  ['USTEC', 'NAS100'],
  ['US100', 'NAS100'],
  ['NSDQ100', 'NAS100'],
  ['DJ30', 'US30'],
  ['DOW30', 'US30'],
  ['UKOIL', 'BRENTOIL'],
  ['BRENT', 'BRENTOIL'],
  ['USOIL', 'WTIOIL'],
  ['WTI', 'WTIOIL'],
  ['CRUDE', 'WTIOIL'],
  ['BITCOIN', 'BTCUSD'],
  ['ETHEREUM', 'ETHUSD'],
]);

const BROKER_SUFFIXES = ['.pro', '.raw', '.ecn', '.std', '.m', '.c', '.i'];

// ── Normalization ────────────────────────────────────────────

/**
 * Normalize a symbol for cross-platform matching.
 * - Strips broker suffixes (if remaining string >= 3 chars)
 * - Removes separators (/)
 * - Applies alias map
 */
export function normalizeSymbol(symbol: string): string {
  let normalized = symbol;

  // Strip broker suffixes (longest first — sorted by length desc)
  for (const suffix of BROKER_SUFFIXES) {
    if (
      normalized.toLowerCase().endsWith(suffix) &&
      normalized.length - suffix.length >= 3
    ) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  // Remove separators
  normalized = normalized.replace(/\//g, '');

  // Apply aliases (case-insensitive lookup, return uppercase for consistency)
  const upper = normalized.toUpperCase();
  return SYMBOL_ALIASES.get(upper) ?? upper;
}

// ── Map Symbol ───────────────────────────────────────────────

/**
 * Map a master symbol to the follower's broker symbol.
 *
 * @param symbol          The original symbol from the master signal
 * @param config          Follower's symbol configuration
 * @param symbolMappings  Explicit symbol-to-symbol mappings
 * @param sourcePlatform  Platform that sent the signal (default 'mt5')
 * @param targetPlatform  Follower's platform (default 'mt5')
 * @returns               Mapped symbol string
 */
export function mapSymbol(
  symbol: string,
  config: SymbolMapperConfig,
  symbolMappings: Map<string, string>,
  sourcePlatform = 'mt5',
  targetPlatform = 'mt5',
): string {
  // 1. Check explicit mapping first (highest priority)
  const explicit = symbolMappings.get(symbol);
  if (explicit) {
    return explicit;
  }

  let result = symbol;

  // 2. Cross-platform: apply rule-based normalization
  if (sourcePlatform !== targetPlatform) {
    result = normalizeSymbol(result);
  }

  // 3. Append suffix if configured
  if (config.symbol_suffix) {
    result = `${result}${config.symbol_suffix}`;
  }

  // 4. Passthrough
  return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd workers/account-relay && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add workers/account-relay/src/symbolMapper.ts
git commit -m "feat(bridge): add rule-based symbol normalization with alias map and suffix stripping"
```

---

## Task 4: AccountRelay DO — Platform-Aware Fan-Out

**Files:**
- Modify: `workers/account-relay/src/AccountRelay.ts`

- [ ] **Step 1: Add platform to FollowerConfig interface**

Find the `FollowerConfig` interface (around line 30) and add `platform`:

```typescript
interface FollowerConfig {
  follower_account_id: string;
  lot_mode: LotMode;
  lot_value: number;
  symbol_suffix: string;
  max_daily_loss_percent: number | null;
  current_daily_loss_percent: number;
  symbol_mappings: Map<string, string>;
  enabled: boolean;
  platform: string;  // NEW — 'mt5', 'ctrader', 'dxtrade', 'tradelocker'
}
```

- [ ] **Step 2: Update loadFollowersFromD1 — add platform to query and filter symbol mappings**

In `loadFollowersFromD1` (around line 400), update the SELECT to include `fc.platform`:

```sql
SELECT
  a.id AS follower_account_id,
  fc.lot_mode,
  fc.lot_value,
  fc.symbol_suffix,
  fc.max_daily_loss_percent,
  fc.platform,
  a.is_active AS enabled
FROM accounts a
JOIN follower_config fc ON fc.account_id = a.id
WHERE a.master_account_id = ? AND a.role = 'follower' AND a.is_active = 1
```

Add `platform: string` to the TypeScript row type.

Update the symbol mappings sub-query to filter by target platform:

```typescript
const mappingRows = await this.env.DB.prepare(
  `SELECT master_symbol, follower_symbol
   FROM symbol_mappings
   WHERE account_id = ? AND target_platform = ?`,
)
  .bind(row.follower_account_id, row.platform ?? 'mt5')
  .all<{ master_symbol: string; follower_symbol: string }>();
```

Add `platform: row.platform ?? 'mt5'` to the FollowerConfig construction.

- [ ] **Step 3: Add order type normalization helper**

Add this function near the top of the file (after imports):

```typescript
import type { NormalizedOrderType } from '@edgerelay/shared';

const ORDER_TYPE_MAP: Record<string, NormalizedOrderType> = {
  buy: 'market_buy',
  sell: 'market_sell',
  buy_limit: 'limit_buy',
  sell_limit: 'limit_sell',
  buy_stop: 'stop_buy',
  sell_stop: 'stop_sell',
  buy_stop_limit: 'stop_limit_buy',
  sell_stop_limit: 'stop_limit_sell',
};

function deriveNormalizedOrderType(
  orderType?: string,
  existing?: string,
): NormalizedOrderType | undefined {
  if (existing) return existing as NormalizedOrderType;
  if (!orderType) return undefined;
  return ORDER_TYPE_MAP[orderType];
}
```

- [ ] **Step 4: Update fan-out to pass platform info and normalized_order_type**

In the `/signal` route handler, update the fan-out loop (around line 182-208). Change the `mapSymbol` call and `followerSignal` construction:

Replace:
```typescript
const mappedSymbol = mapSymbol(signal.symbol, symbolConfig, follower.symbol_mappings);

const followerSignal: FollowerSignal = {
  signal_id: signal.signal_id,
  action: signal.action,
  order_type: signal.order_type,
  symbol: mappedSymbol,
  volume,
  price: signal.price,
  sl: signal.sl,
  tp: signal.tp,
  magic_number: signal.magic_number,
  ticket: signal.ticket,
  comment: signal.comment,
  master_timestamp: signal.timestamp,
};
```

With:
```typescript
const sourcePlatform = signal.source_platform ?? 'mt5';
const mappedSymbol = mapSymbol(
  signal.symbol,
  symbolConfig,
  follower.symbol_mappings,
  sourcePlatform,
  follower.platform,
);

const followerSignal: FollowerSignal = {
  signal_id: signal.signal_id,
  action: signal.action,
  order_type: signal.order_type,
  symbol: mappedSymbol,
  volume,
  price: signal.price,
  sl: signal.sl,
  tp: signal.tp,
  magic_number: signal.magic_number,
  ticket: signal.ticket,
  comment: signal.comment,
  master_timestamp: signal.timestamp,
  normalized_order_type: deriveNormalizedOrderType(
    signal.order_type,
    signal.normalized_order_type,
  ),
};
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd workers/account-relay && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add workers/account-relay/src/AccountRelay.ts
git commit -m "feat(bridge): add platform-aware fan-out with normalized order types"
```

---

## Task 5: Signal Ingestion — Store Platform Fields

**Files:**
- Modify: `workers/signal-ingestion/src/index.ts`

- [ ] **Step 1: Update the D1 INSERT to include new columns**

Find the D1 INSERT in the `/v1/ingest` route (around line 121-142). Replace it with:

```typescript
    await c.env.DB.prepare(
      `INSERT INTO signals (
        id, master_account_id, sequence_num, action, order_type, symbol,
        volume, price, sl, tp, magic_number, ticket, comment,
        source_platform, normalized_order_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        signal.signal_id,
        signal.account_id,
        signal.sequence_num,
        signal.action,
        signal.order_type ?? null,
        signal.symbol,
        signal.volume ?? null,
        signal.price ?? null,
        signal.sl ?? null,
        signal.tp ?? null,
        signal.magic_number ?? null,
        signal.ticket ?? null,
        signal.comment ?? null,
        signal.source_platform ?? null,
        signal.normalized_order_type ?? null,
      )
      .run();
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd workers/signal-ingestion && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add workers/signal-ingestion/src/index.ts
git commit -m "feat(bridge): store source_platform and normalized_order_type in signals table"
```

---

## Task 6: Deploy and Verify

**Files:** No file changes — deploy and verify only.

- [ ] **Step 1: Deploy account-relay worker**

Run:
```bash
cd workers/account-relay && npx wrangler deploy
```
Expected: Deployed successfully.

- [ ] **Step 2: Deploy signal-ingestion worker**

Run:
```bash
cd workers/signal-ingestion && npx wrangler deploy
```
Expected: Deployed successfully.

- [ ] **Step 3: Verify existing MT5 copier still works**

The existing MT5 Master EA doesn't send `source_platform`, `normalized_order_type`, or `platform_specific`. These fields are all optional in the Zod schema, so existing signals should continue to be accepted and processed unchanged.

Check: wait for a trade signal or use a test signal. Verify the signal-ingestion returns 201 and the DO processes it.

- [ ] **Step 4: Verify D1 signals table has new columns**

Run:
```bash
npx wrangler d1 execute edgerelay-db --remote --command "PRAGMA table_info(signals)"
```
Expected: Has `source_platform` and `normalized_order_type` columns.

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

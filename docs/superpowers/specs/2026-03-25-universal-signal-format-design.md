# Universal Signal Format — Design Spec

**Date**: 2026-03-25
**Status**: Approved
**Scope**: Sub-project 1 of the Platform Bridge feature. Extend SignalPayload for cross-platform support, upgrade DO symbol mapper with rule-based normalization, add platform-aware D1 schema.

---

## Goals

1. Extend `SignalPayload` with optional cross-platform fields — zero breaking changes to existing MT5 pipeline
2. Add rule-based symbol normalization in the DO for cross-platform fan-out
3. Make symbol mappings platform-aware in D1
4. Define a normalized order type set that all platforms can map to
5. Prepare the foundation for cTrader, DXTrade, and TradeLocker connectors

## Non-Goals

- No new platform connectors (cTrader, DXTrade, TradeLocker are separate sub-projects)
- No WebSocket layer (separate sub-project)
- No changes to MT5 EAs
- No changes to web dashboard or journal sync
- No new workers

---

## SignalPayload Extension

### New Fields (all optional — backward-compatible)

Add to the existing `SignalPayload` Zod schema in `packages/shared/src/types.ts`:

```typescript
source_platform: SourcePlatform.optional()
normalized_order_type: NormalizedOrderType.optional()
platform_specific: z.record(z.unknown()).optional()
```

### New Enums

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

### OrderType Enum Fix (pre-existing bug)

The existing `OrderType` enum is missing `buy_stop_limit` and `sell_stop_limit`, which the MT5 EA can emit. Add them:

```typescript
export const OrderType = z.enum([
  'buy', 'sell',
  'buy_limit', 'buy_stop',
  'sell_limit', 'sell_stop',
  'buy_stop_limit', 'sell_stop_limit',  // NEW — MT5 supports these
]);
```

### FollowerSignal Extension

Add `normalized_order_type` to the `FollowerSignal` interface in shared types so follower connectors know the universal order type:

```typescript
normalized_order_type?: NormalizedOrderType;
```

### Backward Compatibility

- `source_platform` defaults to `'mt5'` when omitted (handled in DO logic, not in schema default)
- `normalized_order_type` is derived by the DO from `order_type` when not set
- `platform_specific` is ignored by platforms that don't understand it
- Existing MT5 EAs send no new fields — everything keeps working

### platform_specific Usage Examples

**cTrader signal:**
```json
{
  "source_platform": "ctrader",
  "normalized_order_type": "stop_buy",
  "platform_specific": {
    "stopLimitRange": 5,
    "guaranteedStopLoss": true,
    "trailingStopDistance": 20
  }
}
```

**MT5 signal (unchanged — no platform_specific):**
```json
{
  "order_type": "buy",
  "source_platform": null
}
```

---

## Normalized Order Type Mapping

The DO derives `normalized_order_type` from the signal's `order_type` when not already set by a connector:

| MT5 `order_type` | `normalized_order_type` |
|---|---|
| `buy` | `market_buy` |
| `sell` | `market_sell` |
| `buy_limit` | `limit_buy` |
| `sell_limit` | `limit_sell` |
| `buy_stop` | `stop_buy` |
| `sell_stop` | `stop_sell` |
| `buy_stop_limit` | `stop_limit_buy` |
| `sell_stop_limit` | `stop_limit_sell` |

Future platform connectors set `normalized_order_type` directly when sending signals.

When the DO fans out to a follower, it uses `normalized_order_type` to determine the destination platform's native order type. Each connector defines its own reverse mapping (e.g., cTrader connector knows that `limit_buy` → cTrader `LIMIT` with `tradeSide: BUY`).

---

## Symbol Normalization

### Two-Layer Approach

**Layer 1: Rule-based normalization (automatic, handles ~90% of cases)**

Applied in the DO's `mapSymbol` function when source and destination platforms differ:

1. **Strip broker suffixes:** Remove trailing `.m`, `.c`, `.i`, `.pro`, `.raw`, `.ecn`, `.std` (case-insensitive). Only strip if the remaining string is at least 3 characters (prevents false positives on short names like `ETH.c`)
2. **Remove separators:** Strip `/` characters (`EUR/USD` → `EURUSD`)
3. **Apply alias map:** Normalize known instrument aliases to a canonical name

**Alias Map (static, in symbolMapper module):**

| Aliases | Canonical |
|---|---|
| `GOLD`, `XAUUSD` | `XAUUSD` |
| `SILVER`, `XAGUSD` | `XAGUSD` |
| `SPX500`, `SP500`, `US500` | `US500` |
| `NAS100`, `USTEC`, `US100`, `NSDQ100` | `NAS100` |
| `DJ30`, `US30`, `DOW30` | `US30` |
| `UKOIL`, `BRENT`, `BRENTOIL` | `BRENTOIL` |
| `USOIL`, `WTI`, `WTIOIL`, `CRUDE` | `WTIOIL` |
| `BTCUSD`, `BITCOIN` | `BTCUSD` |
| `ETHUSD`, `ETHEREUM` | `ETHUSD` |

**Layer 2: Per-account D1 overrides (manual, for edge cases)**

The existing `symbol_mappings` table is extended with platform columns. Users can add explicit mappings via the dashboard for instruments the rules don't catch.

### When Normalization Is Applied

- **Same platform (e.g., MT5 → MT5):** Only suffix stripping + custom overrides (current behavior, unchanged)
- **Cross-platform (e.g., MT5 → cTrader):** Full rule-based normalization → then custom overrides

### mapSymbol Function Signature Update

Current:
```typescript
mapSymbol(symbol: string, config: SymbolMapperConfig, mappings: Map<string, string>): string
```

Updated:
```typescript
mapSymbol(
  symbol: string,
  config: SymbolMapperConfig,
  mappings: Map<string, string>,
  sourcePlatform?: string,
  targetPlatform?: string,
): string
```

When `sourcePlatform === targetPlatform` (or both undefined), behavior is identical to current. When they differ, rule-based normalization runs first.

---

## D1 Schema Changes

### Migration: `migrations/0007_platform_bridge.sql`

```sql
-- 1. Add platform to follower_config
ALTER TABLE follower_config ADD COLUMN platform TEXT NOT NULL DEFAULT 'mt5';

-- 2. Add platform columns to symbol_mappings
ALTER TABLE symbol_mappings ADD COLUMN source_platform TEXT NOT NULL DEFAULT 'mt5';
ALTER TABLE symbol_mappings ADD COLUMN target_platform TEXT NOT NULL DEFAULT 'mt5';

-- 3. Add cross-platform columns to signals table for auditability
ALTER TABLE signals ADD COLUMN source_platform TEXT;
ALTER TABLE signals ADD COLUMN normalized_order_type TEXT;

-- 4. Relax signals.order_type CHECK constraint to accept stop-limit types
-- SQLite requires table recreation to modify CHECK constraints.
-- Since the signals table may have many rows, use a pragmatic approach:
-- Drop the CHECK by recreating the table.
CREATE TABLE signals_new (
  id TEXT PRIMARY KEY,
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

### Effect on Existing Data

- All existing `follower_config` rows get `platform = 'mt5'` (correct)
- All existing `symbol_mappings` rows get `source_platform = 'mt5'`, `target_platform = 'mt5'` (correct)
- All existing `signals` rows get `source_platform = NULL`, `normalized_order_type = NULL` (correct — they're MT5 signals, can be backfilled later if needed)
- The `signals` table CHECK constraint on `order_type` is removed to accept any platform's order types
- No data is lost

### symbol_mappings UNIQUE Constraint

The existing `UNIQUE(account_id, master_symbol)` constraint remains for now. For MVP cross-platform, each account has one source platform (the master's platform) and one target platform (the follower's platform), so the existing constraint works. If a future need arises for multiple source/target pairs per symbol per account, a migration to update the UNIQUE constraint can be added then. YAGNI.

---

## AccountRelay DO Changes

### FollowerConfig Interface Update

Add `platform` field:

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

### loadFollowersFromD1 Update

Add `fc.platform` to the SELECT query and include it in the FollowerConfig construction.

Update the symbol mappings sub-query to filter by the follower's platform:

```sql
SELECT master_symbol, follower_symbol
FROM symbol_mappings
WHERE account_id = ? AND target_platform = ?
```

This ensures only platform-relevant mappings are loaded. The `source_platform` filter is not needed at load time since the master's platform is determined per-signal during fan-out.

### Signal Fan-Out Update

In the `/signal` route handler, when building `followerSignal`:

1. Derive `normalized_order_type` from `signal.order_type` if not already set (using the mapping table above)
2. Determine `sourcePlatform` from `signal.source_platform ?? 'mt5'`
3. Pass `sourcePlatform` and `follower.platform` to `mapSymbol`

### mapSymbol Update (symbolMapper.ts)

Add the alias map as a module-level constant:

```typescript
const SYMBOL_ALIASES: Map<string, string> = new Map([
  ['GOLD', 'XAUUSD'],
  ['SILVER', 'XAGUSD'],
  ['SPX500', 'US500'], ['SP500', 'US500'],
  ['USTEC', 'NAS100'], ['US100', 'NAS100'], ['NSDQ100', 'NAS100'],
  ['DJ30', 'US30'], ['DOW30', 'US30'],
  ['UKOIL', 'BRENTOIL'], ['BRENT', 'BRENTOIL'],
  ['USOIL', 'WTIOIL'], ['WTI', 'WTIOIL'], ['CRUDE', 'WTIOIL'],
  ['BITCOIN', 'BTCUSD'],
  ['ETHEREUM', 'ETHUSD'],
]);

const BROKER_SUFFIXES = ['.m', '.c', '.i', '.pro', '.raw', '.ecn', '.std'];
```

Add normalization logic:

```typescript
function normalizeSymbol(symbol: string): string {
  let normalized = symbol;

  // Strip broker suffixes (only if remaining string >= 3 chars)
  for (const suffix of BROKER_SUFFIXES) {
    if (normalized.toLowerCase().endsWith(suffix) && normalized.length - suffix.length >= 3) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  // Remove separators
  normalized = normalized.replace(/\//g, '');

  // Apply aliases
  const upper = normalized.toUpperCase();
  return SYMBOL_ALIASES.get(upper) ?? normalized;
}
```

Updated `mapSymbol`:

```typescript
export function mapSymbol(
  symbol: string,
  config: SymbolMapperConfig,
  mappings: Map<string, string>,
  sourcePlatform = 'mt5',
  targetPlatform = 'mt5',
): string {
  // Check explicit per-account mappings first (highest priority)
  const explicitMapping = mappings.get(symbol);
  if (explicitMapping) return explicitMapping;

  let result = symbol;

  // Cross-platform: apply rule-based normalization
  if (sourcePlatform !== targetPlatform) {
    result = normalizeSymbol(result);
  }

  // Apply suffix (existing behavior)
  if (config.symbol_suffix) {
    result = result + config.symbol_suffix;
  }

  return result;
}
```

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/src/types.ts` | Modify | Add `SourcePlatform`, `NormalizedOrderType` enums, extend `SignalPayload` with 3 optional fields, fix `OrderType` enum (add stop-limit types), extend `FollowerSignal` with `normalized_order_type` |
| `workers/account-relay/src/symbolMapper.ts` | Modify | Add `normalizeSymbol`, alias map, broker suffix stripping, update `mapSymbol` signature |
| `workers/account-relay/src/AccountRelay.ts` | Modify | Add `platform` to `FollowerConfig`, update `loadFollowersFromD1` query (include platform, filter symbol mappings), derive `normalized_order_type` during fan-out, pass platforms to `mapSymbol` |
| `workers/signal-ingestion/src/index.ts` | Modify | Update D1 INSERT to include `source_platform` and `normalized_order_type` columns |
| `migrations/0007_platform_bridge.sql` | Create | Add `platform` to `follower_config`, add platform columns to `symbol_mappings`, add columns + relax CHECK on `signals` table |

**No changes to:** MT5 EAs, web dashboard, journal sync worker.

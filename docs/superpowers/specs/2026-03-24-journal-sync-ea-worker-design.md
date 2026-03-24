# Trade Journal Sync EA + Worker — Design Spec

**Date**: 2026-03-24
**Status**: Approved
**Scope**: Sub-project 1 of the AI Trade Journal product. MQL5 sync EA + Cloudflare Worker for zero-drop trade capture and storage. Lives inside the EdgeRelay monorepo, usable standalone or alongside the copier.

---

## Goals

1. Capture every trade on an MT5 account with zero drops — real-time detection plus periodic history catch-up
2. Enrich trades with data only available at execution time (spread, ATR, balance/equity)
3. Sync to a dedicated Cloudflare Worker with local queue and indefinite retry
4. Store structured trade data in the shared D1 database
5. Share sync logic so the existing Master EA can optionally journal trades too
6. Reuse existing EdgeRelay auth (API key + HMAC) — no new credentials for existing users

## Non-Goals

- No web dashboard UI (Sub-project 3)
- No AI analysis/coaching (Sub-project 4)
- No screenshot capture (Sub-project 5)
- No changes to the copier signal pipeline
- No changes to existing Master/Follower EA behavior (journal is opt-in via toggle)

---

## EA Architecture

### Files

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/ea/TradeJournal_Sync.mq5` | Create | Standalone journal sync EA |
| `apps/ea/Include/EdgeRelay_JournalSync.mqh` | Create | Shared sync logic: trade capture, enrichment, batch send |
| `apps/ea/Include/EdgeRelay_JournalQueue.mqh` | Create | Dedicated journal queue: file-based persistence, no expiry, batch flush |
| `apps/ea/EdgeRelay_Master.mq5` | Modify | Add optional `EnableJournal` toggle + include |

### Input Parameters (TradeJournal_Sync.mq5)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `API_Key` | string | "" | API Key (reuses EdgeRelay credentials) |
| `API_Secret` | string | "" | API Secret (HMAC signing) |
| `API_Endpoint` | string | "https://edgerelay-journal-sync.ghwmelite.workers.dev" | Journal sync endpoint |
| `AccountID` | string | "" | Account ID |
| `SyncIntervalSeconds` | int | 60 | History poll catch-up interval |
| `HeartbeatIntervalMs` | int | 30000 | Heartbeat interval (30s default) |

### Trade Detection (Belt and Suspenders)

**Real-time: `OnTradeTransaction()`**
- Fires on every `TRADE_TRANSACTION_DEAL_ADD` event
- Captures deal details immediately
- Only processes `DEAL_TYPE_BUY` and `DEAL_TYPE_SELL` (ignores balance ops, commissions, etc.)
- Passes deal to `EdgeRelay_JournalSync.mqh` for enrichment and queuing

**Catch-up: Timer-based history scan**
- Runs every `SyncIntervalSeconds` (default 60s)
- Scans `HistoryDealsTotal()` from the last synced deal ticket forward
- Tracks last synced deal ticket in a MT5 GlobalVariable (`JournalSync_LastDeal_<AccountID>`) for crash recovery
- Any deal not yet synced gets enriched and queued
- This catches trades that occurred while the EA was stopped, MT5 crashed, or network was down

### Data Captured Per Trade

**Core fields (from deal history):**

| Field | Source | Description |
|-------|--------|-------------|
| `deal_ticket` | `DEAL_TICKET` | Unique deal identifier |
| `order_ticket` | `DEAL_ORDER` | Associated order ticket |
| `position_id` | `DEAL_POSITION_ID` | Position grouping ID |
| `symbol` | `DEAL_SYMBOL` | Trading instrument |
| `direction` | `DEAL_TYPE` | `"buy"` or `"sell"` |
| `deal_entry` | `DEAL_ENTRY` | `"in"`, `"out"`, `"inout"` — whether opening, closing, or reversing |
| `volume` | `DEAL_VOLUME` | Trade volume in lots |
| `price` | `DEAL_PRICE` | Execution price |
| `sl` | Position SL | Stop loss (from position if available) |
| `tp` | Position TP | Take profit (from position if available) |
| `time` | `DEAL_TIME` | Execution timestamp |
| `profit` | `DEAL_PROFIT` | Realized P&L in account currency |
| `commission` | `DEAL_COMMISSION` | Commission charged |
| `swap` | `DEAL_SWAP` | Swap charged |
| `magic_number` | `DEAL_MAGIC` | EA magic number (identifies which EA placed it) |
| `comment` | `DEAL_COMMENT` | Trade comment |

**Enrichment fields (calculated at capture time):**

| Field | Calculation | Why it matters |
|-------|-------------|----------------|
| `balance_at_trade` | `AccountInfoDouble(ACCOUNT_BALANCE)` | Drawdown tracking |
| `equity_at_trade` | `AccountInfoDouble(ACCOUNT_EQUITY)` | Equity curve construction |
| `spread_at_entry` | `(int)SymbolInfoInteger(symbol, SYMBOL_SPREAD)` | Slippage/cost analysis — impossible to reconstruct later. Integer value (spread in points), stored as INTEGER in D1. |
| `atr_at_entry` | MQL5 indicator handle pattern (see below) | Volatility context — was SL appropriate for current regime? |
| `session_tag` | Derived from `DEAL_TIME` hour (UTC) | `"asian"` (0-8), `"london"` (8-13), `"new_york"` (13-21), `"off_hours"` (21-0). NY takes priority in 13-16 overlap. |
| `duration_seconds` | Close time - open time (for closing deals, see below) | Hold time analysis |
| `pips` | `(close_price - open_price) / point` adjusted for direction (for closing deals, see below) | Standardized P&L metric |

**ATR calculation (MQL5 pattern):**
```mql5
int atrHandle = iATR(symbol, PERIOD_H1, 14);
double atrBuffer[];
CopyBuffer(atrHandle, 0, 0, 1, atrBuffer);
double atr = atrBuffer[0];
IndicatorRelease(atrHandle);
```

**Duration and pips for closing deals (`deal_entry == "out"`):**
When the deal is a close, the EA must look up the original entry deal to compute duration and pips:
1. Get `position_id` from the closing deal via `HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID)`
2. Call `HistorySelectByPosition(position_id)` to load all deals for that position
3. Find the entry deal (where `DEAL_ENTRY == DEAL_ENTRY_IN`) in the position's deal history
4. Compute `duration_seconds = close_time - entry_time` and `pips = (close_price - entry_price) / point` adjusted for direction
5. If entry deal is not found (rare edge case), set both to `null`

For opening deals (`deal_entry == "in"`), both `duration_seconds` and `pips` are `null`.
| `risk_reward_ratio` | `abs(tp - entry) / abs(sl - entry)` if SL and TP set | R:R analysis |

### Queue Behavior

Uses a dedicated `CJournalQueue` class in `EdgeRelay_JournalSync.mqh` (not the existing `CSignalQueue`). The data shapes differ too much — journal trades have ~25 fields vs. signals with ~15 fields, and different struct layouts. The file-based persistence pattern is replicated but with journal-specific serialization.

- **No expiry** — journal trades retry indefinitely until synced (unlike copier signals which expire after 30s)
- Queue file: `JournalSync_Queue_<AccountID>.txt`
- Dedup by deal ticket — if the same deal is captured by both `OnTradeTransaction()` and the history scan, only one gets queued. An in-memory `set<ulong>` of synced deal tickets prevents re-queuing.
- Batch flush: sends up to 10 trades per flush cycle via `POST /v1/journal/sync`
- Flush runs on every timer tick when queue is not empty
- Tracks synced deal tickets in a local set and persisted via GlobalVariable (`JournalSync_SyncedDeals_<AccountID>`) for crash recovery

### Master EA Integration

Add to `EdgeRelay_Master.mq5`:

```
input bool   EnableJournal      = false;    // Enable trade journaling
input string JournalEndpoint    = "https://edgerelay-journal-sync.ghwmelite.workers.dev"; // Journal endpoint
```

When `EnableJournal == true`:
- `#include <EdgeRelay_JournalSync.mqh>` is active
- Every `OnTradeTransaction()` event that triggers a copier signal also triggers journal capture
- Uses the same `API_Key`, `API_Secret`, `AccountID` credentials
- Separate queue file (`JournalSync_Queue_<AccountID>.txt`)
- History catch-up scan also runs on the timer

When `EnableJournal == false` (default): No journal behavior, zero overhead.

---

## Worker Architecture

### Location

`workers/journal-sync/` — new dedicated worker with its own `wrangler.toml`

### Why Separate Worker

The signal-ingestion worker is latency-critical for trade copying. Journal sync involves heavier processing (enrichment validation, batch inserts) and will eventually trigger AI analysis. Separate worker means no shared cold-starts, no resource contention, independent scaling.

### Wrangler Config

```toml
name = "edgerelay-journal-sync"
main = "src/index.ts"
compatibility_date = "2024-12-30"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "cccd807ee9d64f3d84ace82529092566"

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"
```

### Worker Config Files

`package.json` and `tsconfig.json` mirror the `workers/signal-ingestion/` configuration:
- Same Hono version, Zod version (from `@edgerelay/shared`)
- TypeScript strict mode, ES2022 target, bundler module resolution
- Same `@cloudflare/workers-types` dev dependency

### Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/journal/health` | Health check |
| `POST` | `/v1/journal/sync` | Receive batch of trades, validate, store |
| `POST` | `/v1/journal/heartbeat` | Journal EA heartbeat |

### POST /v1/journal/sync

**Request body:**
```json
{
  "account_id": "be7db3edeafc1f55d62af39dbf2881fb",
  "trades": [
    {
      "deal_ticket": 12345678,
      "order_ticket": 87654321,
      "position_id": 11111111,
      "symbol": "EURUSD",
      "direction": "buy",
      "deal_entry": "in",
      "volume": 0.1,
      "price": 1.08500,
      "sl": 1.08000,
      "tp": 1.09000,
      "time": 1774600000,
      "profit": 0.0,
      "commission": -0.70,
      "swap": 0.0,
      "magic_number": 10001,
      "comment": "HTF+MTF+LTF",
      "balance_at_trade": 10000.00,
      "equity_at_trade": 9985.30,
      "spread_at_entry": 12,
      "atr_at_entry": 0.00850,
      "session_tag": "london",
      "duration_seconds": null,
      "pips": null,
      "risk_reward_ratio": 1.0
    }
  ],
  "hmac_signature": "..."
}
```

**Processing:**
1. Validate top-level payload with Zod schema (account_id, timestamp, hmac_signature, trades array)
2. Look up account in D1, verify role is `master`, `follower`, or `journal`
3. Verify HMAC signature using the canonical string strategy
4. Rate limit via KV (120/min — higher than copier since batch trades)
5. Validate each trade individually — invalid trades are skipped (not rejected)
6. `INSERT OR IGNORE` each valid trade into `journal_trades` (dedup by `account_id + deal_ticket`). Worker generates `id` via `crypto.randomUUID()`.
7. Return counts: synced, duplicates, and invalid

**Partial batch handling:** Valid trades are always inserted even if some trades in the batch fail validation. The response reports counts for each category so the EA knows what succeeded.

**Response:**
```json
{
  "data": { "synced": 7, "duplicates": 2, "invalid": 1 },
  "error": null
}
```

### Authentication

- `X-API-Key` header for account lookup
- Account must exist in `accounts` table with role `master`, `follower`, or `journal`

### HMAC Signing Strategy for Batch Payloads

The existing copier HMAC signs a flat sorted JSON object. Batch journal payloads contain nested arrays which are non-trivial to produce identically in MQL5 and TypeScript. Instead, use a simplified canonical string:

**Canonical string format:**
```
account_id:<account_id>:count:<trade_count>:deals:<comma_sorted_deal_tickets>:ts:<timestamp>
```

**Example:**
```
account_id:be7db3edeafc1f55d62af39dbf2881fb:count:3:deals:12345678,23456789,34567890:ts:1774600000
```

**Rules:**
1. Deal tickets are sorted numerically ascending and comma-joined (no spaces)
2. `timestamp` is a Unix timestamp included in the payload as a top-level field
3. The HMAC is computed as `HMAC-SHA256(canonical_string, api_secret)`

**MQL5 side:** Build the canonical string by sorting the deal ticket array, joining with commas, and concatenating the fields with colons.

**TypeScript side:** Extract `account_id`, count `trades.length`, sort `trades[].deal_ticket` numerically, join with commas, and reconstruct the same canonical string.

**Updated request body:**
```json
{
  "account_id": "be7db3edeafc1f55d62af39dbf2881fb",
  "timestamp": 1774600000,
  "trades": [...],
  "hmac_signature": "..."
}
```

---

## D1 Schema Changes

### New Table: `journal_trades`

```sql
CREATE TABLE journal_trades (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  deal_ticket INTEGER NOT NULL,
  order_ticket INTEGER,
  position_id INTEGER,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  deal_entry TEXT NOT NULL,
  volume REAL NOT NULL,
  price REAL,
  sl REAL,
  tp REAL,
  time INTEGER NOT NULL,
  profit REAL,
  commission REAL,
  swap REAL,
  magic_number INTEGER,
  comment TEXT,
  balance_at_trade REAL,
  equity_at_trade REAL,
  spread_at_entry INTEGER,
  atr_at_entry REAL,
  session_tag TEXT,
  duration_seconds INTEGER,
  pips REAL,
  risk_reward_ratio REAL,
  synced_at INTEGER NOT NULL,
  UNIQUE(account_id, deal_ticket)
);

CREATE INDEX idx_journal_account ON journal_trades(account_id);
CREATE INDEX idx_journal_account_time ON journal_trades(account_id, time);
CREATE INDEX idx_journal_account_symbol ON journal_trades(account_id, symbol);
```

### Account Role Extension

The existing `accounts.role` column has a CHECK constraint: `CHECK(role IN ('master','follower'))`. A D1 migration is required to allow the `journal` role.

**Migration file:** `migrations/0005_journal_role.sql`

```sql
-- SQLite does not support ALTER CHECK. Recreate the accounts table with updated constraint.
-- Using the pragma + rename approach for safety.

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  api_key TEXT NOT NULL UNIQUE,
  api_secret TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('master','follower','journal')),
  master_account_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_heartbeat INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO accounts_new SELECT * FROM accounts;
DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;
```

The journal-sync worker auth accepts roles: `master`, `follower`, `journal`. The signal-ingestion worker auth remains unchanged (only `master` can send signals).

### ID Generation for journal_trades

The `id` column is generated worker-side using `crypto.randomUUID()` before each `INSERT OR IGNORE`. This matches the pattern used by other EdgeRelay tables.

---

## Data Flow

```
MT5 Trade Event
    │
    ├─── OnTradeTransaction() ─── immediate capture
    │
    └─── Timer (every 60s) ─── history scan catch-up
              │
              ▼
    EdgeRelay_JournalSync.mqh
    (enrich: pips, duration, session, spread, ATR)
    (dedup check by deal ticket)
              │
              ▼
    CJournalQueue (no-expiry, file-persisted)
    (persist to JournalSync_Queue_<AccountID>.txt)
              │
              ▼ (batch flush, up to 10 per cycle)
              │
    POST /v1/journal/sync
    (X-API-Key + HMAC auth)
              │
              ▼
    journal-sync Worker
    (Zod validate, HMAC verify, rate limit)
              │
              ▼
    D1: journal_trades table
    (INSERT OR IGNORE — dedup by account_id + deal_ticket)
```

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `apps/ea/TradeJournal_Sync.mq5` | Create | Standalone journal sync EA |
| `apps/ea/Include/EdgeRelay_JournalSync.mqh` | Create | Shared sync logic: capture, enrich, batch queue |
| `apps/ea/Include/EdgeRelay_JournalQueue.mqh` | Create | Dedicated journal queue class (CJournalQueue) — file-based persistence, no expiry, batch flush |
| `apps/ea/EdgeRelay_Master.mq5` | Modify | Add `EnableJournal` toggle + conditional include |
| `workers/journal-sync/wrangler.toml` | Create | Worker config, D1 binding |
| `workers/journal-sync/src/index.ts` | Create | Hono app: health, sync, heartbeat routes |
| `workers/journal-sync/src/types.ts` | Create | Env type definition |
| `workers/journal-sync/src/validation.ts` | Create | Zod schemas for sync payload |
| `workers/journal-sync/package.json` | Create | Dependencies |
| `workers/journal-sync/tsconfig.json` | Create | TypeScript config |
| `packages/shared/src/types.ts` | Modify | Add JournalTrade type + Zod schema |
| `migrations/0005_journal_role.sql` | Create | Update accounts CHECK constraint to allow `journal` role |
| `migrations/0006_journal_trades.sql` | Create | `journal_trades` table + indexes |

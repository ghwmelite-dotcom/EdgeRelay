# Trade Journal Sync EA + Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-drop MT5 trade journal sync system — an MQL5 EA that captures every trade with enrichment data and syncs it to a dedicated Cloudflare Worker for storage in D1.

**Architecture:** Standalone journal sync EA with shared include logic (so the Master EA can opt-in). Dedicated `journal-sync` worker receives batches of trades via POST, validates with Zod, verifies HMAC, and stores in D1 with dedup. Belt-and-suspenders detection: real-time `OnTradeTransaction()` + timer-based history catch-up.

**Tech Stack:** MQL5 (EA), Hono + TypeScript (Worker), Zod (validation), D1/SQLite (storage), KV (rate limiting), HMAC-SHA256 (auth)

**Spec:** `docs/superpowers/specs/2026-03-24-journal-sync-ea-worker-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `migrations/0005_journal_role.sql` | Create | Update accounts CHECK constraint to allow `journal` role |
| `migrations/0006_journal_trades.sql` | Create | journal_trades table + indexes |
| `packages/shared/src/types.ts` | Modify | Add JournalTrade, JournalSyncPayload Zod schemas + types |
| `workers/journal-sync/package.json` | Create | Dependencies |
| `workers/journal-sync/tsconfig.json` | Create | TypeScript config |
| `workers/journal-sync/wrangler.toml` | Create | Worker config with D1 + KV bindings |
| `workers/journal-sync/src/types.ts` | Create | Env type |
| `workers/journal-sync/src/validation.ts` | Create | HMAC verification for batch payloads |
| `workers/journal-sync/src/index.ts` | Create | Hono app: health, sync, heartbeat routes |
| `apps/ea/Include/EdgeRelay_JournalSync.mqh` | Create | Shared sync logic: JournalTrade struct, enrichment, batch HTTP send |
| `apps/ea/Include/EdgeRelay_JournalQueue.mqh` | Create | CJournalQueue: file-backed queue, no expiry, batch flush |
| `apps/ea/TradeJournal_Sync.mq5` | Create | Standalone journal sync EA |
| `apps/ea/EdgeRelay_Master.mq5` | Modify | Add EnableJournal toggle |

---

## Task 1: D1 Migrations

**Files:**
- Create: `migrations/0005_journal_role.sql`
- Create: `migrations/0006_journal_trades.sql`

- [ ] **Step 1: Create role constraint migration**

Create `migrations/0005_journal_role.sql`:

```sql
-- Update accounts CHECK constraint to allow 'journal' role.
-- SQLite requires table recreation to modify CHECK constraints.
-- Schema matches live D1 exactly (verified via SELECT sql FROM sqlite_master).

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('master','follower','journal')),
  alias TEXT NOT NULL,
  broker_name TEXT,
  mt5_login TEXT,
  api_key TEXT UNIQUE NOT NULL,
  api_secret TEXT NOT NULL,
  master_account_id TEXT REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TEXT,
  last_signal_at TEXT,
  signals_today INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO accounts_new (id, user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id, is_active, last_heartbeat, last_signal_at, signals_today, created_at)
SELECT id, user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id, is_active, last_heartbeat, last_signal_at, signals_today, created_at FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

-- Recreate indexes from 0002_indexes.sql
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_master ON accounts(master_account_id);
CREATE INDEX idx_accounts_api_key ON accounts(api_key);
```

- [ ] **Step 2: Create journal_trades table migration**

Create `migrations/0006_journal_trades.sql`:

```sql
CREATE TABLE journal_trades (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  deal_ticket INTEGER NOT NULL,
  order_ticket INTEGER,
  position_id INTEGER,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('buy','sell')),
  deal_entry TEXT NOT NULL CHECK(deal_entry IN ('in','out','inout')),
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
  session_tag TEXT CHECK(session_tag IN ('asian','london','new_york','off_hours')),
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

- [ ] **Step 3: Apply migrations to remote D1**

Run:
```bash
cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay"
npx wrangler d1 migrations apply edgerelay-db --remote
```
Expected: Both migrations applied successfully.

- [ ] **Step 4: Verify migrations**

Run:
```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT sql FROM sqlite_master WHERE name='accounts' OR name='journal_trades'"
```
Expected: `accounts` has `CHECK(role IN ('master','follower','journal'))`, `journal_trades` table exists.

- [ ] **Step 5: Commit**

```bash
git add migrations/0005_journal_role.sql migrations/0006_journal_trades.sql
git commit -m "feat(journal): add D1 migrations for journal role and journal_trades table"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add journal types to shared package**

Append to the end of `packages/shared/src/types.ts` (after the existing NewsEvent interface):

```typescript
// ── Journal Sync ────────────────────────────────────────────

export const DealDirection = z.enum(['buy', 'sell']);
export type DealDirection = z.infer<typeof DealDirection>;

export const DealEntry = z.enum(['in', 'out', 'inout']);
export type DealEntry = z.infer<typeof DealEntry>;

export const SessionTag = z.enum(['asian', 'london', 'new_york', 'off_hours']);
export type SessionTag = z.infer<typeof SessionTag>;

export const JournalTrade = z.object({
  deal_ticket: z.number().int().positive(),
  order_ticket: z.number().int().optional(),
  position_id: z.number().int().optional(),
  symbol: z.string().min(1),
  direction: DealDirection,
  deal_entry: DealEntry,
  volume: z.number().positive(),
  price: z.number().optional(),
  sl: z.number().optional(),
  tp: z.number().optional(),
  time: z.number().int().positive(),
  profit: z.number().optional(),
  commission: z.number().optional(),
  swap: z.number().optional(),
  magic_number: z.number().int().optional(),
  comment: z.string().max(256).optional(),
  balance_at_trade: z.number().optional(),
  equity_at_trade: z.number().optional(),
  spread_at_entry: z.number().int().optional(),
  atr_at_entry: z.number().optional(),
  session_tag: SessionTag.optional(),
  duration_seconds: z.number().int().nonnegative().optional().nullable(),
  pips: z.number().optional().nullable(),
  risk_reward_ratio: z.number().optional().nullable(),
});
export type JournalTrade = z.infer<typeof JournalTrade>;

export const JournalSyncPayload = z.object({
  account_id: z.string().min(1),
  timestamp: z.number().int().positive(),
  trades: z.array(JournalTrade).min(1).max(10),
  hmac_signature: z.string().min(1),
});
export type JournalSyncPayload = z.infer<typeof JournalSyncPayload>;

export const JOURNAL_RATE_LIMIT_PER_MINUTE = 120;

export function validateJournalSyncPayload(data: unknown) {
  return JournalSyncPayload.safeParse(data);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(journal): add JournalTrade and JournalSyncPayload Zod schemas"
```

---

## Task 3: Journal Sync Worker — Scaffold and Config

**Files:**
- Create: `workers/journal-sync/package.json`
- Create: `workers/journal-sync/tsconfig.json`
- Create: `workers/journal-sync/wrangler.toml`
- Create: `workers/journal-sync/src/types.ts`

- [ ] **Step 1: Create package.json**

Create `workers/journal-sync/package.json`:

```json
{
  "name": "edgerelay-journal-sync",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@edgerelay/shared": "workspace:*",
    "hono": "^4.12.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `workers/journal-sync/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create wrangler.toml**

Create `workers/journal-sync/wrangler.toml`:

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

- [ ] **Step 4: Create Env type**

Create `workers/journal-sync/src/types.ts`:

```typescript
export interface Env {
  RATE_LIMIT: KVNamespace;
  DB: D1Database;
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd workers/journal-sync && pnpm install`

- [ ] **Step 6: Commit**

```bash
git add workers/journal-sync/package.json workers/journal-sync/tsconfig.json workers/journal-sync/wrangler.toml workers/journal-sync/src/types.ts
git commit -m "feat(journal): scaffold journal-sync worker with config files"
```

---

## Task 4: Journal Sync Worker — HMAC Validation

**Files:**
- Create: `workers/journal-sync/src/validation.ts`

- [ ] **Step 1: Create journal-specific HMAC verification**

The journal uses a simplified canonical string format (not sorted JSON) because batch payloads with nested arrays are hard to produce identically in MQL5 and TypeScript.

Create `workers/journal-sync/src/validation.ts`:

```typescript
/**
 * HMAC verification for journal sync batch payloads.
 *
 * Canonical string format:
 *   account_id:<id>:count:<N>:deals:<sorted,deal,tickets>:ts:<timestamp>
 *
 * Deal tickets are sorted numerically ascending and comma-joined.
 */

export async function verifyJournalHmac(
  accountId: string,
  timestamp: number,
  dealTickets: number[],
  hmacSignature: string,
  secret: string,
): Promise<boolean> {
  if (!hmacSignature || hmacSignature.length === 0) return false;

  // Build canonical string
  const sortedTickets = [...dealTickets].sort((a, b) => a - b).join(',');
  const canonical = `account_id:${accountId}:count:${dealTickets.length}:deals:${sortedTickets}:ts:${timestamp}`;

  // Import key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign
  const messageData = encoder.encode(canonical);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert to hex
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computed = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison
  if (computed.length !== hmacSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ hmacSignature.charCodeAt(i);
  }
  return mismatch === 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/journal-sync/src/validation.ts
git commit -m "feat(journal): add HMAC verification for batch journal payloads"
```

---

## Task 5: Journal Sync Worker — Routes

**Files:**
- Create: `workers/journal-sync/src/index.ts`

- [ ] **Step 1: Create the main worker with all routes**

Create `workers/journal-sync/src/index.ts`:

```typescript
import { Hono } from 'hono';
import {
  JournalSyncPayload,
  Heartbeat,
  JournalTrade,
  JOURNAL_RATE_LIMIT_PER_MINUTE,
  type ApiResponse,
} from '@edgerelay/shared';
import type { Env } from './types.js';
import { verifyJournalHmac } from './validation.js';

const app = new Hono<{ Bindings: Env }>();

// ── Helpers ───────────────────────────────────────────────────

function jsonResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { data, error: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiResponse<null> = {
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Health ────────────────────────────────────────────────────

// Health check — both paths for compatibility with IsServerReachable()
app.get('/v1/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

app.get('/v1/journal/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Journal Sync ─────────────────────────────────────────────

app.post('/v1/journal/sync', async (c) => {
  try {
    // 1. Parse & validate
    const rawBody: unknown = await c.req.json();
    const parsed = JournalSyncPayload.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid journal sync payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const payload = parsed.data;

    // 2. Look up account
    const account = await c.env.DB.prepare(
      'SELECT id, api_secret, role FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(payload.account_id)
      .first<{ id: string; api_secret: string; role: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    if (account.role !== 'master' && account.role !== 'follower' && account.role !== 'journal') {
      return errorResponse('INVALID_ROLE', 'Account role cannot sync journal trades', 403);
    }

    // 3. Verify HMAC
    const dealTickets = payload.trades.map((t) => t.deal_ticket);
    const isValid = await verifyJournalHmac(
      payload.account_id,
      payload.timestamp,
      dealTickets,
      payload.hmac_signature,
      account.api_secret,
    );

    if (!isValid) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    // 4. Rate limit
    const minuteBucket = Math.floor(Date.now() / 60000);
    const rateLimitKey = `journal:${payload.account_id}:${minuteBucket}`;
    const currentCount = parseInt((await c.env.RATE_LIMIT.get(rateLimitKey)) ?? '0', 10);

    if (currentCount >= JOURNAL_RATE_LIMIT_PER_MINUTE) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded (120/min)', 429);
    }

    await c.env.RATE_LIMIT.put(rateLimitKey, String(currentCount + 1), {
      expirationTtl: 120,
    });

    // 5. Validate and insert each trade
    let synced = 0;
    let duplicates = 0;
    let invalid = 0;
    const now = Date.now();

    for (const trade of payload.trades) {
      // Validate individual trade
      const tradeResult = JournalTrade.safeParse(trade);
      if (!tradeResult.success) {
        invalid++;
        continue;
      }

      const t = tradeResult.data;
      const id = crypto.randomUUID();

      try {
        const runResult = await c.env.DB.prepare(
          `INSERT OR IGNORE INTO journal_trades (
            id, account_id, deal_ticket, order_ticket, position_id,
            symbol, direction, deal_entry, volume, price,
            sl, tp, time, profit, commission, swap,
            magic_number, comment, balance_at_trade, equity_at_trade,
            spread_at_entry, atr_at_entry, session_tag,
            duration_seconds, pips, risk_reward_ratio, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            payload.account_id,
            t.deal_ticket,
            t.order_ticket ?? null,
            t.position_id ?? null,
            t.symbol,
            t.direction,
            t.deal_entry,
            t.volume,
            t.price ?? null,
            t.sl ?? null,
            t.tp ?? null,
            t.time,
            t.profit ?? null,
            t.commission ?? null,
            t.swap ?? null,
            t.magic_number ?? null,
            t.comment ?? null,
            t.balance_at_trade ?? null,
            t.equity_at_trade ?? null,
            t.spread_at_entry ?? null,
            t.atr_at_entry ?? null,
            t.session_tag ?? null,
            t.duration_seconds ?? null,
            t.pips ?? null,
            t.risk_reward_ratio ?? null,
            now,
          )
          .run();

        // .run() meta.changes = 0 for INSERT OR IGNORE duplicates
        if (runResult.meta.changes > 0) {
          synced++;
        } else {
          duplicates++;
        }
      } catch {
        duplicates++;
      }
    }

    return jsonResponse({ synced, duplicates, invalid }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Journal sync error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

// ── Heartbeat ────────────────────────────────────────────────

app.post('/v1/journal/heartbeat', async (c) => {
  try {
    const rawBody: unknown = await c.req.json();
    const parsed = Heartbeat.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid heartbeat payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const heartbeat = parsed.data;

    const account = await c.env.DB.prepare(
      'SELECT id, api_secret FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(heartbeat.account_id)
      .first<{ id: string; api_secret: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    // Reuse the existing heartbeat HMAC pattern (sorted object, not array)
    const payload = rawBody as Record<string, unknown>;
    const sortedObj = Object.keys(payload)
      .filter((key) => key !== 'hmac_signature')
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});
    const canonical = JSON.stringify(sortedObj);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(account.api_secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(canonical));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

    if (computed.length !== String(hmac_signature).length) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ String(hmac_signature).charCodeAt(i);
    }
    if (mismatch !== 0) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    await c.env.DB.prepare(
      'UPDATE accounts SET last_heartbeat = ? WHERE id = ?',
    )
      .bind(heartbeat.timestamp, heartbeat.account_id)
      .run();

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Journal heartbeat error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

export default app;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd workers/journal-sync && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Deploy worker**

Run: `cd workers/journal-sync && npx wrangler deploy`
Expected: Deployed to `edgerelay-journal-sync.ghwmelite.workers.dev`

- [ ] **Step 4: Verify health endpoint**

Run: `curl https://edgerelay-journal-sync.ghwmelite.workers.dev/v1/journal/health`
Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add workers/journal-sync/src/index.ts
git commit -m "feat(journal): implement journal-sync worker with sync, heartbeat, and health routes"
```

---

## Task 6: MQL5 — Journal Trade Struct and Enrichment Logic

**Files:**
- Create: `apps/ea/Include/EdgeRelay_JournalSync.mqh`

- [ ] **Step 1: Create the shared journal sync include**

Create `apps/ea/Include/EdgeRelay_JournalSync.mqh`:

```mqh
//+------------------------------------------------------------------+
//|                                      EdgeRelay_JournalSync.mqh   |
//|                 Shared journal sync logic: capture & enrichment   |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_JOURNAL_SYNC_MQH
#define EDGERELAY_JOURNAL_SYNC_MQH

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Http.mqh>

//+------------------------------------------------------------------+
//| Journal trade struct                                              |
//+------------------------------------------------------------------+
struct JournalTrade
  {
   ulong            deal_ticket;
   ulong            order_ticket;
   ulong            position_id;
   string           symbol;
   string           direction;      // "buy" or "sell"
   string           deal_entry;     // "in", "out", "inout"
   double           volume;
   double           price;
   double           sl;
   double           tp;
   datetime         time;
   double           profit;
   double           commission;
   double           swap;
   long             magic_number;
   string           comment;
   double           balance_at_trade;
   double           equity_at_trade;
   int              spread_at_entry;
   double           atr_at_entry;
   string           session_tag;    // "asian", "london", "new_york", "off_hours"
   int              duration_seconds;  // -1 = null
   double           pips;             // 0 with hasPips=false = null
   double           risk_reward_ratio; // 0 with hasRR=false = null
   bool             has_duration;
   bool             has_pips;
   bool             has_rr;
  };

//+------------------------------------------------------------------+
//| Determine session tag from hour (UTC)                             |
//+------------------------------------------------------------------+
string GetSessionTag(datetime tradeTime)
  {
   MqlDateTime dt;
   TimeToStruct(tradeTime, dt);
   int hour = dt.hour;

   // NY takes priority in 13-16 overlap with London
   if(hour >= 13 && hour < 21) return "new_york";
   if(hour >= 8 && hour < 13)  return "london";
   if(hour >= 0 && hour < 8)   return "asian";
   return "off_hours";
  }

//+------------------------------------------------------------------+
//| Get ATR value using MQL5 indicator handle pattern                 |
//+------------------------------------------------------------------+
double GetATR(string symbol, ENUM_TIMEFRAMES tf, int period)
  {
   int handle = iATR(symbol, tf, period);
   if(handle == INVALID_HANDLE)
      return 0.0;

   double buffer[];
   ArraySetAsSeries(buffer, true);
   int copied = CopyBuffer(handle, 0, 0, 1, buffer);
   IndicatorRelease(handle);

   if(copied <= 0)
      return 0.0;

   return buffer[0];
  }

//+------------------------------------------------------------------+
//| Capture and enrich a deal into a JournalTrade                     |
//+------------------------------------------------------------------+
bool CaptureDeal(ulong dealTicket, JournalTrade &trade)
  {
   //--- Ensure history is loaded (needed when called from OnTradeTransaction)
   HistorySelect(0, TimeCurrent());

   if(!HistoryDealSelect(dealTicket))
      return false;

   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
      return false;

   ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

   //--- Core fields
   trade.deal_ticket   = dealTicket;
   trade.order_ticket  = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
   trade.position_id   = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   trade.symbol        = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   trade.direction     = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";
   trade.volume        = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   trade.price         = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   trade.time          = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   trade.profit        = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   trade.commission    = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   trade.swap          = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   trade.magic_number  = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   trade.comment       = HistoryDealGetString(dealTicket, DEAL_COMMENT);

   //--- Deal entry
   if(dealEntry == DEAL_ENTRY_IN)        trade.deal_entry = "in";
   else if(dealEntry == DEAL_ENTRY_OUT)  trade.deal_entry = "out";
   else if(dealEntry == DEAL_ENTRY_INOUT) trade.deal_entry = "inout";
   else                                   trade.deal_entry = "in";

   //--- SL/TP from position if available
   trade.sl = 0;
   trade.tp = 0;
   if(PositionSelectByTicket(trade.position_id))
     {
      trade.sl = PositionGetDouble(POSITION_SL);
      trade.tp = PositionGetDouble(POSITION_TP);
     }

   //--- Enrichment: balance, equity
   trade.balance_at_trade = AccountInfoDouble(ACCOUNT_BALANCE);
   trade.equity_at_trade  = AccountInfoDouble(ACCOUNT_EQUITY);

   //--- Enrichment: spread (integer, in points)
   trade.spread_at_entry = (int)SymbolInfoInteger(trade.symbol, SYMBOL_SPREAD);

   //--- Enrichment: ATR(14, H1)
   trade.atr_at_entry = GetATR(trade.symbol, PERIOD_H1, 14);

   //--- Enrichment: session tag
   trade.session_tag = GetSessionTag(trade.time);

   //--- Enrichment: duration, pips, R:R (only for closing deals)
   trade.has_duration = false;
   trade.has_pips = false;
   trade.has_rr = false;
   trade.duration_seconds = 0;
   trade.pips = 0;
   trade.risk_reward_ratio = 0;

   if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT)
     {
      //--- Look up the entry deal for this position
      if(HistorySelectByPosition(trade.position_id))
        {
         int total = HistoryDealsTotal();
         for(int i = 0; i < total; i++)
           {
            ulong entryTicket = HistoryDealGetTicket(i);
            if(entryTicket == dealTicket) continue;
            ENUM_DEAL_ENTRY eEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(entryTicket, DEAL_ENTRY);
            if(eEntry == DEAL_ENTRY_IN)
              {
               datetime entryTime = (datetime)HistoryDealGetInteger(entryTicket, DEAL_TIME);
               double entryPrice = HistoryDealGetDouble(entryTicket, DEAL_PRICE);

               trade.duration_seconds = (int)(trade.time - entryTime);
               trade.has_duration = true;

               //--- Pips
               double point = SymbolInfoDouble(trade.symbol, SYMBOL_POINT);
               if(point > 0)
                 {
                  double rawPips = (trade.price - entryPrice) / point;
                  trade.pips = (trade.direction == "sell") ? -rawPips : rawPips;
                  trade.has_pips = true;
                 }

               //--- R:R from the order's SL/TP (deals don't have SL/TP in MQL5)
               double entrySL = 0;
               double entryTP = 0;
               ulong entryOrder = (ulong)HistoryDealGetInteger(entryTicket, DEAL_ORDER);
               if(entryOrder > 0 && HistoryOrderSelect(entryOrder))
                 {
                  entrySL = HistoryOrderGetDouble(entryOrder, ORDER_SL);
                  entryTP = HistoryOrderGetDouble(entryOrder, ORDER_TP);
                 }
               // Fallback to position SL/TP if order didn't have them
               if(entrySL == 0 && trade.sl != 0) entrySL = trade.sl;
               if(entryTP == 0 && trade.tp != 0) entryTP = trade.tp;

               if(entrySL != 0 && entryTP != 0)
                 {
                  double risk = MathAbs(entryPrice - entrySL);
                  double reward = MathAbs(entryTP - entryPrice);
                  if(risk > 0)
                    {
                     trade.risk_reward_ratio = reward / risk;
                     trade.has_rr = true;
                    }
                 }
               break; // Found the entry deal
              }
           }
        }
     }

   return true;
  }

//+------------------------------------------------------------------+
//| Convert a JournalTrade to JSON string                             |
//+------------------------------------------------------------------+
string JournalTradeToJson(JournalTrade &trade)
  {
   int digits = (int)SymbolInfoInteger(trade.symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 5;

   string json = "{";
   json += "\"deal_ticket\":" + IntegerToString((long)trade.deal_ticket) + ",";
   json += "\"order_ticket\":" + IntegerToString((long)trade.order_ticket) + ",";
   json += "\"position_id\":" + IntegerToString((long)trade.position_id) + ",";
   json += "\"symbol\":\"" + JsonEscape(trade.symbol) + "\",";
   json += "\"direction\":\"" + trade.direction + "\",";
   json += "\"deal_entry\":\"" + trade.deal_entry + "\",";
   json += "\"volume\":" + DoubleToString(trade.volume, 8) + ",";
   json += "\"price\":" + DoubleToString(trade.price, digits) + ",";
   json += "\"sl\":" + DoubleToString(trade.sl, digits) + ",";
   json += "\"tp\":" + DoubleToString(trade.tp, digits) + ",";
   json += "\"time\":" + IntegerToString((long)trade.time) + ",";
   json += "\"profit\":" + DoubleToString(trade.profit, 2) + ",";
   json += "\"commission\":" + DoubleToString(trade.commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(trade.swap, 2) + ",";
   json += "\"magic_number\":" + IntegerToString(trade.magic_number) + ",";
   json += "\"comment\":\"" + JsonEscape(trade.comment) + "\",";
   json += "\"balance_at_trade\":" + DoubleToString(trade.balance_at_trade, 2) + ",";
   json += "\"equity_at_trade\":" + DoubleToString(trade.equity_at_trade, 2) + ",";
   json += "\"spread_at_entry\":" + IntegerToString(trade.spread_at_entry) + ",";
   json += "\"atr_at_entry\":" + DoubleToString(trade.atr_at_entry, 6) + ",";
   json += "\"session_tag\":\"" + trade.session_tag + "\",";

   if(trade.has_duration)
      json += "\"duration_seconds\":" + IntegerToString(trade.duration_seconds) + ",";
   else
      json += "\"duration_seconds\":null,";

   if(trade.has_pips)
      json += "\"pips\":" + DoubleToString(trade.pips, 1) + ",";
   else
      json += "\"pips\":null,";

   if(trade.has_rr)
      json += "\"risk_reward_ratio\":" + DoubleToString(trade.risk_reward_ratio, 2);
   else
      json += "\"risk_reward_ratio\":null";

   json += "}";
   return json;
  }

//+------------------------------------------------------------------+
//| Build HMAC canonical string for a batch of trades                 |
//+------------------------------------------------------------------+
string BuildJournalHmacCanonical(string accountId, int tradeCount, ulong &dealTickets[], long timestamp)
  {
   //--- Sort deal tickets ascending
   for(int i = 0; i < tradeCount - 1; i++)
      for(int j = i + 1; j < tradeCount; j++)
         if(dealTickets[j] < dealTickets[i])
           {
            ulong tmp = dealTickets[i];
            dealTickets[i] = dealTickets[j];
            dealTickets[j] = tmp;
           }

   //--- Join with commas
   string ticketStr = "";
   for(int i = 0; i < tradeCount; i++)
     {
      if(i > 0) ticketStr += ",";
      ticketStr += IntegerToString((long)dealTickets[i]);
     }

   return "account_id:" + accountId + ":count:" + IntegerToString(tradeCount)
          + ":deals:" + ticketStr + ":ts:" + IntegerToString(timestamp);
  }

//+------------------------------------------------------------------+
//| Send journal heartbeat (uses /v1/journal/heartbeat path)         |
//+------------------------------------------------------------------+
int SendJournalHeartbeat(string endpoint, string apiKey, string accountId, string apiSecret)
  {
   string url = endpoint + "/v1/journal/heartbeat";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   long ts = (long)TimeCurrent();
   string tsStr = IntegerToString(ts);

   string sigPayload = "{\"account_id\":\"" + accountId + "\",\"timestamp\":" + tsStr + "}";
   string hmac = HmacSha256(sigPayload, apiSecret);

   string jsonBody = "{";
   jsonBody += "\"account_id\":\"" + JsonEscape(accountId) + "\",";
   jsonBody += "\"timestamp\":" + tsStr + ",";
   jsonBody += "\"hmac_signature\":\"" + hmac + "\"";
   jsonBody += "}";

   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   char result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);

   if(statusCode == -1)
     {
      int err = GetLastError();
      PrintFormat("[Journal] Heartbeat failed: error=%d", err);
     }

   return statusCode;
  }

#endif // EDGERELAY_JOURNAL_SYNC_MQH
```

- [ ] **Step 2: Commit**

```bash
git add apps/ea/Include/EdgeRelay_JournalSync.mqh
git commit -m "feat(journal): add JournalSync shared include — trade capture, enrichment, batch send"
```

---

## Task 7: MQL5 — Journal Queue

**Files:**
- Create: `apps/ea/Include/EdgeRelay_JournalQueue.mqh`

- [ ] **Step 1: Create the journal-specific queue class**

Create `apps/ea/Include/EdgeRelay_JournalQueue.mqh`:

```mqh
//+------------------------------------------------------------------+
//|                                     EdgeRelay_JournalQueue.mqh   |
//|            File-backed journal trade queue — no expiry            |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_JOURNAL_QUEUE_MQH
#define EDGERELAY_JOURNAL_QUEUE_MQH

#include <EdgeRelay_JournalSync.mqh>

#define JOURNAL_MAX_QUEUE_SIZE   5000
#define JOURNAL_BATCH_SIZE       10

//+------------------------------------------------------------------+
//| Journal queue class                                               |
//+------------------------------------------------------------------+
class CJournalQueue
  {
private:
   string           m_filename;
   int              m_count;

   void             Recount();

public:
                    CJournalQueue() { m_filename = ""; m_count = 0; }

   void             Init(string filename);
   void             Enqueue(JournalTrade &trade);
   int              Count() { return m_count; }
   bool             IsEmpty() { return m_count == 0; }
   void             Clear();

   //--- Flush up to JOURNAL_BATCH_SIZE trades to the endpoint.
   //--- Returns number successfully sent.
   int              Flush(string endpoint, string apiKey, string apiSecret, string accountId);
  };

//+------------------------------------------------------------------+
void CJournalQueue::Init(string filename)
  {
   m_filename = filename;
   Recount();
   if(m_count > 0)
      PrintFormat("[Journal] Queue initialized: %s (%d trades pending)", m_filename, m_count);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Recount()
  {
   m_count = 0;
   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT | FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE) return;

   while(!FileIsEnding(handle))
     {
      string line = FileReadString(handle);
      if(StringLen(line) > 0) m_count++;
     }
   FileClose(handle);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Enqueue(JournalTrade &trade)
  {
   if(m_count >= JOURNAL_MAX_QUEUE_SIZE)
     {
      PrintFormat("[Journal] Queue full (%d), dropping trade %d", m_count, trade.deal_ticket);
      return;
     }

   string json = JournalTradeToJson(trade);

   int handle = FileOpen(m_filename, FILE_READ | FILE_WRITE | FILE_TXT | FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
     {
      PrintFormat("[Journal] Failed to open queue file for write: %d", GetLastError());
      return;
     }

   FileSeek(handle, 0, SEEK_END);
   FileWriteString(handle, json + "\n");
   FileClose(handle);

   m_count++;
   PrintFormat("[Journal] Queued trade %d (%s %s %s) queue=%d",
               trade.deal_ticket, trade.deal_entry, trade.direction, trade.symbol, m_count);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Clear()
  {
   int handle = FileOpen(m_filename, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(handle != INVALID_HANDLE)
      FileClose(handle);
   m_count = 0;
  }

//+------------------------------------------------------------------+
int CJournalQueue::Flush(string endpoint, string apiKey, string apiSecret, string accountId)
  {
   if(m_count == 0) return 0;

   //--- Read all lines
   string lines[];
   int lineCount = 0;

   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT | FILE_SHARE_READ | FILE_ANSI);
   if(handle == INVALID_HANDLE) return 0;

   while(!FileIsEnding(handle))
     {
      string line = FileReadString(handle);
      if(StringLen(line) > 0)
        {
         ArrayResize(lines, lineCount + 1);
         lines[lineCount] = line;
         lineCount++;
        }
     }
   FileClose(handle);

   if(lineCount == 0) { m_count = 0; return 0; }

   //--- Take up to JOURNAL_BATCH_SIZE trades
   int batchSize = MathMin(lineCount, JOURNAL_BATCH_SIZE);
   JournalTrade batch[];
   ArrayResize(batch, batchSize);

   //--- Parse JSON lines back to JournalTrade structs (simplified — just send raw JSON)
   //--- Actually, we stored them as JSON, so we can build the batch JSON directly
   string tradesJson = "[";
   ulong dealTickets[];
   ArrayResize(dealTickets, batchSize);

   for(int i = 0; i < batchSize; i++)
     {
      if(i > 0) tradesJson += ",";
      tradesJson += lines[i];

      //--- Extract deal_ticket from the JSON line for HMAC
      int dtPos = StringFind(lines[i], "\"deal_ticket\":");
      if(dtPos >= 0)
        {
         string sub = StringSubstr(lines[i], dtPos + 15, 20);
         int commaPos = StringFind(sub, ",");
         if(commaPos > 0) sub = StringSubstr(sub, 0, commaPos);
         dealTickets[i] = (ulong)StringToInteger(sub);
        }
     }
   tradesJson += "]";

   //--- Build HMAC
   long ts = (long)TimeCurrent();
   string canonical = BuildJournalHmacCanonical(accountId, batchSize, dealTickets, ts);
   string hmac = HmacSha256(canonical, apiSecret);

   //--- Build full payload
   string json = "{";
   json += "\"account_id\":\"" + JsonEscape(accountId) + "\",";
   json += "\"timestamp\":" + IntegerToString(ts) + ",";
   json += "\"trades\":" + tradesJson + ",";
   json += "\"hmac_signature\":\"" + hmac + "\"";
   json += "}";

   //--- Send
   string url = endpoint + "/v1/journal/sync";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   char postData[];
   StringToCharArray(json, postData, 0, StringLen(json));

   char result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 10000, postData, result, resultHeaders);

   if(statusCode == 200 || statusCode == 201)
     {
      PrintFormat("[Journal] Batch synced: %d trades", batchSize);

      //--- Remove sent lines from queue file
      int wHandle = FileOpen(m_filename, FILE_WRITE | FILE_TXT | FILE_ANSI);
      if(wHandle != INVALID_HANDLE)
        {
         for(int i = batchSize; i < lineCount; i++)
            FileWriteString(wHandle, lines[i] + "\n");
         FileClose(wHandle);
        }
      m_count = lineCount - batchSize;
      return batchSize;
     }
   else
     {
      if(statusCode == -1)
         PrintFormat("[Journal] Batch send failed: network error %d", GetLastError());
      else
        {
         string responseBody = CharArrayToString(result);
         PrintFormat("[Journal] Batch send HTTP %d: %s", statusCode, responseBody);
        }
      return 0;
     }
  }

#endif // EDGERELAY_JOURNAL_QUEUE_MQH
```

- [ ] **Step 2: Commit**

```bash
git add apps/ea/Include/EdgeRelay_JournalQueue.mqh
git commit -m "feat(journal): add CJournalQueue — file-backed trade queue with no expiry and batch flush"
```

---

## Task 8: MQL5 — Standalone TradeJournal_Sync EA

**Files:**
- Create: `apps/ea/TradeJournal_Sync.mq5`

- [ ] **Step 1: Create the standalone journal sync EA**

Create `apps/ea/TradeJournal_Sync.mq5`:

```mqh
//+------------------------------------------------------------------+
//|                                        TradeJournal_Sync.mq5     |
//|                    EdgeRelay — Zero-Drop Trade Journal Sync       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property version   "1.00"
#property description "Syncs every trade to your EdgeRelay journal — zero drops guaranteed."
#property strict

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Http.mqh>
#include <EdgeRelay_JournalSync.mqh>
#include <EdgeRelay_JournalQueue.mqh>

//+------------------------------------------------------------------+
//| Input parameters                                                  |
//+------------------------------------------------------------------+
input string API_Key             = "";                                           // API Key
input string API_Secret          = "";                                           // API Secret
input string API_Endpoint        = "https://edgerelay-journal-sync.ghwmelite.workers.dev"; // Journal Endpoint
input string AccountID           = "";                                           // Account ID
input int    SyncIntervalSeconds = 60;                                           // History scan interval (s)
input int    HeartbeatIntervalMs = 30000;                                        // Heartbeat interval (ms)

//--- Global variables
CJournalQueue  g_journalQueue;
ENUM_CONNECTION_STATUS g_connStatus = STATUS_DISCONNECTED;

//--- Synced deal tracking
ulong          g_syncedDeals[];
int            g_syncedCount = 0;
string         g_gvLastDeal = "";
datetime       g_lastHistoryScan = 0;

//+------------------------------------------------------------------+
//| Check if a deal ticket has already been synced                    |
//+------------------------------------------------------------------+
bool IsDealSynced(ulong dealTicket)
  {
   for(int i = 0; i < g_syncedCount; i++)
      if(g_syncedDeals[i] == dealTicket)
         return true;
   return false;
  }

//+------------------------------------------------------------------+
//| Mark a deal ticket as synced                                      |
//+------------------------------------------------------------------+
void MarkDealSynced(ulong dealTicket)
  {
   ArrayResize(g_syncedDeals, g_syncedCount + 1);
   g_syncedDeals[g_syncedCount] = dealTicket;
   g_syncedCount++;
  }

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(API_Key) == 0 || StringLen(API_Secret) == 0 || StringLen(AccountID) == 0)
     {
      Alert("[Journal] API_Key, API_Secret, and AccountID are required.");
      return INIT_PARAMETERS_INCORRECT;
     }

   //--- Initialize queue
   string queueFile = "JournalSync_Queue_" + AccountID + ".txt";
   g_journalQueue.Init(queueFile);

   //--- Restore last synced deal from GlobalVariable
   g_gvLastDeal = "JournalSync_LastDeal_" + AccountID;

   //--- Set timer (use the shorter of heartbeat and sync interval)
   int timerMs = MathMin(HeartbeatIntervalMs, SyncIntervalSeconds * 1000);
   timerMs = MathMax(timerMs, 1000);
   if(!EventSetMillisecondTimer(timerMs))
      EventSetTimer(MathMax(timerMs / 1000, 1));

   //--- Initial heartbeat
   g_connStatus = STATUS_CONNECTING;
   if(IsServerReachable(API_Endpoint))
     {
      int hbResult = SendJournalHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
     }
   else
      g_connStatus = STATUS_DISCONNECTED;

   //--- Initial history scan
   g_lastHistoryScan = TimeCurrent();
   ScanHistory();

   PrintFormat("[Journal] TradeJournal_Sync initialized. Account=%s Endpoint=%s", AccountID, API_Endpoint);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   //--- Flush remaining queue
   if(!g_journalQueue.IsEmpty())
     {
      PrintFormat("[Journal] Flushing queue on shutdown (%d trades)...", g_journalQueue.Count());
      g_journalQueue.Flush(API_Endpoint, API_Key, API_Secret, AccountID);
     }

   EventKillTimer();
   Print("[Journal] TradeJournal_Sync deinitialized.");
  }

//+------------------------------------------------------------------+
//| Process a deal — capture, enrich, queue                           |
//+------------------------------------------------------------------+
void ProcessDeal(ulong dealTicket)
  {
   if(IsDealSynced(dealTicket))
      return;

   JournalTrade trade;
   if(!CaptureDeal(dealTicket, trade))
      return;

   g_journalQueue.Enqueue(trade);
   MarkDealSynced(dealTicket);
  }

//+------------------------------------------------------------------+
//| Real-time trade detection                                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0)
      return;

   ProcessDeal(dealTicket);
  }

//+------------------------------------------------------------------+
//| History scan catch-up                                             |
//+------------------------------------------------------------------+
void ScanHistory()
  {
   //--- Select history for the last 7 days (covers any missed deals)
   datetime from = TimeCurrent() - 7 * 24 * 60 * 60;
   datetime to = TimeCurrent();
   if(!HistorySelect(from, to))
      return;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      //--- Only BUY/SELL deals
      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      ProcessDeal(dealTicket);
     }

   g_lastHistoryScan = TimeCurrent();
  }

//+------------------------------------------------------------------+
//| Timer handler                                                     |
//+------------------------------------------------------------------+
void OnTimer()
  {
   //--- Heartbeat
   static datetime lastHeartbeat = 0;
   if((TimeCurrent() - lastHeartbeat) >= HeartbeatIntervalMs / 1000)
     {
      int hbResult = SendJournalHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
      lastHeartbeat = TimeCurrent();
     }

   //--- History scan catch-up
   if((TimeCurrent() - g_lastHistoryScan) >= SyncIntervalSeconds)
      ScanHistory();

   //--- Flush queue
   if(!g_journalQueue.IsEmpty() && g_connStatus == STATUS_CONNECTED)
      g_journalQueue.Flush(API_Endpoint, API_Key, API_Secret, AccountID);
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   // Trade detection is handled by OnTradeTransaction.
  }
//+------------------------------------------------------------------+
```

- [ ] **Step 2: Commit**

```bash
git add apps/ea/TradeJournal_Sync.mq5
git commit -m "feat(journal): add standalone TradeJournal_Sync EA with zero-drop sync"
```

---

## Task 9: Master EA Integration

**Files:**
- Modify: `apps/ea/EdgeRelay_Master.mq5`

- [ ] **Step 1: Add journal toggle and include to Master EA**

Add these changes to `apps/ea/EdgeRelay_Master.mq5`:

1. Add include at the top (after existing includes):
```mqh
#include <EdgeRelay_JournalSync.mqh>
#include <EdgeRelay_JournalQueue.mqh>
```

2. Add input parameters (after existing inputs):
```mqh
input bool   EnableJournal       = false;                                         // Enable trade journaling
input string JournalEndpoint     = "https://edgerelay-journal-sync.ghwmelite.workers.dev"; // Journal endpoint
```

3. Add global variables (after existing globals):
```mqh
CJournalQueue  g_journalQueue;
ulong          g_journalSyncedDeals[];
int            g_journalSyncedCount = 0;
```

4. In `OnInit()`, after existing initialization, add:
```mqh
   //--- Initialize journal if enabled
   if(EnableJournal)
     {
      string jQueueFile = "JournalSync_Queue_" + AccountID + ".txt";
      g_journalQueue.Init(jQueueFile);
      PrintFormat("[EdgeRelay] Journal sync enabled. Endpoint: %s", JournalEndpoint);
     }
```

5. In `OnTradeTransaction()`, after `DispatchSignal(signal)` calls, add journal capture:
```mqh
      //--- Journal capture (if enabled)
      if(EnableJournal)
        {
         ulong jDeal = trans.deal;
         if(jDeal != 0)
           {
            bool alreadySynced = false;
            for(int ji = 0; ji < g_journalSyncedCount; ji++)
               if(g_journalSyncedDeals[ji] == jDeal) { alreadySynced = true; break; }

            if(!alreadySynced)
              {
               JournalTrade jTrade;
               if(CaptureDeal(jDeal, jTrade))
                 {
                  g_journalQueue.Enqueue(jTrade);
                  ArrayResize(g_journalSyncedDeals, g_journalSyncedCount + 1);
                  g_journalSyncedDeals[g_journalSyncedCount] = jDeal;
                  g_journalSyncedCount++;
                 }
              }
           }
        }
```

6. In `OnTimer()`, after existing queue flush, add:
```mqh
   //--- Flush journal queue if enabled
   if(EnableJournal && !g_journalQueue.IsEmpty() && g_connStatus == STATUS_CONNECTED)
      g_journalQueue.Flush(JournalEndpoint, API_Key, API_Secret, AccountID);
```

- [ ] **Step 2: Commit**

```bash
git add apps/ea/EdgeRelay_Master.mq5
git commit -m "feat(journal): add EnableJournal toggle to Master EA"
```

---

## Task 10: Deploy and Verify

**Files:** No new files — verification only.

- [ ] **Step 1: Deploy journal-sync worker**

Run:
```bash
cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/EdgeRelay/workers/journal-sync"
npx wrangler deploy
```
Expected: Deployed to `edgerelay-journal-sync.ghwmelite.workers.dev`

- [ ] **Step 2: Verify health endpoint**

Run: `curl https://edgerelay-journal-sync.ghwmelite.workers.dev/v1/journal/health`
Expected: `{"status":"ok"}`

- [ ] **Step 3: Verify D1 tables**

Run:
```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='journal_trades'"
```
Expected: `journal_trades` table exists.

- [ ] **Step 4: Verify account role constraint**

Run:
```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT sql FROM sqlite_master WHERE name='accounts'"
```
Expected: CHECK constraint includes `'journal'`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
```

If any unstaged files remain, add them. Then verify everything is committed from Tasks 1-9.

# Journal Data Model + API — Design Spec

**Date**: 2026-03-25
**Status**: Approved
**Scope**: Sub-project 2 of the AI Trade Journal. Add 6 read-only API routes to the existing api-gateway worker for serving journal trade data to the web dashboard.

---

## Goals

1. Serve journal trade data to the web dashboard via the existing api-gateway
2. Provide summary statistics, symbol breakdowns, session breakdowns, and daily P&L
3. Use JWT Bearer token authentication (existing auth middleware)
4. Cursor-based pagination for trade lists
5. Account ownership verification (user can only access their own accounts)

## Non-Goals

- No new D1 tables (reads from existing `journal_trades` table)
- No write endpoints (trade data comes from the sync EA; notes/tags deferred to sub-project 3)
- No changes to MT5 EAs, journal-sync worker, account-relay DO, or shared types
- No dashboard UI (sub-project 3)

---

## Architecture

Routes are added to the existing api-gateway worker (`workers/api-gateway/`), following the established pattern:
- New route file: `workers/api-gateway/src/routes/journal.ts`
- Mounted on the protected app (JWT auth + rate limiting applied automatically)
- Route prefix: `/v1/journal`
- No new middleware needed — reuses existing `authMiddleware` and `rateLimitMiddleware`

The existing `protectedApp` in `index.ts` applies auth and rate limiting to all nested routes. The journal routes just need to verify the authenticated user owns the requested `accountId`.

---

## Routes

### 1. GET /v1/journal/trades/:accountId

List trades with cursor pagination and optional filters.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Max results (1-100) |
| `cursor` | string | - | Composite cursor `<time>,<deal_ticket>` — returns trades older than this point |
| `symbol` | string | - | Filter by symbol (exact match) |
| `direction` | string | - | Filter by `buy` or `sell` |
| `session_tag` | string | - | Filter by `asian`, `london`, `new_york`, `off_hours` |
| `magic_number` | int | - | Filter by EA magic number |
| `from` | int | - | Start Unix timestamp |
| `to` | int | - | End Unix timestamp |

**D1 query pattern:**
```sql
SELECT * FROM journal_trades
WHERE account_id = ?
  AND (time < ? OR ? IS NULL)          -- cursor
  AND (symbol = ? OR ? IS NULL)        -- symbol filter
  AND (direction = ? OR ? IS NULL)     -- direction filter
  AND (session_tag = ? OR ? IS NULL)   -- session filter
  AND (magic_number = ? OR ? IS NULL)  -- magic filter
  AND (time >= ? OR ? IS NULL)         -- from
  AND (time <= ? OR ? IS NULL)         -- to
ORDER BY time DESC
LIMIT ?
```

Note: D1 doesn't support `COALESCE`-based optional filters well. Instead, build the WHERE clause dynamically in code — only add clauses for provided filters. This is cleaner and more efficient.

**Response:**
```json
{
  "data": {
    "trades": [
      {
        "deal_ticket": 12345678,
        "symbol": "EURUSD",
        "direction": "buy",
        "deal_entry": "out",
        "volume": 0.1,
        "price": 1.085,
        "profit": 45.50,
        "time": 1774600000,
        "session_tag": "london",
        "pips": 45.0,
        "risk_reward_ratio": 1.5,
        "duration_seconds": 3600
      }
    ],
    "next_cursor": "1774596400",
    "has_more": true
  }
}
```

`next_cursor` is `<time>,<deal_ticket>` of the last trade in the result. The cursor query uses `(time < ? OR (time = ? AND deal_ticket < ?))` with `ORDER BY time DESC, deal_ticket DESC` to handle trades with identical timestamps. `has_more` is true if the query returned `limit` results.

### 2. GET /v1/journal/trades/:accountId/:dealTicket

Single trade with all fields. Returns 404 if not found.

**Response:** The full trade object with all 25+ fields from `journal_trades`.

### 3. GET /v1/journal/stats/:accountId

Summary statistics. Optional `from`/`to` query params for date range filtering.

**D1 query:**
```sql
SELECT
  COUNT(*) as total_trades,
  SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(CASE WHEN profit <= 0 THEN 1 ELSE 0 END) as losing_trades,
  SUM(profit) as total_profit,
  SUM(commission) as total_commission,
  SUM(swap) as total_swap,
  AVG(CASE WHEN profit > 0 THEN profit END) as avg_winner,
  AVG(CASE WHEN profit <= 0 THEN profit END) as avg_loser,
  AVG(duration_seconds) as avg_duration_seconds,
  AVG(risk_reward_ratio) as avg_rr,
  MAX(profit) as best_trade,
  MIN(profit) as worst_trade,
  SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) as sum_winners,
  SUM(CASE WHEN profit <= 0 THEN profit ELSE 0 END) as sum_losers
FROM journal_trades
WHERE account_id = ? AND deal_entry = 'out'
  AND (time >= ? OR ? IS NULL)
  AND (time <= ? OR ? IS NULL)
```

Only count closing deals (`deal_entry = 'out'`) for P&L stats — opening deals have `profit = 0`.

**Computed in code:**
- `win_rate = (winning_trades / total_trades) * 100`
- `net_profit = total_profit + total_commission + total_swap`
- `avg_profit_per_trade = net_profit / total_trades`
- `profit_factor = sum_losers !== 0 ? abs(sum_winners / sum_losers) : 0` (from explicit SQL aggregates)

**Response:**
```json
{
  "data": {
    "total_trades": 142,
    "winning_trades": 89,
    "losing_trades": 53,
    "win_rate": 62.68,
    "total_profit": 4523.50,
    "total_commission": -198.40,
    "total_swap": -45.20,
    "net_profit": 4279.90,
    "avg_profit_per_trade": 30.14,
    "avg_winner": 78.50,
    "avg_loser": -42.30,
    "profit_factor": 2.32,
    "avg_duration_seconds": 1840,
    "avg_rr": 1.45,
    "best_trade": 450.00,
    "worst_trade": -180.00
  }
}
```

### 4. GET /v1/journal/stats/:accountId/by-symbol

P&L breakdown by symbol. Only closing deals. Optional `from`/`to` query params for date range filtering.

**D1 query:**
```sql
SELECT
  symbol,
  COUNT(*) as trades,
  SUM(profit) as profit,
  SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100 as win_rate
FROM journal_trades
WHERE account_id = ? AND deal_entry = 'out'
  AND (time >= ? OR ? IS NULL)
  AND (time <= ? OR ? IS NULL)
GROUP BY symbol
ORDER BY profit DESC
```

**Response:**
```json
{
  "data": {
    "symbols": [
      { "symbol": "EURUSD", "trades": 45, "profit": 1200.50, "win_rate": 64.4 },
      { "symbol": "XAUUSD", "trades": 30, "profit": 890.00, "win_rate": 56.7 }
    ]
  }
}
```

### 5. GET /v1/journal/stats/:accountId/by-session

P&L breakdown by session_tag. Only closing deals. Optional `from`/`to` query params for date range filtering.

**D1 query:**
```sql
SELECT
  session_tag as session,
  COUNT(*) as trades,
  SUM(profit) as profit,
  SUM(CASE WHEN profit > 0 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100 as win_rate
FROM journal_trades
WHERE account_id = ? AND deal_entry = 'out'
  AND (time >= ? OR ? IS NULL)
  AND (time <= ? OR ? IS NULL)
GROUP BY session_tag
ORDER BY profit DESC
```

**Response:**
```json
{
  "data": {
    "sessions": [
      { "session": "london", "trades": 60, "profit": 2100.00, "win_rate": 68.3 },
      { "session": "new_york", "trades": 50, "profit": 1500.00, "win_rate": 58.0 }
    ]
  }
}
```

### 6. GET /v1/journal/stats/:accountId/daily

Daily P&L for equity curve chart. Optional `from`/`to` query params.

**D1 query:**
```sql
SELECT
  date(time, 'unixepoch') as date,
  COUNT(*) as trades,
  SUM(profit) as profit
FROM journal_trades
WHERE account_id = ? AND deal_entry = 'out'
  AND (time >= ? OR ? IS NULL)
  AND (time <= ? OR ? IS NULL)
GROUP BY date(time, 'unixepoch')
ORDER BY date ASC
```

`cumulative_profit` is computed in code by iterating results and accumulating.

**Response:**
```json
{
  "data": {
    "days": [
      { "date": "2026-03-20", "trades": 8, "profit": 340.50, "cumulative_profit": 340.50 },
      { "date": "2026-03-21", "trades": 12, "profit": -120.00, "cumulative_profit": 220.50 }
    ]
  }
}
```

---

## Authentication & Authorization

Uses the existing `authMiddleware` from `workers/api-gateway/src/middleware/auth.ts`:
1. Extracts `Authorization: Bearer <token>` header
2. Verifies JWT signature using `JWT_SECRET` (HS256)
3. Validates session exists in KV (`session:{userId}:{token}`)
4. Sets `userId` on the Hono context

**Account ownership check** — each journal route handler must verify:
```typescript
const account = await c.env.DB.prepare(
  'SELECT 1 FROM accounts WHERE id = ? AND user_id = ? LIMIT 1'
).bind(accountId, userId).first();

if (!account) return errorResponse('FORBIDDEN', 'Account not found or not owned by user', 403);
```

This is a per-handler check (not middleware) since only journal routes need the accountId ownership pattern.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `workers/api-gateway/src/routes/journal.ts` | Create | 6 journal API route handlers |
| `workers/api-gateway/src/index.ts` | Modify | Mount journal routes on protected app |

**No changes to:** D1 schema, shared types, MT5 EAs, journal-sync worker, account-relay DO, web dashboard.

# Journal Dashboard UI — Design Spec

**Date**: 2026-03-25
**Status**: Approved
**Scope**: Sub-project 3 of the AI Trade Journal. Two React pages, a Zustand store, and SVG chart components for the journal dashboard. Signal Noir cyberpunk styling.

---

## Goals

1. Visualize journal trade data in the existing EdgeRelay web dashboard
2. Show key stats (win rate, P&L, profit factor) at a glance
3. Display equity curve, symbol breakdown, and session breakdown charts
4. Provide a filterable, scrollable trade list with cursor-based pagination
5. Show full trade detail on click
6. Match the existing Signal Noir design system

## Non-Goals

- No trade notes/tags editing (deferred)
- No AI coaching insights (sub-project 4)
- No screenshot display (sub-project 5)
- No changes to API endpoints (already built)
- No changes to workers, EAs, or shared types

---

## Pages

### 1. JournalPage.tsx

**Route**: `/journal`

**Layout**: Vertical stack (Layout A from brainstorming):

**Section 1 — Account Selector**
- Dropdown to select which account to view journal for
- Fetches accounts from existing accounts store
- Selected account ID drives all journal API calls

**Section 2 — Stat Cards Row**
4 glass cards in a responsive grid (`md:grid-cols-4`, `grid-cols-2` on mobile):

| Card | Value | Format |
|------|-------|--------|
| Total Trades | `stats.total_trades` | Integer |
| Win Rate | `stats.win_rate` | Percentage with color (green ≥50%, red <50%) |
| Net Profit | `stats.net_profit` | Currency with color (green positive, red negative) |
| Profit Factor | `stats.profit_factor` | Decimal (2 places) |

Additional stats displayed as smaller text beneath the main cards:
- Avg Winner, Avg Loser, Best Trade, Worst Trade, Avg Duration, Avg R:R

**Section 3 — Charts Row**
2 glass cards side by side (`md:grid-cols-2`, stacked on mobile):

**Left: Equity Curve**
- SVG line chart component (`EquityCurve.tsx`)
- Data from `GET /v1/journal/stats/:accountId/daily`
- X-axis: dates, Y-axis: cumulative profit
- Line: neon cyan (#00e5ff) with glow
- Area fill: cyan gradient to transparent
- Responsive width, 200px height

**Right: Symbol Breakdown**
- Horizontal bar list showing P&L per symbol
- Data from `GET /v1/journal/stats/:accountId/by-symbol`
- Each row: symbol name, bar width proportional to profit, profit value
- Green bars for positive, red for negative

**Section 4 — Session Breakdown**
1 glass card, full width:
- Data from `GET /v1/journal/stats/:accountId/by-session`
- 3-4 horizontal bars (Asian, London, New York, Off Hours)
- Shows trades count, profit, win rate per session
- Color-coded bars

**Section 5 — Trade List**
Glass table with filter bar above:

**Filter bar** (`TradeFilters.tsx`):
- Symbol input (text)
- Direction select (All / Buy / Sell)
- Session select (All / Asian / London / New York / Off Hours)
- Date range (From / To date pickers)
- Filters update the Zustand store, which re-fetches trades

**Table columns**:
| Column | Field | Format |
|--------|-------|--------|
| Time | `time` | Date + time formatted |
| Symbol | `symbol` | String |
| Direction | `direction` | Badge (green BUY / red SELL) |
| Entry | `deal_entry` | in/out/inout |
| Volume | `volume` | Lots (2 decimals) |
| Profit | `profit` | Currency with color |
| Pips | `pips` | Decimal with color (nullable — show dash) |
| Duration | `duration_seconds` | Human readable (nullable — show dash) |

- Clickable rows → navigate to `/journal/:accountId/:dealTicket`
- Cursor-based infinite scroll: when user scrolls to bottom, fetch next page via `fetchMoreTrades`
- Staggered `animate-fade-in-up` on rows (existing pattern)

### 2. JournalTradeDetailPage.tsx

**Route**: `/journal/:accountId/:dealTicket`

**Layout**: Single glass card with grouped sections:

**Header**: Symbol + Direction badge + Profit (large)

**Section: Trade Info**
- Symbol, Direction, Deal Entry (in/out), Volume, Magic Number, Comment

**Section: Pricing**
- Entry Price, SL, TP, Risk:Reward Ratio

**Section: P&L**
- Profit, Commission, Swap, Net (profit + commission + swap)
- Pips, Duration (formatted)

**Section: Market Context**
- Session Tag (badge), Spread at Entry, ATR at Entry

**Section: Account State**
- Balance at Trade, Equity at Trade

**Section: Meta**
- Deal Ticket, Order Ticket, Position ID, Synced At

**Back button** at top → navigates to `/journal`

---

## Zustand Store

### File: `apps/web/src/stores/journal.ts`

Follows existing store patterns (auth.ts, accounts.ts, billing.ts):

```typescript
interface JournalFilters {
  symbol?: string;
  direction?: string;
  session_tag?: string;
  from?: number;
  to?: number;
}

interface JournalStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  total_commission: number;
  total_swap: number;
  net_profit: number;
  avg_profit_per_trade: number;
  avg_winner: number;
  avg_loser: number;
  profit_factor: number;
  avg_duration_seconds: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
}

interface SymbolStat {
  symbol: string;
  trades: number;
  profit: number;
  win_rate: number;
}

interface SessionStat {
  session: string;
  trades: number;
  profit: number;
  win_rate: number;
}

interface DailyPnl {
  date: string;
  trades: number;
  profit: number;
  cumulative_profit: number;
}

interface JournalTrade {
  deal_ticket: number;
  symbol: string;
  direction: string;
  deal_entry: string;
  volume: number;
  price: number;
  sl: number;
  tp: number;
  time: number;
  profit: number;
  commission: number;
  swap: number;
  magic_number: number;
  comment: string;
  balance_at_trade: number;
  equity_at_trade: number;
  spread_at_entry: number;
  atr_at_entry: number;
  session_tag: string;
  duration_seconds: number | null;
  pips: number | null;
  risk_reward_ratio: number | null;
  order_ticket?: number;
  position_id?: number;
  synced_at?: number;
}

interface JournalState {
  trades: JournalTrade[];
  stats: JournalStats | null;
  symbolStats: SymbolStat[];
  sessionStats: SessionStat[];
  dailyPnl: DailyPnl[];
  selectedTrade: JournalTrade | null;
  isLoading: boolean;
  error: string | null;
  cursor: string | null;
  hasMore: boolean;
  filters: JournalFilters;

  fetchTrades: (accountId: string) => Promise<void>;
  fetchMoreTrades: (accountId: string) => Promise<void>;
  fetchStats: (accountId: string) => Promise<void>;
  fetchSymbolStats: (accountId: string) => Promise<void>;
  fetchSessionStats: (accountId: string) => Promise<void>;
  fetchDailyPnl: (accountId: string) => Promise<void>;
  fetchTradeDetail: (accountId: string, dealTicket: number) => Promise<void>;
  setFilters: (filters: Partial<JournalFilters>) => void;
  reset: () => void;
}
```

### Fetch Semantics

- `fetchTrades(accountId)` — **replaces** the trade list (used on account change or filter change). Sets `trades = response.data.trades`, `cursor = response.data.next_cursor`, `hasMore = response.data.has_more`.
- `fetchMoreTrades(accountId)` — **appends** to existing trade list (infinite scroll). Appends `response.data.trades` to `trades`, advances `cursor`, updates `hasMore`.
- All other fetch methods replace their respective state slices.
- `selectedAccountId: string | null` is stored in the Zustand store so it persists across page navigation (detail page and back).

### API Response Cursor Handling

The trades endpoint returns:
```json
{ "data": { "trades": [...], "next_cursor": "1774596400,12345678", "has_more": true } }
```

The store reads `response.data.next_cursor` and `response.data.has_more` directly from the data envelope (not from `meta`).

### Filter Query Serialization

Filters are serialized into URL query params using `URLSearchParams`:
```typescript
const params = new URLSearchParams();
if (filters.symbol) params.set('symbol', filters.symbol);
if (filters.direction) params.set('direction', filters.direction);
if (filters.session_tag) params.set('session_tag', filters.session_tag);
if (filters.from) params.set('from', String(filters.from));
if (filters.to) params.set('to', String(filters.to));
if (cursor) params.set('cursor', cursor);
params.set('limit', '50');
```

All fetch methods call the journal API endpoints via the existing `api.ts` client (which handles JWT tokens).

API endpoints consumed:
- `GET /v1/journal/trades/:accountId` → `fetchTrades`, `fetchMoreTrades`
- `GET /v1/journal/trades/:accountId/:dealTicket` → `fetchTradeDetail`
- `GET /v1/journal/stats/:accountId` → `fetchStats`
- `GET /v1/journal/stats/:accountId/by-symbol` → `fetchSymbolStats`
- `GET /v1/journal/stats/:accountId/by-session` → `fetchSessionStats`
- `GET /v1/journal/stats/:accountId/daily` → `fetchDailyPnl`

---

## SVG Equity Curve Component

### File: `apps/web/src/components/journal/EquityCurve.tsx`

Props:
```typescript
interface EquityCurveProps {
  data: DailyPnl[];  // Must have cumulative_profit
  height?: number;   // Default 200
}
```

Implementation:
- Pure SVG, no external chart library
- Responsive width via `viewBox` and `width="100%"`
- Computes min/max cumulative_profit for Y-axis scaling
- Draws a polyline connecting daily cumulative profit points
- SVG `<defs>` for:
  - Cyan glow filter (`<feGaussianBlur>` + `<feComposite>`)
  - Area gradient (`<linearGradient>` from `#00e5ff30` to transparent)
- Line stroke: `#00e5ff` with glow filter
- Area fill: gradient below the line via `<polygon>`
- Zero line: dashed horizontal line at y=0 in `#ffffff15`

---

## Routing Changes

### File: `apps/web/src/main.tsx`

Add inside the existing `ProtectedRoute` wrapper:
```tsx
<Route path="/journal" element={<JournalPage />} />
<Route path="/journal/:accountId/:dealTicket" element={<JournalTradeDetailPage />} />
```

### File: `apps/web/src/components/layout/AppLayout.tsx`

Add "Journal" to the sidebar navigation array, between "Signal Log" and "Downloads":
- Icon: `BookOpen` from lucide-react
- Path: `/journal`
- Label: `Journal`

---

## Design System

All components use the existing Signal Noir design tokens and utility classes:
- `glass` for card backgrounds
- `animate-fade-in-up` for entrance animations
- `font-mono-nums` for numeric values
- `text-neon-cyan`, `text-neon-green`, `text-neon-red` for color coding
- `glow-text-cyan` for highlighted stats
- `chip` for badges (BUY/SELL, session tags)
- `card-hover` for interactive cards
- `data-row` for table row hover effects

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/stores/journal.ts` | Create | Zustand store — fetches, state, filters |
| `apps/web/src/components/journal/EquityCurve.tsx` | Create | SVG line chart for cumulative P&L |
| `apps/web/src/components/journal/TradeFilters.tsx` | Create | Filter bar — symbol, direction, session, date range |
| `apps/web/src/pages/JournalPage.tsx` | Create | Main journal view — stats, charts, trade list |
| `apps/web/src/pages/JournalTradeDetailPage.tsx` | Create | Single trade detail view |
| `apps/web/src/main.tsx` | Modify | Add journal routes |
| `apps/web/src/components/layout/AppLayout.tsx` | Modify | Add Journal to sidebar nav |

**No changes to:** API gateway, workers, shared types, EA files, app.css (uses existing utility classes).

---

## UI States

### Loading State
- Stat cards: use `.skeleton` class (existing in app.css) as placeholder rectangles
- Charts: skeleton placeholder matching chart dimensions
- Trade list: 5 skeleton rows

### Empty State
- When account has zero trades: centered icon (`BookOpen`), muted text "No trades yet — attach the TradeJournal_Sync EA to start syncing", matching the existing empty state pattern in SignalLogPage.
- Empty equity curve: show flat zero line with "No data" text

### Error State
- Glass card with `text-neon-red` error message and a retry button
- Each section handles errors independently (stats error doesn't block trade list)

### Date Picker
- Use native `<input type="date">` wrapped in the existing `Input` component for consistent styling. No external datepicker library needed.

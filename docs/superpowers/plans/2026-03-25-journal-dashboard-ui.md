# Journal Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Journal Dashboard UI — two React pages with stats, SVG equity curve, trade list with filters, and trade detail view, using the existing Signal Noir design system.

**Architecture:** Zustand store fetches from 6 journal API endpoints. JournalPage renders stats cards, equity curve (SVG), symbol/session breakdowns, and a filterable trade table with cursor-based infinite scroll. JournalTradeDetailPage shows full trade details. All components use existing glass/glow/animation CSS classes.

**Tech Stack:** React 18, Zustand, React Router, Tailwind CSS 4, Lucide React, inline SVG charts

**Spec:** `docs/superpowers/specs/2026-03-25-journal-dashboard-ui-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/stores/journal.ts` | Create | Zustand store — all journal state, fetch methods, filters |
| `apps/web/src/components/journal/EquityCurve.tsx` | Create | SVG line chart for cumulative P&L |
| `apps/web/src/components/journal/TradeFilters.tsx` | Create | Filter bar — symbol, direction, session, date range |
| `apps/web/src/pages/JournalPage.tsx` | Create | Main journal view — stats, charts, trade list |
| `apps/web/src/pages/JournalTradeDetailPage.tsx` | Create | Single trade detail view |
| `apps/web/src/main.tsx` | Modify | Add journal routes |
| `apps/web/src/components/layout/AppLayout.tsx` | Modify | Add Journal to sidebar nav |

---

## Task 1: Zustand Store

**Files:**
- Create: `apps/web/src/stores/journal.ts`

- [ ] **Step 1: Create the journal store**

The store follows the existing pattern from `stores/accounts.ts` and `stores/propguard.ts`. Uses the `api` client from `lib/api.ts`. Read the spec at `docs/superpowers/specs/2026-03-25-journal-dashboard-ui-design.md` for the complete interface definitions (JournalState, JournalTrade, JournalStats, SymbolStat, SessionStat, DailyPnl, JournalFilters).

Key implementation details:
- `fetchTrades` **replaces** the trade list. `fetchMoreTrades` **appends** (infinite scroll).
- `selectedAccountId` persists in the store so it survives page navigation.
- Filters are serialized into URL query params using `URLSearchParams`.
- API paths: `/journal/trades/${accountId}`, `/journal/stats/${accountId}`, `/journal/stats/${accountId}/by-symbol`, `/journal/stats/${accountId}/by-session`, `/journal/stats/${accountId}/daily`.
- Trade detail: `/journal/trades/${accountId}/${dealTicket}`.
- Cursor comes from `response.data.next_cursor`, has_more from `response.data.has_more`.
- `fetchAll(accountId)` convenience method that calls stats + symbolStats + sessionStats + dailyPnl + trades in parallel.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/stores/journal.ts
git commit -m "feat(journal-ui): add Zustand store for journal data"
```

---

## Task 2: Journal Components (EquityCurve + TradeFilters)

**Files:**
- Create: `apps/web/src/components/journal/EquityCurve.tsx`
- Create: `apps/web/src/components/journal/TradeFilters.tsx`

- [ ] **Step 1: Create EquityCurve component**

Pure SVG line chart component. Props: `data: DailyPnl[]` (with `cumulative_profit`), `height?: number` (default 200).

Implementation:
- Uses `viewBox` and `width="100%"` for responsive sizing
- Computes min/max `cumulative_profit` for Y-axis scaling
- Builds SVG `<polyline>` points from data
- SVG `<defs>` with: glow filter (`<feGaussianBlur stdDeviation="3">` + `<feComposite>`), area gradient (`<linearGradient>` from `#00e5ff30` to `transparent`)
- Line: stroke `#00e5ff`, strokeWidth 2, with glow filter
- Area: `<polygon>` below the line with gradient fill
- Zero line: dashed line at y=0 in `#ffffff15`
- Empty state: when data is empty, show "No data" text centered in the SVG
- No external charting dependencies

- [ ] **Step 2: Create TradeFilters component**

Filter bar component. Props: callback to update filters in the store.

Implementation:
- Horizontal flex row of filter controls, wrapped on mobile
- Symbol: text input using existing `Input` component
- Direction: select using existing `Select` component (All / Buy / Sell)
- Session: select (All / Asian / London / New York / Off Hours)
- Date range: two native `<input type="date">` styled with the existing Input component
- On any change, calls `setFilters()` on the journal store, which triggers a re-fetch
- Uses existing UI components from `components/ui/` (Input, Select)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/journal/EquityCurve.tsx apps/web/src/components/journal/TradeFilters.tsx
git commit -m "feat(journal-ui): add EquityCurve SVG chart and TradeFilters components"
```

---

## Task 3: JournalPage

**Files:**
- Create: `apps/web/src/pages/JournalPage.tsx`

- [ ] **Step 1: Create the main journal page**

Read the spec for the complete section layout. This is the largest file (~400-500 lines). Follow existing page patterns from `DashboardPage.tsx` and `SignalLogPage.tsx`.

**Structure** (vertical stack):

1. **Header row**: "Trade Journal" title + account selector dropdown (uses `useAccountsStore` to list accounts)

2. **Stat cards**: 4 glass cards in `md:grid-cols-4 grid-cols-2` grid:
   - Total Trades (neon-cyan, font-mono-nums)
   - Win Rate (green ≥50%, red <50%)
   - Net Profit (green positive, red negative)
   - Profit Factor (neon-cyan)
   - Below main cards: smaller text row with Avg Winner, Avg Loser, Best Trade, Worst Trade, Avg Duration, Avg R:R

3. **Charts row**: 2 glass cards `md:grid-cols-2`:
   - Left: EquityCurve component with dailyPnl data
   - Right: Symbol Breakdown — map `symbolStats` to horizontal bar rows (bar width proportional to profit, green/red coloring)

4. **Session breakdown**: 1 full-width glass card showing sessionStats as horizontal bars with trade count, profit, win rate

5. **Trade list**: TradeFilters component above, then glass table:
   - Columns: Time, Symbol, Direction (chip badge), Entry, Volume, Profit, Pips, Duration
   - Rows: map `trades` array, each row clickable → `navigate(`/journal/${accountId}/${trade.deal_ticket}`)`
   - Staggered `animate-fade-in-up` with delay per row
   - `data-row` class for hover effect
   - Infinite scroll: detect scroll to bottom, call `fetchMoreTrades` if `hasMore`
   - Loading: skeleton rows while `isLoading`
   - Empty: centered icon + message when no trades

6. **useEffect**: On mount and account change, call `fetchAll(accountId)`. On filter change, call `fetchTrades(accountId)`.

**Formatting helpers** (inline in the file):
- `formatTime(unixTimestamp)` → "Mar 24, 14:32"
- `formatDuration(seconds)` → "1h 23m" or "45m" or "2m 30s"
- `formatCurrency(amount)` → "$1,234.50" with sign
- `formatPips(pips)` → "+22.5" or "-8.0" or "—"

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/JournalPage.tsx
git commit -m "feat(journal-ui): add JournalPage with stats, charts, and trade list"
```

---

## Task 4: JournalTradeDetailPage

**Files:**
- Create: `apps/web/src/pages/JournalTradeDetailPage.tsx`

- [ ] **Step 1: Create the trade detail page**

Single glass card layout with grouped sections. Uses `useParams` to get `accountId` and `dealTicket`. Calls `fetchTradeDetail` on mount.

**Structure**:

1. **Back button**: `← Back to Journal` link to `/journal`

2. **Header**: Large symbol name + direction badge (chip, green BUY / red SELL) + large profit value with color

3. **Section: Trade Info** — glass card:
   - Symbol, Direction, Deal Entry (in/out), Volume, Magic Number, Comment

4. **Section: Pricing** — glass card:
   - Entry Price, SL, TP, Risk:Reward Ratio

5. **Section: P&L** — glass card:
   - Profit, Commission, Swap, Net (computed), Pips, Duration (formatted)

6. **Section: Market Context** — glass card:
   - Session Tag (chip badge), Spread at Entry, ATR at Entry

7. **Section: Account State** — glass card:
   - Balance at Trade, Equity at Trade

8. **Section: Meta** — glass card:
   - Deal Ticket, Order Ticket, Position ID, Synced At (formatted)

Each section uses a 2-column grid for label/value pairs. Labels in `text-terminal-muted text-xs uppercase tracking-widest`. Values in `text-white font-mono-nums`.

Loading state: skeleton card. 404: "Trade not found" message.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/JournalTradeDetailPage.tsx
git commit -m "feat(journal-ui): add JournalTradeDetailPage with grouped sections"
```

---

## Task 5: Routing + Navigation + Build + Deploy

**Files:**
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add routes to main.tsx**

Add imports at the top (after existing page imports):
```typescript
import { JournalPage } from '@/pages/JournalPage';
import { JournalTradeDetailPage } from '@/pages/JournalTradeDetailPage';
```

Add routes inside the `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` block, after the signals route (line 49):
```tsx
<Route path="/journal" element={<JournalPage />} />
<Route path="/journal/:accountId/:dealTicket" element={<JournalTradeDetailPage />} />
```

- [ ] **Step 2: Add Journal to sidebar nav in AppLayout.tsx**

Add `BookOpen` to the lucide-react import on line 3:
```typescript
import { LayoutDashboard, Users, Activity, BookOpen, Download, BarChart3, Gauge, Settings, CreditCard, LogOut, Menu, X } from 'lucide-react';
```

Add Journal entry to the `navItems` array (after Signal Log, before Downloads — line 10):
```typescript
{ label: 'Journal', icon: BookOpen, to: '/journal' },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Build for production**

Run: `cd apps/web && npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Deploy to Cloudflare Pages**

Run: `cd apps/web && npx wrangler pages deploy dist --project-name edgerelay-web`

- [ ] **Step 6: Commit and push**

```bash
git add apps/web/src/main.tsx apps/web/src/components/layout/AppLayout.tsx
git commit -m "feat(journal-ui): add journal routes and sidebar navigation"
git push origin main
```

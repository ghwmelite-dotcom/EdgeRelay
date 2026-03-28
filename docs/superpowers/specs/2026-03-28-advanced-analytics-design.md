# Advanced Analytics — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Author:** Claude + User

## Overview

Four advanced analytics features for TradeMetrics Pro that transform raw journal trade data into institutional-grade insights: Performance Attribution, Equity Curve Health, Edge Validation, and AI-powered Trade Insights. The first three are pure math/SQL computations. The fourth uses Cloudflare Workers AI (Llama 3.3 70B) to generate personalized natural language insights from the computed data — free via Workers AI free tier.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI model | @cf/meta/llama-3.3-70b-instruct-fp8-fast | Best free model on Workers AI, 70B reasoning |
| AI cost | Free (10,000 neurons/day, ~20-50 calls) | 24h cache per user, fits free tier |
| Charts | SVG (no library) | Existing sparkline pattern, lightweight |
| Computation | On-the-fly SQL (attribution, equity, edge) + cached AI | Fast queries from journal_trades, no pre-computation needed |
| Fallback | Template insights when AI unavailable | Never show empty state |

## Data Model

### `ai_insights_cache`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | TEXT | PK, auto-generated | Unique identifier |
| user_id | TEXT | UNIQUE, FK → users(id) | One cached result per user |
| insights_json | TEXT | NOT NULL | JSON array of 3-5 insight objects |
| stats_hash | TEXT | NOT NULL | Hash of input stats for cache invalidation |
| computed_at | TEXT | DEFAULT datetime('now') | When generated |

No other new tables. All features compute from existing `journal_trades`.

## API Routes

All routes in `api-gateway` under `/v1/analytics`. All protected (auth required).

### GET /analytics/attribution

Computes P&L breakdown from journal_trades for the authenticated user.

**Response:**
```json
{
  "by_session": [
    { "session": "asian", "trades": 8, "pnl": -42.50, "win_rate": 25.0 },
    { "session": "london", "trades": 45, "pnl": 320.50, "win_rate": 68.9 },
    { "session": "new_york", "trades": 30, "pnl": 180.00, "win_rate": 60.0 },
    { "session": "off_hours", "trades": 5, "pnl": -15.00, "win_rate": 40.0 }
  ],
  "by_day": [
    { "day": "Monday", "day_num": 1, "trades": 12, "pnl": 85.00, "win_rate": 58.3 },
    { "day": "Tuesday", "day_num": 2, "trades": 18, "pnl": 145.00, "win_rate": 66.7 }
  ],
  "by_symbol": [
    { "symbol": "XAUUSD", "trades": 30, "pnl": 450.00, "win_rate": 73.3 }
  ],
  "by_direction": [
    { "direction": "buy", "trades": 55, "pnl": 280.00, "win_rate": 65.5 },
    { "direction": "sell", "trades": 33, "pnl": 163.00, "win_rate": 57.6 }
  ],
  "hour_heatmap": [
    { "day_num": 1, "hour": 9, "pnl": 45.20, "trades": 3 }
  ],
  "total_trades": 88,
  "total_pnl": 443.00
}
```

**SQL queries:**
- by_session: `GROUP BY session_tag` from journal_trades
- by_day: `GROUP BY strftime('%w', close_time)` — map 0-6 to day names
- by_symbol: `GROUP BY symbol`
- by_direction: `GROUP BY direction`
- hour_heatmap: `GROUP BY strftime('%w', close_time), strftime('%H', close_time)`
- All filtered by `account_id IN (user's accounts)` and `deal_entry = 'out'`

### GET /analytics/equity-health

Computes equity curve health metrics.

**Response:**
```json
{
  "r_squared": 0.87,
  "recovery_factor": 3.2,
  "max_drawdown_pct": 8.5,
  "max_drawdown_amount": 850.00,
  "max_underwater_days": 12,
  "profit_factor": 1.85,
  "sharpe_ratio": 1.42,
  "total_return_pct": 27.5,
  "avg_win": 45.20,
  "avg_loss": -28.50,
  "expectancy": 12.45,
  "prop_compliance": {
    "ftmo_daily_ok": true,
    "ftmo_total_ok": true,
    "max_daily_loss_pct": 3.2,
    "max_total_dd_pct": 8.5,
    "score": 92
  },
  "equity_curve": [
    { "date": "2026-01-15", "balance": 10240.50 }
  ]
}
```

**Computation:**
- Equity curve: daily balance snapshots from `balance_at_trade` in journal_trades
- R²: linear regression on equity curve, coefficient of determination
- Recovery factor: total profit / max drawdown
- Max underwater: longest period (in days) equity stayed below previous peak
- Sharpe: avg daily return / stddev daily returns, annualized (× √252)
- Prop compliance: check if max daily loss < 5% and max total DD < 10% (FTMO rules)
- Score: 100 - (max_total_dd_pct × 5) — simple 0-100 scale

### GET /analytics/edge-validation

Statistical edge validation.

**Response:**
```json
{
  "sample_size": 247,
  "sample_adequate": true,
  "min_recommended": 200,
  "mean_return": 12.45,
  "std_return": 38.20,
  "t_statistic": 5.12,
  "p_value": 0.003,
  "profit_factor": 1.85,
  "profit_factor_ci_lower": 1.32,
  "profit_factor_ci_upper": 2.41,
  "monte_carlo_median_dd": 12.5,
  "monte_carlo_worst_dd_95": 22.3,
  "verdict": "VALIDATED",
  "explanation": "Edge is statistically significant (p=0.003). Profit factor remains above 1.0 at 95% confidence. Sample size (247) exceeds minimum (200)."
}
```

**Computation:**
- t-test: mean return / (std / √n)
- p-value: from t-distribution (approximate with formula, no external lib needed)
- Profit factor bootstrap: resample trades 1000 times with replacement, compute PF for each, take 2.5th and 97.5th percentiles
- Monte Carlo: shuffle trade returns 1000 times, compute max drawdown for each, take 95th percentile
- Verdict logic:
  - VALIDATED: p < 0.05 AND PF CI lower > 1.0 AND sample ≥ 200
  - LIKELY_VALID: p < 0.05 AND PF CI lower > 1.0 AND sample 100-199
  - INCONCLUSIVE: p < 0.10 OR PF CI lower > 0.9 OR sample 50-99
  - LIKELY_NOISE: p ≥ 0.10 OR PF CI lower < 0.9
  - OVERFITTED: sample < 50

### GET /analytics/ai-insights

AI-powered trade insights using Cloudflare Workers AI.

**Flow:**
1. Compute stats hash from user's journal_trades count + total P&L + latest trade date
2. Check ai_insights_cache — if hash matches and computed_at < 24h, return cached
3. Otherwise: call attribution + equity-health endpoints internally to get stats
4. Build prompt with stats JSON
5. Call `env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages })`
6. Parse response into structured insights
7. Cache in ai_insights_cache
8. Return insights

**Response:**
```json
{
  "insights": [
    {
      "severity": "critical",
      "title": "Asian session trades are losing money",
      "detail": "Your Asian session trades have -$142 P&L with 28% win rate (18 trades), while London shows +$485 at 72% (45 trades). Asian session is erasing 29% of your London gains.",
      "recommendation": "Disable trading 21:00-06:00 UTC or tighten entry criteria during Asian hours."
    }
  ],
  "generated_at": "2026-03-28T14:30:00Z",
  "cached": false,
  "model": "llama-3.3-70b-instruct-fp8-fast"
}
```

**System prompt:**
```
You are an elite forex trading analyst reviewing a trader's performance data. Analyze the data and return exactly 3-5 actionable insights as a JSON array. Each insight must have: severity (critical/warning/info/positive), title (short headline), detail (2-3 sentences with specific numbers from the data), recommendation (one actionable sentence).

Focus on:
- Sessions/days/symbols that are losing money (drag detection)
- Edge strength and statistical significance
- Risk management issues (drawdown, recovery)
- Patterns that suggest specific improvements
- Positive reinforcement for what's working

Be specific with numbers. Don't be generic. Every insight must reference actual data points provided.
```

**Fallback (when AI unavailable):**
Generate template insights from the stats:
- If any session has negative P&L and >10 trades: "Your {session} trades are losing money ({pnl}, {win_rate}%)"
- If PF CI lower > 1.0: "Your edge appears statistically valid"
- If max DD > 10%: "Maximum drawdown of {dd}% exceeds prop firm limits"
- If one symbol dominates P&L: "{symbol} accounts for {pct}% of your total P&L"

## Workers AI Integration

**Binding in wrangler.toml:**
```toml
[ai]
binding = "AI"
```

**Env type update:**
```typescript
interface Env {
  // ... existing bindings
  AI: Ai;
}
```

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
**Cost:** ~200-500 neurons per call. 10,000 free/day = 20-50 calls. With 24h cache, serves 20-50 DAU for free.
**Fallback to `@cf/meta/llama-3.1-8b-instruct-fast`** if 70B fails (uses fewer neurons).

## Frontend Components

### Enhanced Analytics Page (`/analytics`)

4-tab layout replacing the existing analytics page:

**Tab 1: Attribution (default)**
- Session P&L bar chart (horizontal bars, green/red)
- Day-of-week bar chart
- Symbol breakdown bar chart
- Direction split (buy vs sell) — two-column stat cards
- Hour × Day heatmap (7×24 grid, color-coded green→red)

**Tab 2: Equity Health**
- Full-width equity curve line chart (SVG polyline with gradient fill)
- Health metric cards grid (2×4): R², Recovery Factor, Sharpe, Max DD, Underwater Days, Profit Factor, Expectancy, Total Return
- Prop Firm Compliance card with FTMO pass/fail badges and score gauge

**Tab 3: Edge Validator**
- Verdict badge (large, color-coded by verdict type)
- Sample size gauge (progress bar toward 200 minimum)
- Profit factor confidence interval visualization (horizontal bar with CI range)
- Monte Carlo worst-case drawdown display
- Explanation text block

**Tab 4: AI Insights**
- Card list of 3-5 insights
- Each card: severity icon + colored left border, title (bold), detail text, recommendation (highlighted)
- "Refresh Insights" button (regenerates, shows loading state)
- "Last updated" timestamp
- Severity colors: critical=red, warning=amber, positive=green, info=cyan

### Dashboard Enhancement

- **Top Insight Card** — below Telegram banner, above stats. Shows highest-severity AI insight with "View All →" link to Analytics
- **Equity Sparkline** — add to each master card on dashboard (reuse marketplace sparkline component)

### Charts (all SVG, no library)

Bar chart component:
```tsx
<BarChart data={[{ label: "London", value: 320.50 }]} />
```

Heatmap component:
```tsx
<HeatmapGrid data={hourData} xLabels={hours} yLabels={days} />
```

Equity curve component (already exists as sparkline — extend to full-size with axes):
```tsx
<EquityCurveChart data={equityCurve} showAxes />
```

## Scope Decomposition

### Sub-project 1: Backend (API + AI)
- Migration: ai_insights_cache table
- 4 analytics API endpoints with all computation logic
- Workers AI binding + prompt + fallback
- Cache logic

**Deliverable:** All endpoints return correct data.

### Sub-project 2: Frontend (Analytics Page)
- 4-tab analytics page with all charts and visualizations
- SVG chart components (bar, heatmap, equity curve, CI viz)
- Insight cards with severity styling
- Mobile responsive

**Deliverable:** Full analytics dashboard.

### Sub-project 3: Dashboard Integration
- Top Insight card on main dashboard
- Equity sparkline on master cards
- Navigation links

**Deliverable:** Key insights on dashboard.

## Non-Goals (MVP)

- Real-time streaming updates (use manual refresh)
- Custom date range filtering (future — currently uses all-time data)
- Export analytics as PDF/image (future)
- Compare two time periods (future)
- Per-account analytics (currently aggregates across all user accounts)
- Custom prop firm rule configuration (currently hardcoded FTMO rules)

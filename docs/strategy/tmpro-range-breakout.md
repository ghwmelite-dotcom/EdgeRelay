# TMPro Range Breakout

Tag: **The Worlds Simpliest Strategy** (user-requested spelling).

## Scope and source
Second academy course, separate from Three Strategies. Source: user-provided `This Beginner Strategy Takes 1 Minute to UNDERSTAND- MZITOH FX.txt`; speaker calls the strategy MFG 2.2. Truncated at 30 minutes. No verified source video or channel URL supplied for this course; do not use Scarface Trades media here.

## Teaching rules
Gold/XAUUSD; M15 only. Four candle opens 10:00, 10:15, 10:30, 10:45 UTC, range frozen at 11:00 UTC. Later M15 breakout above/below; next candle open entry. Source stop 80 pips, targets 160 or 240 pips. UTC stays fixed and is not re-anchored to the London or broker open.

Full-body versus close-only confirmation, contract pip convention, stop-versus-candle conflict, partials, break-even, entries/re-entry, cutoffs, risk budget and news handling remain explicitly unresolved. Test protocol choices must be declared separately. No trading automation or profitability claim.

## Visual design
Use a four-candle range drawing as the focal point, with buy/sell toggle, chronological UTC labels and text equivalent. Existing app semantic tokens govern the shell. Standalone paper: #f4f7fa; ink #26384b; secondary #526478; range #f6de9b/#876315; buy #1765a5; sell #873a78. Arial in the portable diagram/print document; existing application typography elsewhere. Left-aligned copy, quiet four-step grid, realistic continuous OHLC diagrams with an explicitly illustrative price scale and 0.10 pip unit, never historical-data claims. Mobile one-column; desktop paired steps. No automatic animation.

## Implementation
Public standalone printable HTML and SVG diagrams under `apps/web/public/playbook/tmpro-range-*`; React guide under academy; six lessons and sixteen questions shared with the API. Unique gr-v1 IDs. Client and server prerequisite checks scoped by course; original homework stays with Three Strategies. Persist both courses in existing academy tables; no schema migration. No original source video attached to the second course.

## Confirmed long-body entry exception
User clarification: completed breakout body >=100 pips (abs(close-open), excluding wicks) requires a later retracement of at least 50% of that body. Buy retraces down to the body midpoint; sell retraces up. Then entry is at the next M15 open after the qualifying retracement candle completes, only if the other rules still align. No retracement means no entry, not an automatic second-candle trade. This course explicitly reads retracement as a midpoint touch, not an extra requirement to close beyond midpoint. Keep the fixed 80/160/240-pip distances from actual entry; never widen to force a setup. A 120-pip body needs >=60 pips retracement. Reference candle and midpoint stay frozen.

## Verification
Workspace typechecks and production web build passed. `node scripts/test-three-strategies.cjs` passes existing strategy/API/media checks plus independent new-course progression and ownership regressions against SQLite. `python scripts/test-range-course-ui.py` passes the six quizzes, course switching, progress refresh, media separation, mobile overflow and guide toggle with mocked API responses. Printable PDF covers standard and delayed entries; desktop and mobile previews inspected. Confirmed exception incorporated in guide, entry lesson, quizzes and tutor context; release verification follows.

## Realistic chart request
User chose realistic teaching charts rather than real historical XAUUSD candles. Render with `python scripts/render-range-guide.py`: continuous OHLC, conventional up/down bodies and wicks, four-bar UTC range, price scale, midpoint and exact entry/SL/TP price arithmetic. Final entry shown as an open-only marker, without future outcome. Embedded portable charts and web SVGs use the same generated assets; JSON provenance included.

## Release candidate verification
Confirmed 100-inclusive threshold, 50% body retracement and no forced entry taught in course. Four realistic OHLC charts have continuous prices; renderer checks body/risk arithmetic and later midpoint retracement. API suite passes all 16 quiz questions with course-scoped progression. Browser suite passes six lessons, both entry branches/directions and mobile layouts with mocked API. PDF is exactly two A4 pages, rendered and visually inspected.

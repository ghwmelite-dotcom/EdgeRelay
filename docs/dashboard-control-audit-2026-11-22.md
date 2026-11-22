# Dashboard control audit — 22 November 2026

## Scope and live evidence
Verified the dashboard with the account the user signed into in the internal browser. Tested the news/calendar tabs, journal account selection and refresh. All 23 sidebar destinations opened their expected page, including operations, portfolio, academy, tools, account pages and admin. These are route-opening checks, not a claim that every nested page workflow was exercised.

The signed-in account showed both terminals offline and no fresh live-position telemetry. Therefore genuine incoming broker positions, floating profit changes and Telegram delivery were not verified on this session. Their UI state transitions were tested with isolated fixtures. No real trade, sharing-consent change, profile update, Telegram message or logout was performed on the user session.

## Corrections
- Removed the incorrect Close navigation accessible label from every sidebar link.
- Closed mobile sidebar is inert, with Escape to close and an explicit controlled-region association.
- Sidebar Telegram connection failures display a retryable error instead of silently doing nothing.
- Account refresh failures now display a stale-data warning and Retry accounts control; onboarding does not appear during a failed account fetch.
- Signal-source badge counts online heartbeats, distinct from configured sources.
- Calendar countdowns update every 30 seconds independently of the five-minute fetch. Tabs announce selected state, and event timestamps expose UTC details. Missing/unsafe source URLs no longer create a fake # navigation.
- Community response validation contains incomplete payloads within the widget. Request revisions prevent a delayed refresh from overwriting a newly saved sharing choice.
- Replaced the stale v1.10 installation label with the latest TradeJournal Sync download link.
- Advanced the service-worker cache to v14.

## Passing checks
- Production TypeScript/Vite build and git diff --check.
- test-dashboard-features.py: summary metrics, mixed currencies, source count, news/calendar, advancing countdown, sidebar and banner Telegram failure/retry, account selection/manual refresh, insights, themes, clock, automatic polls, API failures/recovery, account retry, consent opt-in/withdrawal/error/race, malformed community payload, navigation, mobile menu/overflow/Escape, onboarding/back/skip, persistent dismissals, logout and anonymous protection. All mutations intercepted.
- test-live-positions-ui.py: missing telemetry is not zero; live USDJPY snapshot; account currency; swap; stale network response; position closure and genuine zero.
- test-dashboard-journal.py: connected-account preference, timed refresh, account isolation, journal-only role, errors/recovery and nullable values.
- test-dashboard-render.py: ten nullable/zero signal cases on dashboard and signal log.
- test-dashboard-models.cjs: analytics gates, currency, negative net P/L and session boundaries.
- test-extended-ui.py: isolated consent/profile/Telegram-test controls and calculator input/rounding checks.
- test-sidebar-routes.py: 27 routes under API outage, rejecting blank pages and the root error boundary.
- test-homepage-cache.cjs: valid and poisoned asset caching.

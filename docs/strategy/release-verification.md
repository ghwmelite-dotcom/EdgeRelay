# Three Strategies release verification

## Scope
Replaces the entire ICC practice feature with versioned opening-range, previous-day and pre-session playbooks. XAUUSD and USDJPY are primary teaching markets; instrument-specific UTC session anchors supersede the source stock timing. Active lessons, public product pages, dashboard, strategy hub, journal reviews, Sage context and Telegram /strategy now share that framework.

The original 44:08 course is unchanged in R2; every player credits Scarface Trades and links the creator’s YouTube channel. Twelve new lessons use separate ts-v1 IDs. Captions are automatically transcribed. Original diagrams/PDF retain source timing and are labelled reference material; adapted lesson text governs practice.

## Verification completed locally
- Workspace type checks and production frontend build.
- Deterministic engine tests: all three setups on XAUUSD/USDJPY synthetic data, offset-minute session anchors, direction confirmation, later retests, cancellation/expiry, equality/gaps, missing candles, news blackout boundaries, conservative ambiguous exits, sell symmetry, contract sizing and daily limits.
- Real Hono/SQLite API tests: complete quiz sets, duplicate/foreign rejection, server level unlocks, failed-attempt status, legacy separation, owned-trade linkage, review isolation, UTC schedule validation, retired generator/payment routes, media Range/HEAD/ETag behavior.
- Browser tests with mocked API writes: legacy redirects, replay state controls, video duration/chapter seeking from supplied course, quiz navigation reset, UTC form submission, mobile overflow checks. Mobile screenshots reviewed.
- Existing dashboard/MT5/news/auth/Telegram regression suites and browser live-position/settings/calculator checks pass. No real trades, payments or Telegram test messages sent.

## Operational limits
This is an educational and review workflow, not an automated order executor. Built-in candles, schedules and economics are invented teaching fixtures. Imported data and schedule verification are user-declared. Broker session hours are not automatically inferred from symbol names; enter date-specific terminal/venue specifications in UTC. No performance edge or live-capital readiness is asserted. Strategy notes are self-reported and never overwrite broker fills. Legacy trade/course/generation history remains stored.

## Deployment
Managed additive migration 0026 creates strategy_reviews only. Video key: academy/three-strategies/scarface-trades-course-v1.mp4. Service-worker cache moves to tm-pro-v9. GitHub deployment workflow now runs the strategy test suite before deployment. Production checks will be appended after release.

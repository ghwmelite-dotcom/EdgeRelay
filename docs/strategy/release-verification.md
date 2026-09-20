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
Managed additive migration 0026 creates strategy_reviews only. Video key: academy/three-strategies/scarface-trades-course-v1.mp4. Service-worker cache moves to tm-pro-v9. GitHub deployment workflow now runs the strategy test suite before deployment. Production checks are recorded below.

## Verified production release — 2026-09-20
Application revision: `6cf0ff37bff4e7159e84e8b4297b8c0e900ef346` (feature commit `d69eec67cbb982b65135487b81cab8ac9631a982`). GitHub workflow [35510020849](https://github.com/ghwmelite-dotcom/EdgeRelay/actions/runs/35510020849) completed successfully: type checks/tests, managed D1 migration, all workers and Pages.

Live API, journal-sync and Telegram health endpoints returned 200. The public strategy catalog returned exactly three setups with UTC rules. Unauthenticated strategy-review requests returned 401. Hosted video HEAD reported 102,940,940 bytes with byte-range support; bytes 0–63 matched the supplied source. Deployed PDF SHA-256 matched the original `917c45d48f4e3e8f6e9dce9db9ae71073b45843a07c8ea134a55298e8a1e12d0`. The deployed service worker reports tm-pro-v9.

Live browser verification without API mocks: new landing page, public practice studio, eligible replay state, actual hosted video duration 44:08, seek to 21:15, visible owner/channel attribution and zero page runtime errors. Authenticated form mutations were tested with mocks locally and real Hono/SQLite backend tests; no production user coursework or trading records were changed as test data.

Additional local regressions: all 27 sidebar routes render under API outage; dashboard control matrix and live P/L/settings/calculator browser tests pass. Evidence JSON/screenshots are in the ignored `.wrangler/strategy-audit/` directory of the release worktree.

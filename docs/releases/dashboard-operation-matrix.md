# Dashboard operational verification

Scope: /dashboard, its conditional cards, shared navigation controls and direct links. This is not an end-to-end certification of every page accessible from the sidebar.

Evidence categories: **Browser pass** means Chromium exercised the production build with synthetic API fixtures; **Calculation pass** means actual model/API code passed deterministic tests; **Live evidence** means observed production responses or telemetry. A fixture pass does not prove an external service works. The desktop browser-session tool failed to initialize because of the Windows filesystem sandbox; the user's logged-in browser session was not accessed.

| Feature | Evidence / status | Limits |
|---|---|---|
| Dashboard access and logout | Browser pass; production auth rejection checks from platform audit | Synthetic login; no password collected |
| API status indicator | Browser pass for success, outage and recovery | Measures API reachability only; uptime and ping claims removed |
| Greeting, clock and wisdom | Browser render and clock control check | Wisdom is static editorial content |
| Theme toggle | Browser pass both directions | Theme persists locally |
| Closed-deal P/L and win rate | Browser + calculation pass: negative, mixed-currency, failed-fetch and recovery cases | Closed exit-deal totals, not account equity or position-level realized returns; unknown currency labelled |
| Account count and connectivity | Browser pass; server heartbeat UTC regression | Counts connected/registered accounts, not a fabricated plan quota |
| Source and follower cards | Browser pass populated and missing data | Daily loss usage is labelled as such, not profit |
| Recent signal feed | Browser pass buy/modify and missing prices; existing nullable-signal suite | Copier execution itself not tested |
| Journal account selector and manual/automatic refresh | Browser pass; earlier independent-account regression retained | Latest 50 deals, not all-history analysis |
| Live positions and floating P/L | Existing four-state browser suite; real user-account snapshots observed in production | Test does not place or close any broker trade |
| Major-news tab and source links | Browser pass; shared macro-news classifier tests retained | Provider data availability and headline classification are not guaranteed |
| High-impact calendar | Browser pass; timezone/dedup/reminder tests retained | Feed freshness determines available future events |
| News/calendar failure handling | Browser pass outage and recovery | Last-known items explicitly identified on refresh failure |
| Market hours | Calculation pass winter/summer sessions and weekend boundaries; browser render | Typical FX windows only; broker-specific holidays not integrated |
| AI insight card | Browser rendering and destination verified | Live model generation and recommendation quality not certified |
| Pre-Trade Flight Check | Calculation + browser pass, including 10-deal gate and actual-date averaging | Descriptive sample of closed deals; no predictive edge claim |
| Strategy DNA | Calculation + browser pass, including absent hold time and R/R | Descriptive sample; exit side is not original position direction |
| Community Pulse | **Not operational: real feed absent** | Generated sentiment/win-rate values removed; explicit unavailable state |
| Telegram banner | Browser pass failure, retry, deep link and return-to-tab linked state | No actual Telegram linking or message delivery performed in this audit |
| Alert settings nudge | Browser pass settings target and dismissal | Full settings page operation is outside this dashboard matrix |
| Onboarding | Browser pass all three steps, CTA targets and persisted dismissal | Actual account creation and PropGuard setup not performed |
| Desktop/mobile navigation and links | Browser route/target checks, mobile drawer open/close, no page overflow, screenshots | Full downstream page workflows not certified |

## Corrections in this audit

Removed fabricated operational telemetry and community metrics; corrected negative P/L signs, currency handling, follower daily-loss labelling and invented account quota; added summary refresh and failure handling; corrected open/modify signal labels; enforced analytics sample sizes and unavailable measurements; fixed distinct-day averaging; replaced fixed UTC market windows with timezone-aware typical sessions; displayed Telegram/news failures; used server arrival time for broker-offset heartbeat freshness; added accessible mobile drawer control names.

## Reproduce

- node scripts/test-dashboard-models.cjs
- node scripts/test-platform-audit.cjs
- node scripts/test-news-positions.cjs
- python scripts/test-dashboard-features.py (Vite preview on 4175; TEST_BASE_URL can target deployed frontend with the same mocked APIs)
- Existing test-dashboard-render.py, test-dashboard-journal.py and test-live-positions-ui.py

Screenshots from the synthetic browser run are in .wrangler/dashboard-audit/desktop.png and mobile.png.

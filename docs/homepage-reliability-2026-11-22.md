# Homepage reliability correction — 22 November 2026

## Reproduced failures
On production, holding the global Telegram SDK request left document.body empty and no heading after five seconds. Aborting the LandingPage module produced a dynamic-import error and an empty body. Fresh normal requests worked, so these are reproduced failure conditions rather than a claim about the user’s exact connection. Light-mode supporting text was visibly low contrast.

## Correction
Load Telegram SDK only on the Mini App route, asynchronously with an eight-second error deadline, and await it before authentication. Load fonts without blocking rendering. Include homepage in startup bundle, provide a root error boundary with reload/home actions, and retain recovery HTML if the startup bundle cannot execute. Guard theme/referral storage access. Scope improved contrast to homepage and accommodate 320px navigation. Increment service-worker cache version and reject HTML responses masquerading as JS/CSS assets.

## Verification
Production build passes. Browser regressions cover unavailable fonts/Telegram, 320/390/768/1440 widths in both themes, muted text contrast >=4.5, seven public destinations, storage denied, failed route and startup bundle recovery, Telegram SDK initialization/auth ordering and error recovery. Cache regressions cover poisoned and valid JS/CSS cache entries and bad network content types. Telegram auth is synthetic in tests; no real user messages or trades were sent.

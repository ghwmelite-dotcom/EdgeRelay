# Homepage reliability correction — 22 November 2026

## Reproduced failures
On production, holding the global Telegram SDK request left document.body empty and no heading after five seconds. Aborting the LandingPage module produced a dynamic-import error and an empty body. Fresh normal requests worked, so these are reproduced failure conditions rather than a claim about the user’s exact connection. Light-mode supporting text was visibly low contrast.

## Correction
Load Telegram SDK only on the Mini App route, asynchronously with an eight-second error deadline, and await it before authentication. Load fonts without blocking rendering. Include homepage in startup bundle, provide a root error boundary with reload/home actions, and retain recovery HTML if the startup bundle cannot execute. Guard theme/referral storage access. Scope improved contrast to homepage and accommodate 320px navigation. Increment service-worker cache version and reject HTML responses masquerading as JS/CSS assets.

## Verification
Production build passes. Browser regressions cover unavailable fonts/Telegram, 320/390/768/1440 widths in both themes, muted text contrast >=4.5, seven public destinations, storage denied, failed route and startup bundle recovery, Telegram SDK initialization/auth ordering and error recovery. Cache regressions cover poisoned and valid JS/CSS cache entries and bad network content types. Telegram auth is synthetic in tests; no real user messages or trades were sent.

## Original homepage restoration
The user clarified that the reported issue was the replacement of the original homepage design. Restored the full landing page from c2db486 (before the strategy migration): branded navigation, copier hero and terminal illustration, ecosystem, features, academy, blog and footer. Kept the startup reliability changes. Updated retired strategy/EA-builder copy for the two current courses and replaced unsupported personal testimonials with workflow cards. Demo signal data is labelled. The service worker now uses v12.

Production build and browser checks pass at 320, 390, 768 and 1440 widths in both themes. Restored navigation and repeated login/register openings are tested; the modal is mounted per opening so its initial mode is correct. Screenshots of the restored desktop and mobile hero were inspected. The earlier numeric contrast test applied to the replaced minimal layout; it is not a comprehensive contrast audit of this restored design. No real registration, trade execution or message delivery was performed.

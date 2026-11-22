# Homepage interaction audit — 22 November 2026

## Fixed
- Signed-in homepage Login/Dashboard, Launch App and Get Started buttons now open the dashboard instead of showing authentication again.
- The Range Breakout Guide footer link now uses document navigation. React Router previously treated the static guide as an unknown application route and returned home.
- Authentication dialog supports Escape, keyboard focus containment and focus return. Blog filters expose selected state.
- Service worker cache advanced to v13.

## Evidence
`python scripts/test-homepage-actions.py` passed against the production build: every distinct rendered homepage link destination; section anchors; all six blog filters; risk disclosure; theme toggle; scroll-to-top; both Get Started buttons; desktop and mobile authentication CTAs; mobile navigation; form-mode switching; mismatched registration passwords; keyboard focus; rejected/network-failed login; synthetic successful login; dashboard refresh; signed-in Launch App.

Live public pages, all ten blog articles, footer destinations and the extensionless guide returned expected content. The Google button reached accounts.google.com sign-in; Google consent and completion were not exercised. No real registration was submitted. Local preview serves the extensionless static guide using a test route because Cloudflare supplies that clean URL in production.

The user signed in themselves in the internal browser. Their real dashboard rendered account data and signal history, persisted across refresh, and opened the academy. No trading or account configuration was changed.

Production build, service-worker cache tests and all ten nullable-signal dashboard regressions passed. The old dashboard fixture was updated to include the current community pulse response fields and wait for its asynchronous signal row.

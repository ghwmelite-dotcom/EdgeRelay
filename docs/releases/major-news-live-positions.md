# Major news and live positions

The dashboard and Telegram digest share a conservative major-news classifier: NFP, CPI, FOMC decisions/published materials and comparable major economic releases or central-bank decisions. General geopolitical, company and commodity headlines are excluded. Routine analysis, previews and unsupported speculation are excluded. High-impact calendar events cover the major currencies, including JPY. This headline-based rule set may miss ambiguous reports; it does not predict price direction or guarantee impact. Existing trade, risk and account alerts remain governed by their existing preferences.

## MT5 update required

Download TradeJournal Sync v1.10 from Downloads. Replace the previously attached journal EA, retaining the same account ID, API key, secret, endpoint and WebRequest allowlist. Keep MT5 connected. Do not run both journal versions on the same account. The EA only reads account/position data and makes HTTP requests; it does not place, modify or close orders.

Version 1.10 sends complete snapshots every 15 seconds, including empty snapshots after all positions close. Dashboard refreshes every 15 seconds and marks values stale after 45 seconds or a network failure. Missing telemetry is never shown as zero. Account profit/equity/balance use the broker account currency. Per-position profit and swap are separate; commissions are not estimated.

## Implementation and release

Migration 0024 stores only the latest snapshot per account. Requests have a 128 KiB cap, strict schema, UTC timestamp validation, API key authentication and HMAC-SHA256 over the exact UTF-8 body. SQLite atomically rejects repeated/out-of-order timestamps. Reads require account ownership. Source bundles contain the added positions header. The compiled download uses the versioned R2 key ea-builds/TradeJournal_Sync_v1.10.ex5.

The deployment workflow now publishes journal-sync and notification-digest, and requires telemetry regression checks and the live-position schema before deploying its dependent workers.

## Validation

- Shared, frontend, API, journal-sync and notification-digest TypeScript checks; production frontend build.
- Node regression suite: major-news inclusion/exclusion and deduplication; high-impact JPY calendar; signed telemetry, tamper/replay/clock validation, ownership, stale/empty/missing snapshots and rate limiting; Telegram retry and successful-delivery deduplication with mocked transport.
- Browser regression: missing telemetry, account-currency profit, stale network state and closed-position clearing using synthetic data.
- MetaEditor compilation: zero errors, zero warnings.

Actual user-account floating P/L requires the updated EA to be attached and sending snapshots; synthetic tests do not establish a live broker feed.

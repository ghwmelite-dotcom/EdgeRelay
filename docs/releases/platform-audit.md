# Targeted platform audit

Scope: deployed main branch authentication, browser API recovery, social mutation authorization, journal batch acknowledgement, source credential-pattern scan, and existing news/live-position regression suite. This is not a complete platform certification.

## Corrected

1. High: refresh verified token signatures without requiring an existing session, allowing a logged-out token to recreate a session. Refresh now checks session presence. Session retention covers the existing 30-day refresh grace; access-token expiry remains unchanged. Unique token IDs prevent same-second refresh from reusing the old token. Existing sessions that already expired require login again.
2. High: social mutations checked signatures but ignored session revocation. They now use the common session-checking middleware.
3. High: Google OAuth accepted missing state and did not bind it to the initiating browser. A secure HttpOnly SameSite=Lax state cookie is required, together with the one-time KV record. Linking by email requires Google's verified_email flag. Actual Google sign-in still needs an interactive smoke test; automated tests mock the provider.
4. Medium: malformed JWTs could throw server errors. Parsing now fails closed, with mandatory subject/issued/expiry claims and expected algorithm/type.
5. High reliability: journal database errors were counted as duplicates and acknowledged with HTTP 201, making the EA discard unsaved records. Storage failure now returns 503; existing EA queue retries and ignores previously saved duplicate tickets. No new EA required. Disabled accounts cannot submit journal batches or heartbeats.
6. Medium: network errors or HTML gateway errors rejected shared API promises, potentially leaving loading states stuck. They now return structured errors. Temporary refresh outages preserve login, and logout/account changes cannot be reversed by a delayed refresh response.

7. Medium: notification preference updates could succeed without storing a row, and accepted invalid input types. Validated atomic upserts now preserve partial updates and save first-time preferences.

## Evidence

Run node scripts/test-platform-audit.cjs for signature/claim parsing, token uniqueness, revoked-session refresh/social rejection, browser state validation, verified email, retryable D1 errors, duplicate retries, network/HTML responses, temporary refresh failure and logout/refresh race. The suite is required by GitHub Actions alongside news/telemetry regression tests. Existing browser regression scripts and TypeScript/build checks cover the changed web integration. No real Telegram messages, payments or orders are sent by these tests. A narrow tracked-source credential-pattern scan found no matches; Git history and runtime secrets were not audited.

## Remaining findings and boundaries

- Legacy journal-history signatures cover ticket IDs and timestamps, not the full trade contents, and do not enforce timestamp freshness. HTTPS remains the transport boundary. Migrating this legacy protocol needs a coordinated EA rollout; live-position telemetry already signs the entire body and checks freshness.
- The existing general migration loop suppresses SQL failures. The new live-position schema has a separate strict gate, but the old migrations need a proper recorded migration baseline before changing the whole release process.
- No end-to-end payment, copy-trade execution, broker order modification or interactive Google sign-in was attempted. Browser regression fixtures do not prove those integrations.

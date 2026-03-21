# EdgeRelay — Edge Signal Copier (The VPS Killer)

## Product Vision

EdgeRelay is an edge-native trade signal copier built entirely on Cloudflare's global network. It eliminates the need for VPS hosting by leveraging 300+ Cloudflare PoPs for sub-10ms global signal propagation.

### Target Users
1. **Primary:** Prop firm traders managing 3-20 funded MT5 accounts across multiple brokers
2. **Secondary:** Signal providers broadcasting trades to 10-500+ subscribers
3. **Tertiary:** Retail traders copying across personal + prop accounts

### Revenue Model
| Tier | Price | Includes |
|------|-------|----------|
| Starter | $19/mo | 1 master + 3 followers |
| Pro | $49/mo | 1 master + 10 followers, equity protection, news filter |
| Unlimited | $99/mo | Unlimited accounts, API access |
| Signal Provider | $149/mo | Broadcast to unlimited subscribers |

**Target:** 300 users at avg $45/mo = $13.5K MRR within 12 months.

## Technical Architecture

### Stack
- **Backend:** Cloudflare Workers (TypeScript) + Hono
- **State:** Cloudflare Durable Objects (per-account persistent state)
- **Database:** Cloudflare D1 (users, accounts, trade history)
- **Cache:** Cloudflare KV (sessions, rate limiting, feature flags)
- **Storage:** Cloudflare R2 (EA files, trade logs)
- **Frontend:** React 18 + Vite + TypeScript on Cloudflare Pages
- **Payments:** Stripe
- **MQL5 EA:** Custom Expert Advisors for MT5

### Signal Flow
1. Master EA detects trade → signs with HMAC-SHA256 → HTTPS POST to nearest CF PoP
2. Signal-ingestion Worker validates, deduplicates, routes to AccountRelay DO
3. DO evaluates follower rules (equity guard, lot sizing, symbol mapping)
4. Approved signals pushed to follower via HTTP long-poll (MVP) / WebSocket (Phase 2)
5. Follower EA executes trade, reports result back

## MVP Scope (Phase 1)
- Master EA: capture trades, sign, send via HTTPS
- Follower EA: poll for signals, execute, report
- Signal ingestion Worker + AccountRelay DO
- Basic dashboard: accounts, signal log, connection status
- User auth + Stripe billing (Starter/Pro plans)
- Equity protection + symbol suffix handling

## Phase 2
- WebSocket follower connections
- Signal Provider tier
- cTrader/DXTrade support
- Mobile app
- Telegram bot

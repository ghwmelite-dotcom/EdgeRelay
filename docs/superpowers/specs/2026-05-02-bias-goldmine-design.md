# `/bias` Goldmine — Design Spec

**Date:** 2026-05-02
**Status:** Approved (brainstorm complete)
**Author:** Claude (with Oz)
**Owner:** TradeMetrics Pro / EdgeRelay

---

## 1. Goal

Turn `https://trademetricspro.com/bias` from a useful bias-engine view into the page traders open first thing every morning and don't want to leave. The gravitational pull is a personalized, journal-aware "Sage" briefing wrapped in three supporting forces (live pulse, hybrid crowd consensus, one-tap execution). Everything serves a single narrative spine.

The page must feel like one organism — Sage is the spine, and every other band visibly connects back to her narrative. No orphan widgets.

## 2. Decisions Locked

| Question | Choice |
|---|---|
| Capabilities | All four: **Pulse**, **Sage**, **Crowd**, **Execute** — seamlessly integrated |
| Layout pattern | **Daily Brief Scroll** — narrative top-to-bottom |
| Sage voice | **Mentor** — Socratic, asks questions, builds the user's thinking |
| Personalization depth | **L2 journal-aware** with **L1 fallback** for non-journaled users; **L3 live-position aware** as Phase 3 |
| Crowd data source | **Hybrid** — broker positioning baseline + EdgeRelay platform overlay; divergence is the signal |
| Cadence | **Anchor + Deltas** — frozen morning brief, live pulse strip, "since you last looked" delta on material change |
| Shipping approach | **Hero-first** — Sage L2 to full polish first, then layer Crowd / Pulse / Execute around it |

## 3. Page Anatomy (top → bottom)

The page is a vertical narrative scroll of eight bands. Each band has one job and connects back to Sage.

1. **Cover band.** "Your ICC Brief · Friday, 02 May" + Listen 🔊 (Phase 1.5+ only) + Ask Sage chip (stub link in Phase 1) + anchor timestamp.
2. **Anchor brief (Sage L2).** Mentor voice. Journal-joined narrative. Max 3 paragraphs (~120 words). Exactly one Socratic question. The hero of the page.
3. **Delta block.** Renders only when material change has occurred since the anchor was generated. "Since 06:30 this morning…" Sage tells the user what flipped, which of their positions matters, what to reconsider.
4. **Pulse strip.** Live SSE event tape — phase flips, Indications, alerts, ORB events, platform-positioning crossings. Auto-scroll, never blocks.
5. **Asset constellation.** The existing 5-card grid (`AssetBiasCard`) lightly redesigned. Sage's pick of the day gets a small star marker so the constellation visually links to the brief.
6. **Crowd consensus.** Per-asset hybrid card. Broker positioning bar + EdgeRelay overlay (when N ≥ 50) + Sage's one-line divergence gloss.
7. **Today's plans.** Execute-ready trade plans, one per asset where Sage greenlit. Auto-sized to user's account at default 1% risk. One-tap "Send to MT5" via EdgeRelay EA, one-tap "Save to Journal."
8. **Methodology + accuracy footer.** Preserved from current page.

### Visual linkage

Sage's narrative is the spine. Every other section visibly connects back:

- The asset constellation's star marker on Sage's pick.
- The crowd consensus card's Sage-italicized divergence gloss.
- The plans section only renders cards for assets Sage greenlit (silence is a feature).

## 4. System Architecture

### Preserved
- `signal-ingestion`, `account-relay`, `journal-sync`, `news-fetcher`, `notification-digest`, `api-gateway` workers
- 5-asset grid, bias engine, 4H/1H phase computation, accuracy windows, backtest, track record, alerts, push subscriptions, @edgerelay public broadcast
- `journal_trades`, `bias_history`, existing alert tables

### New / extended

| Component | Type | Purpose |
|---|---|---|
| `bias-sage` | New worker | Anchor brief generation, SSE streaming endpoint, materiality watcher, delta generation, divergence gloss, audio TTS endpoint |
| `crowd-fetcher` | New worker | OANDA + MyFXBook + IG positioning ingestion every 30 min |
| `account-relay` | Extended | Periodic platform-positioning aggregator (5-min buckets, anonymized at write) |
| `journal-sync` | Extended | Materializes `user_bias_stats` per (user, symbol, ICC phase) on every sync; also back-links closed deals to `journal_plans` rows |
| `api-gateway` | Extended | New routes: `/v1/bias/sage/anchor` (SSE), `/v1/bias/sage/delta`, `/v1/bias/pulse/stream` (SSE), `/v1/bias/crowd/:symbol`, `/v1/bias/plan/send` |

### Data flow at user wake-time

```
[cron: user-local 06:30] → bias-sage worker
  ↓
  parallel fetch (~200ms):
    - bias engine snapshot (D1: bias_state)
    - user context (D1: users)
    - user_bias_stats (D1)
    - yesterday's accuracy (D1: bias_history)
    - prior anchor brief (KV: sage_briefs)
  ↓
  build prompt → Claude Sonnet 4.6 (streamed)
  ↓
  write to KV (anchor:{user}:{date}, 36h TTL)
  write to D1 (sage_briefs row)
  ↓
  trigger lazy TTS (Workers AI) → R2

[user opens page]
  ↓
  GET /v1/bias/sage/anchor (SSE)
  → stream from KV cache (instant) OR generate live (typing effect on first morning load)
```

### Data flow on materiality

```
[bias-engine candle close] → emits event
  ↓
materiality watcher in bias-sage:
  - is this a phase flip on any user's watchlist?
  - is this an Indication confirm on a previously-neutral asset?
  - did regime sentiment cross?
  ↓ if yes
compute inputs_hash for affected user
  ↓
if hash != last_delta_hash AND deltas_today < 4
  → generate delta (Claude Sonnet)
  → write KV delta:{user}:{date}
  → push SSE event to user's open page tabs
```

## 5. Sage L2 Brief Generation

### Inputs (assembled in parallel)

1. **Bias engine snapshot** — current 4H phase, 1H phase, structure, retrace %, score, session for all 5 assets.
2. **User context** — name, timezone, watchlist (subset of 5 if customized), preferred sessions.
3. **Journal stats (L2 magic)** — `user_bias_stats` materialized: per `(user_id, symbol, icc_phase)` → `n_trades`, `win_rate`, `avg_r`, `last_trade_at`. Built by joining `journal_trades` against `bias_history`.
4. **Yesterday's accuracy** — per-symbol bias hit/miss for the last completed session.
5. **Prior anchor** — yesterday's brief, for narrative continuity.

### LLM

- **Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6`). Cost/quality sweet spot for narrative.
- **Streaming:** SSE to client, "typing" feel on first morning load.
- **Prompt caching:** system prompt + voice spec are cached (heavy reuse across all users). Per-user inputs are not cached (unique).

### Structured output (the "greenlit" contract)

Sage emits both prose and structured intent in a single response. Format:

```
<brief>
Morning, Oz. Look at this:
... markdown narrative ...
</brief>
<intent>
{"greenlit": [{"symbol":"EURUSD","direction":"long","conviction":"high"}],
 "skip":     [{"symbol":"NAS100","reason":"bear-flip-no-edge"}],
 "watch":    [{"symbol":"XAUUSD","reason":"continuation-thinning-rr"}],
 "hero_symbol": "EURUSD"}
</intent>
```

The `<brief>` block is what the user reads. The `<intent>` block is what downstream UI binds to:

- **Today's Plans band** renders one card per `greenlit` symbol — no other symbols get plan cards.
- **Asset constellation** renders the star marker on `hero_symbol`.
- **Skipped symbols** are visible in the constellation grid but greyed slightly with a dashed border, so the user sees what Sage chose not to recommend.

The `<intent>` block is parsed server-side, validated against a JSON schema, persisted in `sage_briefs.brief_md` alongside the prose, and exposed via the `GET /v1/bias/sage/anchor` response. If parsing fails, the page renders the brief without plan cards (degraded but not broken) and an alert fires for the team.

### Prompt structure

- **System block (cached):**
  - Mentor voice spec — Socratic, asks questions, builds thinking, never lectures
  - Hard rules: never invent numbers; cite stats only when present; ask exactly one Socratic question; max 3 paragraphs; ~120 words; reference user's stats verbatim when they exist; no financial-advice language; one disclaimer woven once at the end of the daily anchor only, never mid-paragraph; degrade to L1 framing when journal stats are sparse
  - Output format: markdown, with explicit guidance on bold-on-symbol-names and italic-on-questions
- **User block (uncached):** structured JSON of all five inputs above.
- **Assistant prefill:** `Morning, {name}. ` — anchors voice and avoids opening drift.

### L1 fallback

If `user_bias_stats` has fewer than 3 trades on **any** asset in the user's watchlist (across all ICC phases), the prompt switches to L1 mode: still personalized by watchlist/timezone, but no journal stats cited. Sage explicitly invites the user to connect:

> *"Once you've journaled a few trades, I'll start telling you which setups YOU win and lose."*

### Audio (Phase 1.5+)

After the text generates, a follow-up call hits Workers AI (`@cf/myshell-ai/melotts` first, with 11labs as quality-driven upgrade path) to produce a ~50–60s narration. Written to R2 under `briefs/{user_id}/{date}.mp3`. Listen button streams it. Generated lazily on first click, not eagerly. Phase 1 ships without audio — the Listen button is hidden, not faked.

### Delta generation

Same model and voice rules, with one extra system instruction: "Acknowledge the morning anchor explicitly. Tell the user what *changed*, not what is. Connect back: 'My morning brief said X — here's the update.'" Capped at 4/user/day.

### Divergence gloss (Crowd → Sage)

Per asset where divergence (EdgeRelay vs broker) ≥ 8 percentage points and platform N ≥ 50, a small Haiku 4.5 call (~30 tokens out) produces one sentence. Cached per `(symbol, hour)` — shared across all users.

## 6. Crowd Hybrid Pipeline

### Broker baseline

Three free public retail-positioning sources, fetched by `crowd-fetcher` every 30 min:

- **OANDA Open Position Ratios** (REST, JSON) — majors, XAU, indices
- **MyFXBook Community Outlook** (REST, JSON) — broader symbol coverage, slightly noisier
- **IG Client Sentiment** (scraping with RSS fallback) — weekly cadence; cached longer

Each row is `(source, symbol, fetched_at, long_pct, n_positions)`. Display computes the **median across available sources** to avoid any one outlier skewing. Source-by-source breakdown surfaces on hover/tap.

### Platform overlay

- **EdgeRelay EA positions:** the `account-relay` worker exposes a periodic aggregator. Every 5 min, it buckets all open follower positions into `(symbol, direction)` counts, anonymized at write — no `user_id`, only counts.
- **Journal-implied direction:** for users without the EA, last 24h journal trades count as a positional view. Aggregated identically.

### Display rule (N gating)

- **N ≥ 50:** show EdgeRelay overlay alongside broker baseline; Sage may call divergence
- **N < 50:** hide EdgeRelay number; show only broker baseline; Sage stays silent on divergence

This means **day 1 is a polished broker-sentiment view** — no fake numbers, no apology copy. Each symbol "graduates" naturally as platform N grows.

## 7. Pulse Strip

A unified SSE feed at `/v1/bias/pulse/stream` aggregates:

- ICC phase flips (bias-engine on candle close)
- Indication / Correction / Continuation confirms
- Alert firings (existing alert system)
- ORB events (already shipped)
- Platform-positioning crossings ("14 EdgeRelay users entered EUR in last 5 min")

Client subscribes once on page mount. Strip auto-scrolls newest-on-top, keeps last 50 events in memory. CSS-only animation. SSE drops fall back to 30s polling after 3 failed reconnects.

## 8. Execute Pathway

### Where plans come from

The existing `TradePlanCard` component is repurposed. It renders one card per symbol in the brief's `<intent>.greenlit` array (see Section 5 · Structured output). Symbols not greenlit get no plan card — silence is a feature.

### Auto-sizing

On render, the plan card pulls the user's connected MT5 account from `accounts` (already linked via the EA setup flow), then calls existing `lotSizing.ts` from `account-relay` with: account balance, the user's default risk preference from `user_preferences.default_risk_pct` (already a settings field; defaults to `1.0` if unset), SL pip distance, symbol contract specs. Lot size displays next to the RR. User can tap "Edit size" to slide between 0.25%–2% before sending; the override is per-plan and does not change the default preference.

### Send flow

1. Click → frontend `POST /v1/bias/plan/send` with `{ asset, entry, sl, tp, lot, idempotency_key }`
2. API gateway validates user has an active EA-linked account; returns 412 + "Connect MT5 first" CTA otherwise
3. Constructs `SignalPayload` with reserved `magic_number = ICC_BIAS_MAGIC` (distinct from copy-trade signals so journal can attribute correctly)
4. Hands to `account-relay` Durable Object → fans to user's follower EA on next long-poll → MT5 places the order
5. Returns signal ID immediately. Frontend shows "Sent · waiting for fill…" then resolves to "Filled at X.XXXX" via existing `ExecutionResult` channel

### Idempotency & safety

- 3-second client-side cooldown
- `idempotency_key = hash(user_id, asset, anchor_brief_id)` — opening two tabs and double-clicking still produces one trade
- `account-relay` already has duplicate-signal guards
- PropGuard halt state blocks the button with the reason shown — Sage already reads `propguard_state`

### Save plan to journal

Separate path. Writes a `journal_plans` row. When `journal-sync` later sees an `out` deal that matches by symbol + magic + entry tolerance, it back-links to the plan. Closes the loop: tomorrow's brief can say *"You took the plan I gave you yesterday — closed +1.8R, nice."*

### Failure modes (Execute)

- No EA connected → "Connect EA" CTA; plan still copies as text or saves to journal
- EA offline (last poll > 60s) → button greyed with "EA last seen 4m ago"
- Broker rejects → red toast + Sage adds a one-liner in next delta: *"Your EUR send was rejected — spread was 4.2 pips."*
- PropGuard halt → button blocked with halt reason

## 9. Data Model

New D1 tables in migration `0023_bias_goldmine.sql`:

```sql
-- per-user analytics, materialized from journal_trades × bias_history
CREATE TABLE user_bias_stats (
  user_id     TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  icc_phase   TEXT NOT NULL,    -- 'BULL_INDICATION', 'BULL_CONTINUATION', 'BEAR_FLIP', etc
  n_trades    INTEGER NOT NULL,
  n_wins      INTEGER NOT NULL,
  total_r     REAL NOT NULL,
  last_trade_at INTEGER,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, symbol, icc_phase)
);
CREATE INDEX idx_ubs_user ON user_bias_stats(user_id, updated_at DESC);

-- broker positioning baseline (multi-source)
CREATE TABLE crowd_positioning (
  source       TEXT NOT NULL,    -- 'oanda' | 'fxbook' | 'ig'
  symbol       TEXT NOT NULL,
  long_pct     REAL NOT NULL,
  n_positions  INTEGER,
  fetched_at   INTEGER NOT NULL,
  PRIMARY KEY (source, symbol, fetched_at)
);
CREATE INDEX idx_cp_latest ON crowd_positioning(symbol, fetched_at DESC);

-- platform-side aggregated positioning (anonymized)
CREATE TABLE platform_positioning (
  symbol       TEXT NOT NULL,
  long_count   INTEGER NOT NULL,
  short_count  INTEGER NOT NULL,
  bucket_at    INTEGER NOT NULL,  -- 5-min bucket epoch
  PRIMARY KEY (symbol, bucket_at)
);

-- per-user briefs (anchor + delta history)
CREATE TABLE sage_briefs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK(kind IN ('anchor','delta')),
  brief_md      TEXT NOT NULL,
  audio_r2_key  TEXT,
  inputs_hash   TEXT NOT NULL,
  trigger       TEXT,             -- 'wake' | 'phase_flip' | 'alert' | 'visit'
  generated_at  INTEGER NOT NULL,
  level         TEXT NOT NULL CHECK(level IN ('L1','L2'))
);
CREATE INDEX idx_sb_user_recent ON sage_briefs(user_id, generated_at DESC);

-- plans Sage suggested → tracked for journal back-link
CREATE TABLE journal_plans (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  brief_id      TEXT REFERENCES sage_briefs(id),
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL,
  entry         REAL NOT NULL,
  sl            REAL NOT NULL,
  tp            REAL NOT NULL,
  lot           REAL NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('saved','sent','filled','rejected','closed','expired')),
  signal_id     TEXT,
  created_at    INTEGER NOT NULL,
  closed_at     INTEGER
);
CREATE INDEX idx_jp_user_recent ON journal_plans(user_id, created_at DESC);
CREATE INDEX idx_jp_signal ON journal_plans(signal_id);
```

## 10. Cache Layout (KV namespace `BIAS_SAGE`)

| Key | TTL | Purpose |
|---|---|---|
| `anchor:{user_id}:{yyyy-mm-dd}` | 36h | Current anchor brief (overlap window for late risers) |
| `delta:{user_id}:{yyyy-mm-dd}` | 24h | Current delta block, overwritten on regen |
| `divergence:{symbol}:{yyyy-mm-dd-hh}` | 1h | Sage's per-symbol crowd gloss, shared across users |
| `pulse:recent` | rolling | Last 50 events for new SSE subscribers |

## 11. Materiality (delta regen triggers)

Priority order:

1. Phase flip on any of the user's watchlist assets *(the big one)*
2. Indication confirm on a previously-neutral asset
3. User's open position crosses a structural level *(Phase 3 / L3 only)*
4. Alert fires on the user's subscribed list
5. Regime flip (bull→bear count crosses on overall sentiment)

**Cost gate.** Hard cap of 4 deltas/user/day. After cap, materiality events queue silently and feed tomorrow's anchor.

**Inputs-hash dedup.** Each delta computes a hash of its triggering input snapshot (phase state + open positions + last brief id). If the same hash already produced a delta in the last 60 min, no new generation — same delta is reused. Prevents twitchy re-renders during volatile candles.

## 12. Phasing

### Phase 1 — Sage L2 hero (weeks 1–3)
- Migration `0023_bias_goldmine.sql`
- New `bias-sage` worker: anchor generation, SSE streaming, materiality watcher, delta generation
- `user_bias_stats` materialization on every journal-sync completion + nightly catch-up cron
- Frontend rewrite of `BiasEnginePage.tsx`: Cover, Anchor, Delta bands, methodology footer (other bands stubbed but live)
- L1 fallback prompt path
- Listen button hidden in Phase 1 — no fake.

### Phase 1.5 — Audio (week 4)
- Workers AI TTS via melotts; 11labs upgrade path documented
- R2 storage, lazy generation
- Listen button activated

### Phase 2 — Crowd + Pulse + Execute polish (weeks 4–5, can overlap 1.5)
- New `crowd-fetcher` worker (OANDA + FXBook + IG)
- Platform positioning aggregator (extends `account-relay`)
- Asset constellation with Sage's star linkage
- Crowd consensus band with divergence gloss
- Pulse strip SSE endpoint + client subscription
- `journal_plans` table + plan-send pathway through `account-relay`
- Plan attribution back-link in `journal-sync`

### Phase 3 — L3 live-position aware (weeks 6+)
- Live MT5 position read from EdgeRelay EA (extends existing position-report channel)
- Sage's brief opens with position-aware language ("you're long EUR from 1.0815…")
- Materiality trigger #3 activates (open position crosses structural level)

### Rollout

Behind a `bias_v2` feature flag. Internal test accounts (3 admin users) for 3 days → 10% of users week 4 → 50% week 5 → 100% week 6. Old `BiasEnginePage` stays as a `?legacy=1` escape hatch through Phase 2, deleted after Phase 3.

## 13. Fallbacks (graceful degradation)

| Subsystem fails | What user sees |
|---|---|
| LLM 5xx / timeout | Yesterday's brief renders with "served from cache" chip; retry on next page load |
| Journal stats empty | L1 prompt path; CTA in brief: "connect MT5 to unlock journal-aware briefings" |
| Bias engine stale > 30 min | Brief renders with "engine paused" banner; numbers grey out; Pulse frozen |
| Broker source 4xxs | Median computed from remaining sources; tooltip on bar |
| All broker sources down | Crowd band shows "Crowd data unavailable" placeholder; rest of page unaffected |
| TTS fails | Listen button shows "Audio unavailable"; text brief unaffected |
| Pulse SSE drops | Auto-reconnect with backoff; falls back to 30s polling after 3 failed reconnects |
| EA offline | Send-to-MT5 button greys with "EA last seen Xm ago"; copy + save-to-journal still work |

## 14. Testing

### Unit (Vitest, 80% target on `bias-sage`)
- Prompt builder (input shape → expected JSON)
- Materiality hash function
- Lot sizing math
- Divergence threshold logic
- Broker-source median calculation

### Integration (Miniflare)
- End-to-end "anchor brief generates with mock LLM"
- Broker-fetcher with recorded fixtures (one fixture per source)
- Journal-plan → `account-relay` signal fan-out using existing `AccountRelay` test harness

### LLM eval suite (`evals/sage/`)
30 hand-crafted (`bias_state, journal_stats, expected_qualities`) cases. Each generation scored on:
- Cites correct stats (when present)
- Asks exactly one Socratic question
- Max 3 paragraphs
- No hallucinated tickers or numbers
- Mentions degraded mode when journal sparse
- No financial-advice language
- Pass threshold: 90%
- Runs on every PR touching prompt or worker

### Visual / snapshot
- Vitest + happy-dom snapshot tests for the 8 page bands
- Playwright visual regression at desktop + mobile viewports

### Live-shadow phase
Before 10% rollout: generate briefs for all 3 admin accounts daily for 5 days, log to a Slack channel for human review. Catches voice/quality drift before real users see it.

## 15. Success Metrics (post-launch)

| Metric | Target |
|---|---|
| DAU on `/bias` | 2× pre-launch within 30 days |
| Median session time on `/bias` | > 90s |
| Brief listen-rate | > 30% of opens (Phase 1.5+) |
| Plans sent / brief generated | > 15% |
| 7-day retention of journaled users | improvement vs. control (the L2 moat) |

## 16. Out of Scope

Explicitly **not** in this spec:
- Mobile app surfaces (web responsive yes; native no)
- Multi-language briefs (English only at launch)
- Sage answering arbitrary chat questions (Ask-Sage chip is a stub link in Phase 1)
- Backtesting Sage's brief recommendations (Track Record page already covers engine accuracy)
- Voice cloning / custom voices
- Public-facing brief sharing (Phase 4+)
- Symbol set expansion beyond current 5 (Phase 4+)

## 17. Open Questions

These do not block writing the implementation plan but should be confirmed during execution:

- **Sage system prompt — final wording** drafted during Phase 1 implementation; iterated against the eval suite. The 90% pass threshold gates rollout, not the wording itself.
- **TTS provider final choice** (melotts vs 11labs) — Phase 1.5 spike. Cost-per-minute and voice quality reviewed against 5 sample briefs.
- **Materiality cap of 4 deltas/day** is a guess; instrument and revisit based on actual delivery distribution after week 1 of internal testing.
- **N ≥ 50 threshold for divergence display** is also a guess; could be sliced per-asset (some symbols have more EdgeRelay activity than others). Revisit with real data.
- **Where does the "Listen" audio play?** Inline player vs. dock vs. modal. Decided in Phase 1.5 design pass.

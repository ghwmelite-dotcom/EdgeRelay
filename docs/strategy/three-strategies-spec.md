# Three Strategies v1 — executable product contract

## Sources and precedence
Use the supplied written playbook and corrected 44:08 Scarface Trades course, with visible ownership/channel attribution. The user's later instruction supersedes the original stock clock: instrument-specific broker/venue sessions must be converted to UTC. XAUUSD and USDJPY are primary practice instruments. Original diagrams/PDF are labelled source references. See source-reconciliation.md and source-manifest.json.

## Sessions
Require UTC anchor, venue close, predeclared cutoff, source and verification for the selected date. A continuous contract needs an explicit daily reference; do not invent an opening bell. The cutoff must follow the first ten minutes and cannot exceed the venue close. Check actual instrument holidays, maintenance and weekend availability. A complete explicitly declared pre-session interval is required only for setup 3; missing/closed minutes invalidate it. Do not use US stock calendar restrictions globally. Preserve one UTC risk day across accounts; overnight sessions do not reset the daily entry allowance.

## Setups
1. Opening range: first five complete minutes after the anchor; later session-aligned 5m breakout, earliest anchor +10 minutes.
2. Previous day: previous complete provider day with recorded cutoff, no stub; session open strictly inside PDH/PDL; earliest confirmation anchor +5 minutes.
3. Pre-session: complete declared interval ending at the anchor, excluding the opening candle. Opening gap outside skips; equality alone is not a breakout. Earliest confirmation anchor +5 minutes.

## Shared execution and risk
Strict three-candle 15m pivots confirmed only after the right candle closes. Last two highs AND lows rising means buy; both falling means sell; mixed/equal/missing means skip. Recheck at breakout and entry. Strict completed 5m close beyond selected edge. Only the next five completed 1m candles can trigger: touch edge, close back beyond it, directional candle body. Wrong-side close cancels; equality consumes a candle. Cancelled/expired first attempt ends the chosen setup that day. Entry next 1m open; invalidating gap skips. Stop one actual tick beyond trigger; reject broker minimum-distance conflicts. Outward tick-rounded 2R gross target; touching/crossing nearest premarked obstacle skips. At most 0.5% current demo-equity risk including costs, 1% daily net-loss stop, one entry across symbols/accounts and one position. Round quantity down using verified linear account-currency tick economics, min/step/max and margin cap. Nonlinear contracts are unsupported by this sizer. No partials, stop widening, trailing, break-even changes, martingale or grid. Exit at stop, target or declared cutoff; ambiguous historical stop/target bars record stop-first. Relevant high-impact news blackout inclusive ten minutes each side; unknown inputs block eligibility.

## Product implementation
Shared pure engine; progressive synthetic replay and schema-validated same-provider imports; three fixed strategy catalog entries; twelve versioned lessons and server-validated quizzes; owner-scoped preparation/skip/review records with UTC session evidence; dashboard entry points; Sage context; Telegram /strategy. Imported broker fills and old course/generation history remain unchanged. Legacy ICC routes redirect and its components/scenarios/scoring are removed. Automatic EA generation/optimization/purchase endpoints return 410 without side effects.

## Evidence boundary
This release is education and review, not order automation or proof of an edge. Built-in examples are synthetic. Import provenance and checklist verification are self-reported. Completing lessons does not establish live-capital readiness. Review a varied example set, an untouched chronological test and demo forward evidence separately per provider and market. Release test evidence is recorded in release-verification.md.

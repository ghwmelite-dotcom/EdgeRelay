export const PLAYBOOK_PAGES = [
  {
    title: "Three strategies. One clear sequence.",
    lead: "MARK → BREAK → RETEST → SIZE → ENTER → EXIT",
    diagram: "overview",
    steps: [
      [
        "1 • First five-minute range",
        "Mark the 09:30–09:35 New York candle. Trade a later break and retest of its high or low. Setup: pages 4–5.",
      ],
      [
        "2 • Previous-day high / low",
        "Mark the previous completed day, using the correct broker or exchange cutoff. Trade today’s break and retest. Setup: pages 6–7.",
      ],
      [
        "3 • Pre-window high / low",
        "Mark the 04:00–09:30 New York range. Trade its break and retest after 09:30. Setup: pages 8–9.",
      ],
      [
        "Read once, then follow the card",
        "Complete the common preparation and risk steps on pages 2–3. Follow ONE strategy per practice session. Use pages 10–12 for management, examples and the final checklist.",
      ],
    ],
    watch:
      "For FX majors, gold, silver and BTC perpetuals. The source demonstrates stocks. These exact cross-market practice rules are unvalidated adaptations, not proven profitable systems. USD is the example currency. Practise in demo first.",
    tag: "Start here",
  },
  {
    title: "Set up your screen before the session.",
    lead: "DO THESE SEVEN STEPS BEFORE LOOKING FOR AN ENTRY.",
    diagram: "screen",
    steps: [
      [
        "1 • Pick ONE market and ONE strategy",
        "Choose the exact EBC/IC Markets symbol, or your BTC perpetual contract. Decide the strategy before 09:30 New York. Keep one feed per test; do not mix EBC and IC candles in one database.",
      ],
      [
        "2 • Verify the contract",
        "On MetaTrader, open Market Watch → right-click symbol → Specification. Record account currency, contract size, tick size/value, volume min/step/max, costs, stop limits and sessions. BTC also needs settlement currency, funding, margin and trigger-price rules.",
      ],
      [
        "3 • Open three ordinary-candle charts",
        "Same symbol/feed: 15m for direction, 5m for breakout, 1m for retest. Keep D1 available for Strategy 2. Do not use Heikin Ashi prices for these rules.",
      ],
      [
        "4 • Use the correct clock",
        "Reference timezone: America/New_York. Trade window: 09:30–11:00. In Accra this is 13:30–15:00 during New York daylight time, or 14:30–16:00 during standard time. Map broker-server time explicitly.",
      ],
      [
        "5 • Check events and availability",
        "For this practice version use normal US stock-session weekdays; exclude US stock holidays and BTC weekends. No new entries 10 minutes before through 10 minutes after scheduled high-impact news affecting either FX currency, USD/metals or BTC. This buffer does not eliminate surprise-news risk.",
      ],
      [
        "6 • Identify 15m direction",
        "A swing high is higher than both neighbouring highs; a swing low is lower than both neighbouring lows. Confirm only after the right-hand candle closes. Latest two highs AND lows rising = BUY only; both falling = SELL only. Mixed, equal or missing = SKIP.",
      ],
      [
        "7 • Mark obstacles and save a screenshot",
        "Before 09:30, mark the selected range/level when available and confirmed 15m swing levels ahead of price. Freeze Strategy 1 at 09:35. Recheck 15m direction at breakout and entry. Ignore other strategy signals today.",
      ],
    ],
    watch:
      "09:30 is a chosen US cash-open reference time for your markets, not the opening of FX, metals or BTC. The 15m swing rule, news filter and exact timing are practice additions.",
    tag: "Preparation • all three",
  },
  {
    title: "Set the stop. Then calculate the size.",
    lead: "NEVER CHOOSE LOTS FIRST.",
    diagram: "risk",
    steps: [
      [
        "1 • Choose invalidation",
        "BUY stop: one actual price tick below the completed 1m trigger candle’s low. SELL stop: one tick above its high. If the broker minimum stop distance rejects this stop, SKIP; do not improvise a new method.",
      ],
      [
        "2 • Estimate the entry and target",
        "Practice entry = the next 1m candle open after the trigger. D = absolute entry minus stop. BUY target = entry + 2D; SELL target = entry − 2D. Round the target outward to a valid tick. A live fill may differ from this model.",
      ],
      [
        "3 • Check target space",
        "Use the nearest premarked level ahead of the entry: overhead for BUY, underneath for SELL. If the 2R target touches or crosses it, SKIP. If price gaps past the planned level or makes entry invalid, SKIP. No visible obstacle means “none identified,” not guaranteed room.",
      ],
      [
        "4 • Set a small practice budget",
        "Teaching ceiling: 0.5% of current demo equity per trade. Example: $10,000 × 0.005 = $50. Set a 1% daily net-loss limit and maximum ONE entry across all symbols/accounts combined; one position open at a time.",
      ],
      [
        "5 • Calculate quantity",
        "Loss per lot = D ÷ tick size × loss-side tick value per lot in account currency + estimated round-trip costs per lot. Quantity = budget ÷ loss per lot. Round DOWN to volume step. Reject below minimum; never round up.",
      ],
      [
        "6 • Check margin separately",
        "Reduce size further if the broker maximum or verified margin cap is tighter. BTC: check maintenance margin, mark-price liquidation and stop trigger type independently. Leverage is not position sizing. Include fees, slippage and adverse funding in the reserve.",
      ],
    ],
    watch:
      "This formula is for linear contracts only. Inverse/coin-margined BTC contracts need their own formula. Tick value and conversion can change. Planned stop loss is not a guaranteed maximum loss.",
    tag: "Risk • all three",
  },
  {
    title: "1. First five-minute range",
    lead: "DRAW ONE BOX. WAIT UNTIL IT IS COMPLETE.",
    diagram: "opening",
    steps: [
      [
        "1 • Complete pages 2–3",
        "Have verified specifications, known costs, a loss budget and the three charts ready. The session runs 09:30–11:00 New York.",
      ],
      [
        "2 • Wait for 09:35",
        "On 5m, locate the candle that OPENS at 09:30 and CLOSES at 09:35 New York. Do not draw its final range at 09:31.",
      ],
      [
        "3 • Draw the exact high and low",
        "Upper line = highest wick of that completed candle. Lower line = lowest wick. Extend both rightward. Name them ORH and ORL. Freeze them for the session.",
      ],
      [
        "4 • Choose the permitted direction",
        "15m rising confirmed highs/lows → watch ORH for BUY. Falling confirmed highs/lows → watch ORL for SELL. Mixed → no trade.",
      ],
      [
        "5 • Wait for a LATER 5m close",
        "BUY: close strictly ABOVE ORH. SELL: close strictly BELOW ORL. The earliest eligible later candle closes at 09:40. A wick outside, or close exactly on the line, is NOT enough.",
      ],
      [
        "6 • Start the retest clock",
        "Only after the 5m breakout candle closes, switch attention to 1m. Count the next five completed 1m candles. Follow the exact BUY or SELL sequence on page 5.",
      ],
    ],
    watch:
      "SKIP: unfinished box, wick-only breakout, mixed direction, no valid retest in five candles, missing data or entry at/after 11:00. A pre-confirmation retest does not count. Take at most one entry from this strategy on a given day.",
    tag: "Strategy 1 • set it up",
  },
  {
    title: "1. BUY above. SELL below.",
    lead: "THE RETEST MUST HAPPEN AFTER THE 5m BREAKOUT CLOSE.",
    diagram: "entry",
    steps: [
      [
        "1 • BUY trigger",
        "After a 5m close above ORH, inspect up to five later 1m candles. First candle whose LOW touches/passes below ORH, whose CLOSE stays ABOVE ORH, and whose CLOSE is ABOVE its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "2 • SELL trigger",
        "After a 5m close below ORL, inspect up to five later 1m candles. First candle whose HIGH touches/passes above ORL, whose CLOSE stays BELOW ORL, and whose CLOSE is BELOW its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "3 • Cancel the idea when it fails",
        "Before a BUY trigger: any 1m close BELOW ORH cancels it. Before a SELL trigger: any close ABOVE ORL cancels it. A close exactly on the line is neither a trigger nor a cancellation; the five-candle clock still runs. No valid trigger by candle five → expire.",
      ],
      [
        "4 • Fix stop, target and size",
        "Use the trigger candle’s extreme plus one tick for the stop. Use the next-open entry estimate, 2R target, obstacle check and rounded-down quantity from page 3. Recheck direction, news blackout, spread/cost allowance and margin.",
      ],
      [
        "5 • Enter once, then protect it",
        "In replay use the next 1m open. In demo execution use the actual fill, verify quantity/stop/target immediately and reconcile risk. If fill or costs violate the plan, close/reduce under the safety rule on page 10. Do not chase a missed entry.",
      ],
      [
        "6 • Finish by the written exit",
        "Stop, target or 11:00 New York: first one reached closes the trade. No widening stops, adding to losers or discretionary trailing. If this breakout cancels/expires, stop this strategy for the day. No second attempt after a stopped trade.",
      ],
    ],
    watch:
      "EXAMPLE: ORH 2500. A later 5m close is 2501. Trigger 1m O=2500.40, H=2500.80, L=2499.90, C=2500.60. It qualifies for BUY; calculate risk before entry. All illustrated prices are invented. These precise trigger, expiry and one-attempt rules are practice rules, not verified verbatim instructor rules.",
    tag: "Strategy 1 • execute it",
  },
  {
    title: "2. Previous-day high / low",
    lead: "YESTERDAY DRAWS THE LINES. TODAY MUST CONFIRM.",
    diagram: "daily",
    steps: [
      [
        "1 • Complete pages 2–3",
        "Choose this strategy before the session. Keep the same provider and daily-cutoff definition throughout its test.",
      ],
      [
        "2 • Define the previous day correctly",
        "EBC/IC FX and metals: use the previous completed broker D1 bar and record server timezone. If it is a shortened Sunday/holiday stub, skip this strategy today. BTC perpetual: use the previous 00:00–24:00 UTC day on the SAME perpetual venue, not a spot chart.",
      ],
      [
        "3 • Mark PDH and PDL",
        "PDH = that day’s highest wick; PDL = lowest wick. Draw both on 15m, 5m and 1m. Use the same exact prices; do not redraw after a breakout.",
      ],
      [
        "4 • Check location at 09:30",
        "Simplified test filter: the 09:30 opening price must be strictly BETWEEN PDH and PDL. If already outside or exactly on a boundary, skip Strategy 2 for the day. Do not call an overnight break a fresh intraday breakout.",
      ],
      [
        "5 • Wait for a fresh 5m breakout",
        "After 09:30, a completed 5m close above PDH plus upward 15m direction enables a BUY watch. Close below PDL plus downward direction enables a SELL watch. First possible confirmation is 09:35.",
      ],
      [
        "6 • Use the later 1m retest",
        "Start the five-candle retest clock only after that 5m close. Follow page 7. The level source changed; the entry, stop, size and exit method did not.",
      ],
    ],
    watch:
      "SKIP: unknown cutoff, incomplete prior day, missing bars, opening outside the range, wick-only break or insufficient target space. The “open inside” filter and stub-day exclusion are simplifying test additions.",
    tag: "Strategy 2 • set it up",
  },
  {
    title: "2. BUY above. SELL below.",
    lead: "THE RETEST MUST HAPPEN AFTER THE 5m BREAKOUT CLOSE.",
    diagram: "entry",
    steps: [
      [
        "1 • BUY trigger",
        "After a 5m close above PDH, inspect up to five later 1m candles. First candle whose LOW touches/passes below PDH, whose CLOSE stays ABOVE PDH, and whose CLOSE is ABOVE its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "2 • SELL trigger",
        "After a 5m close below PDL, inspect up to five later 1m candles. First candle whose HIGH touches/passes above PDL, whose CLOSE stays BELOW PDL, and whose CLOSE is BELOW its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "3 • Cancel the idea when it fails",
        "Before a BUY trigger: any 1m close BELOW PDH cancels it. Before a SELL trigger: any close ABOVE PDL cancels it. A close exactly on the line is neither a trigger nor a cancellation; the five-candle clock still runs. No valid trigger by candle five → expire.",
      ],
      [
        "4 • Fix stop, target and size",
        "Use the trigger candle’s extreme plus one tick for the stop. Use the next-open entry estimate, 2R target, obstacle check and rounded-down quantity from page 3. Recheck direction, news blackout, spread/cost allowance and margin.",
      ],
      [
        "5 • Enter once, then protect it",
        "In replay use the next 1m open. In demo execution use the actual fill, verify quantity/stop/target immediately and reconcile risk. If fill or costs violate the plan, close/reduce under the safety rule on page 10. Do not chase a missed entry.",
      ],
      [
        "6 • Finish by the written exit",
        "Stop, target or 11:00 New York: first one reached closes the trade. No widening stops, adding to losers or discretionary trailing. If this breakout cancels/expires, stop this strategy for the day. No second attempt after a stopped trade.",
      ],
    ],
    watch:
      "EXAMPLE: PDL 1.10000. A 5m candle closes at 1.09970. Trigger 1m O=1.09980, H=1.10005, L=1.09950, C=1.09960. It qualifies for SELL; spread and tick value still matter. All illustrated prices are invented. These precise trigger, expiry and one-attempt rules are practice rules, not verified verbatim instructor rules.",
    tag: "Strategy 2 • execute it",
  },
  {
    title: "3. Pre-window high / low",
    lead: "MARK 04:00–09:30 NEW YORK. DO NOT TRADE INSIDE IT.",
    diagram: "prewindow",
    steps: [
      [
        "1 • Complete pages 2–3",
        "Choose Strategy 3 before 09:30. Confirm your data feed contains every required bar in the chosen window.",
      ],
      [
        "2 • Select the exact time window",
        "Use 04:00 inclusive to 09:30 exclusive, America/New_York. In Accra: 08:00–13:30 during New York daylight time; 09:00–14:30 during standard time.",
      ],
      [
        "3 • Draw the window’s full range",
        "On 5m, highest wick in the entire window = PWH; lowest wick = PWL. The final included 5m candle opens 09:25 and closes 09:30. Freeze both lines at 09:30.",
      ],
      [
        "4 • Use the market’s proper name",
        "For FX, metals and BTC call this a PRE-WINDOW range. These markets do not have the US stock market’s universal “pre-market.” Do not substitute a broker’s default session shading.",
      ],
      [
        "5 • Wait for a fresh post-window close",
        "After 09:30, a completed 5m close above PWH with upward 15m direction enables BUY. A close below PWL with downward direction enables SELL. A gap-open outside the range skips the setup for this day.",
      ],
      [
        "6 • Move to 1m AFTER confirmation",
        "Watch only the next five completed 1m candles for the retest. Follow page 9. A touch during the pre-window or before the breakout closes is not the entry.",
      ],
    ],
    watch:
      "SKIP: missing window data, guessed timezone, moving range lines, gap-open outside, no retest or 11:00 cutoff. Price exactly on a range edge at 09:30 is not a breakout; wait for the completed 5m close.",
    tag: "Strategy 3 • set it up",
  },
  {
    title: "3. BUY above. SELL below.",
    lead: "THE RETEST MUST HAPPEN AFTER THE 5m BREAKOUT CLOSE.",
    diagram: "entry",
    steps: [
      [
        "1 • BUY trigger",
        "After a 5m close above PWH, inspect up to five later 1m candles. First candle whose LOW touches/passes below PWH, whose CLOSE stays ABOVE PWH, and whose CLOSE is ABOVE its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "2 • SELL trigger",
        "After a 5m close below PWL, inspect up to five later 1m candles. First candle whose HIGH touches/passes above PWL, whose CLOSE stays BELOW PWL, and whose CLOSE is BELOW its own OPEN qualifies. Wait for it to close.",
      ],
      [
        "3 • Cancel the idea when it fails",
        "Before a BUY trigger: any 1m close BELOW PWH cancels it. Before a SELL trigger: any close ABOVE PWL cancels it. A close exactly on the line is neither a trigger nor a cancellation; the five-candle clock still runs. No valid trigger by candle five → expire.",
      ],
      [
        "4 • Fix stop, target and size",
        "Use the trigger candle’s extreme plus one tick for the stop. Use the next-open entry estimate, 2R target, obstacle check and rounded-down quantity from page 3. Recheck direction, news blackout, spread/cost allowance and margin.",
      ],
      [
        "5 • Enter once, then protect it",
        "In replay use the next 1m open. In demo execution use the actual fill, verify quantity/stop/target immediately and reconcile risk. If fill or costs violate the plan, close/reduce under the safety rule on page 10. Do not chase a missed entry.",
      ],
      [
        "6 • Finish by the written exit",
        "Stop, target or 11:00 New York: first one reached closes the trade. No widening stops, adding to losers or discretionary trailing. If this breakout cancels/expires, stop this strategy for the day. No second attempt after a stopped trade.",
      ],
    ],
    watch:
      "EXAMPLE: BTC PWH 60000. A 5m candle closes at 60200. Trigger 1m O=60060, H=60140, L=59980, C=60100. It qualifies for BUY on that venue’s chart; funding and liquidation still require checks. All illustrated prices are invented. These precise trigger, expiry and one-attempt rules are practice rules, not verified verbatim instructor rules.",
    tag: "Strategy 3 • execute it",
  },
  {
    title: "After entry: keep the plan intact.",
    lead: "FOLLOW THE EXIT. DO NOT NEGOTIATE WITH A LOSING TRADE.",
    diagram: "manage",
    steps: [
      [
        "1 • Check the actual order",
        "Verify side, contract, quantity, actual fill, protective stop and target. Confirm the platform accepted the exits. A chart drawing is not an order. Check bid/ask trigger rules; BTC may use mark, index or last price.",
      ],
      [
        "2 • Resolve a bad fill or failed protection",
        "Recalculate D and the 2R target from the actual fill, keeping the original stop. If risk exceeds budget, reduce or close. If the revised target meets an obstacle or protection cannot be confirmed, close the demo trade. Never widen the stop. Check order status before resubmitting.",
      ],
      [
        "3 • Exit by the first event",
        "Protective stop, fixed 2R price target, or 11:00 New York. At 11:00 cancel pending entries and close the position; verify remaining exits are cancelled. Do not add partial exits, break-even moves or trailing until a separate version has been tested.",
      ],
      [
        "4 • Handle uncertainty honestly",
        "If one historical candle touches both stop and target and order is unknown, record stop-first and flag ambiguity. With a feed outage, stop new entries and check positions/orders through the provider’s independent interface.",
      ],
      [
        "5 • Enforce the session limit",
        "For this condensed playbook: ONE strategy and at most ONE entry per day. A cancelled/expired breakout ends that strategy for the day. This one-attempt limit is a deliberate simplification of the longer workbook. A 1% net loss or critical rule breach ends all new entries.",
      ],
      [
        "6 • Record the result",
        "Save before/after screenshots, symbol/feed, rule version, level, timing, fill, stop/target, quantity, fees, funding, net result and whether every rule was followed. Journal skips too. A correct trade may lose; a rule-breaking trade may win.",
      ],
    ],
    watch:
      "STOP FOR THE DAY if you want to recover the loss, increase size emotionally, move invalidation, switch to another strategy, or stack correlated FX/metals exposure. No martingale. No grid.",
    tag: "Management • all three",
  },
  {
    title: "Four examples. Always calculate first.",
    lead: "THESE ARE SYNTHETIC USD EXAMPLES, NOT BROKER PRESETS.",
    diagram: "risk",
    steps: [
      [
        "FX • EUR/USD",
        "Assume 100,000 EUR/lot. Entry 1.10000; stop 1.09800; target 1.10400. Price risk $200/lot + costs $10/lot = $210. $50 budget ÷ $210 = 0.238095; round down at 0.01 step → 0.23 lots. Planned loss $48.30; target net $89.70.",
      ],
      [
        "Gold • XAU/USD",
        "Assume 100 oz/lot. Entry 2500; stop 2495; target 2510. Price risk $500/lot + costs $10/lot = $510. $50 ÷ $510 = 0.098039 → 0.09 lots. Planned loss $45.90; target net $89.10.",
      ],
      [
        "Silver • XAG/USD",
        "Assume 5,000 oz/lot. Entry 30.00; stop 29.80; target 30.40. Price risk $1,000/lot + costs $20/lot = $1,020. $50 ÷ $1,020 = 0.049019 → 0.04 lots. Planned loss $40.80; target net $79.20.",
      ],
      [
        "BTC • linear perpetual",
        "Quantity in BTC. Entry 60000; stop 59500; target 61000. Price risk $500/BTC + fees/slippage/funding reserve $130/BTC = $630. $50 ÷ $630 = 0.079365 → 0.079 BTC at 0.001 step. Planned loss $49.77; target net $68.73.",
      ],
      [
        "Check before copying ANY quantity",
        "These worked stops represent already selected invalidation, not a fixed distance to use on every trade. Your trigger determines the stop. Actual tick values, costs, min/step and margin can differ. The $50 budget assumes $10,000 demo equity at 0.5%.",
      ],
    ],
    watch:
      "2R is a gross price target. Costs reduce the net reward. Stops can slip; funding and currency conversion can change. These examples do not calculate liquidation or prove the strategy has an edge.",
    tag: "Worked arithmetic",
  },
  {
    title: "Your final go / no-go card.",
    lead: "IF ANY REQUIRED ANSWER IS “NO”, DO NOT ENTER.",
    diagram: "overview",
    steps: [
      [
        "BEFORE • preparation",
        "□ Demo account. □ Exact contract/currency/specs verified. □ One strategy chosen. □ Correct timezone and complete range data. □ Event, holiday and maintenance checks passed.",
      ],
      [
        "SIGNAL • price sequence",
        "□ 15m confirmed direction agrees. □ Range lines frozen. □ Fresh 5m CLOSE beyond the correct edge. □ Retest happened LATER. □ Completed 1m trigger within five candles. □ No prior invalidating close.",
      ],
      [
        "RISK • money and execution",
        "□ Stop beyond trigger by one tick. □ 2R target has room. □ Quantity rounded down with costs. □ Minimum/step/max and stop distance valid. □ Margin checked. □ BTC funding, trigger type and liquidation checked separately.",
      ],
      [
        "AFTER • manage and learn",
        "□ Stop/target accepted. □ Actual fill reconciled. □ No widening, adding, grid or martingale. □ Exit by 11:00. □ Journal saved. □ No second entry or strategy switch today.",
      ],
      [
        "How to practise",
        "Start with Strategy 1 on one symbol. Mark 20 examples including failures and skips. Then test frozen rules chronologically on untouched data and forward-test in demo. Evaluate each instrument/strategy separately. No example count guarantees profitability.",
      ],
    ],
    watch:
      "SOURCE: supplied 44:08 course: first range 12:31–17:03; previous day 17:03–20:02; pre-market 20:02–23:14. Exact cross-market filters here are added teaching rules. Public references below support mechanics, not an edge.",
    tag: "Print this page",
  },
] as const;

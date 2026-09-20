export const PRIMARY_PRACTICE_MARKETS = ["XAUUSD", "USDJPY"] as const;
export const MARKET_ADAPTATION =
  "The video uses stock examples. Apply the framework across verified markets, especially XAUUSD and USDJPY, using the exact broker or venue schedule converted to UTC for the session date. A continuously traded contract needs an explicit daily reference boundary; it has no universal daily opening bell. Test each market separately.";
export const STRATEGY_VERSION = "three-strategies-v1";
export const STRATEGIES = [
  {
    id: "opening-range",
    name: "First five-minute range",
    short: "Opening range",
    level: "ORH / ORL",
    description:
      "Freeze the first five complete minutes after the verified session anchor. Wait for a later 5m breakout and 1m retest.",
    firstConfirmation: "Anchor + 10 minutes",
    pages: [3, 4],
  },
  {
    id: "previous-day",
    name: "Previous-day high / low",
    short: "Previous day",
    level: "PDH / PDL",
    description:
      "Use the previous complete provider day and recorded cutoff. The selected session must open strictly inside its range.",
    firstConfirmation: "Anchor + 5 minutes",
    pages: [5, 6],
  },
  {
    id: "pre-window",
    name: "Pre-session high / low",
    short: "Pre-session",
    level: "PWH / PWL",
    description:
      "Use an explicitly defined, complete pre-session range from the same feed. No usable pre-session data means this setup is unavailable.",
    firstConfirmation: "Anchor + 5 minutes",
    pages: [7, 8],
  },
] as const;
export type StrategyId = (typeof STRATEGIES)[number]["id"];
export const isStrategyId = (value: unknown): value is StrategyId =>
  STRATEGIES.some((s) => s.id === value);
export const RULES = {
  timezone: "UTC",
  maxRiskPercent: 0.5,
  maxDailyLossPercent: 1,
  maxEntriesPerDay: 1,
  rewardMultiple: 2,
  retestCandles: 5,
  blackoutMinutes: 10,
} as const;
export const STRATEGY_TEACHING_CONTEXT = `${MARKET_ADAPTATION} TradeMetrics Pro teaches ${STRATEGY_VERSION}: first five-minute range after a verified instrument/session anchor, previous complete provider-day high/low, or a complete explicitly selected pre-session range. Never apply stock 09:30/16:00 or the old playbook 11:00 exit globally. Record UTC session open, trading cutoff, venue close and any pre-window start before practice. Do not treat UTC midnight or London/New York liquidity sessions as an actual venue opening unless explicitly labelled. Source stock times are illustrative. One strategy chosen before the session; one attempt and at most one entry per UTC risk day across accounts/symbols. Confirm strict closed 15m swing direction; strict 5m close beyond the frozen level; then a later bullish/bearish 1m touch-and-reclaim within five complete candles. Wrong-side close cancels; equality consumes time. Entry next 1m open; stop one actual tick beyond trigger; fixed 2R gross target with obstacle clearance; risk <=0.5% of current demo equity including costs, daily net-loss stop 1%, floor quantity; verify tick economics and margin. Exit at fixed stop, target or the predeclared session cutoff, which cannot exceed the venue close. Relevant high-impact news blackout inclusive 10 minutes either side; verify instrument-specific holidays, weekends, maintenance and candle completeness. Never bridge closed-market gaps. No trailing, break-even changes, adding to losers, martingale or grid. These are unvalidated market adaptations. Instructor examples are not evidence of profitability. Teach skips without encouraging extra trades.`;
export interface TradingSession {
  open: number;
  close: number;
  cutoff: number;
  preStart?: number;
  verified: boolean;
  kind: "venue-open" | "daily-reference";
  label: string;
  source: string;
}
export function validSession(s: TradingSession): boolean {
  return (
    s.verified &&
    ["venue-open", "daily-reference"].includes(s.kind) &&
    !!s.label.trim() &&
    !!s.source.trim() &&
    [s.open, s.close, s.cutoff].every(
      (v) =>
        Number.isSafeInteger(v) && v > 0 && v < 253402300800 && v % 60 === 0,
    ) &&
    s.close > s.open &&
    s.close - s.open <= 172800 &&
    s.cutoff > s.open + 600 &&
    s.cutoff <= s.close &&
    (s.preStart === undefined ||
      (Number.isSafeInteger(s.preStart) &&
        s.preStart % 60 === 0 &&
        s.preStart < s.open &&
        s.open - s.preStart <= 86400))
  );
}
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
export function nyClock(epochSeconds: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date(epochSeconds * 1000));
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: get("weekday"),
  };
}
export function nyTime(date: string, minute: number): number {
  const anchor = Date.parse(date + "T12:00:00Z") / 1000;
  return anchor + (minute - nyClock(anchor).minute) * 60;
}
export function validCandles(
  rows: readonly Candle[],
  interval: number,
): boolean {
  return (
    rows.length > 0 &&
    rows.every(
      (c, i) =>
        [c.time, c.open, c.high, c.low, c.close].every(Number.isFinite) &&
        c.time % interval === 0 &&
        c.low > 0 &&
        c.high >= Math.max(c.open, c.close) &&
        c.low <= Math.min(c.open, c.close) &&
        c.high >= c.low &&
        (i === 0 || c.time > rows[i - 1]!.time),
    )
  );
}
export function aggregate(
  rows: readonly Candle[],
  seconds: number,
  asOf: number,
  anchor = 0,
): Candle[] {
  const groups = new Map<number, Candle[]>();
  for (const c of rows) {
    if (c.time + 60 > asOf) continue;
    const t = Math.floor((c.time - anchor) / seconds) * seconds + anchor;
    const g = groups.get(t) ?? [];
    g.push(c);
    groups.set(t, g);
  }
  return [...groups]
    .filter(
      ([t, g]) =>
        t + seconds <= asOf &&
        g.length === seconds / 60 &&
        g.every((c, i) => c.time === t + i * 60),
    )
    .map(([time, g]) => ({
      time,
      open: g[0]!.open,
      high: Math.max(...g.map((c) => c.high)),
      low: Math.min(...g.map((c) => c.low)),
      close: g[g.length - 1]!.close,
    }));
}
export function confirmedDirection(
  rows: readonly Candle[],
  asOf: number,
): "buy" | "sell" | null {
  const closed = rows.filter((c) => c.time + 900 <= asOf);
  if (!validCandles(closed, 900)) return null;
  const highs: number[] = [],
    lows: number[] = [];
  for (let i = 1; i < closed.length - 1; i++) {
    const a = closed[i - 1]!,
      b = closed[i]!,
      c = closed[i + 1]!;
    if (b.time - a.time !== 900 || c.time - b.time !== 900) continue;
    if (b.high > a.high && b.high > c.high) highs.push(b.high);
    if (b.low < a.low && b.low < c.low) lows.push(b.low);
  }
  if (highs.length < 2 || lows.length < 2) return null;
  const h = highs.at(-1)! - highs.at(-2)!,
    l = lows.at(-1)! - lows.at(-2)!;
  return h > 0 && l > 0 ? "buy" : h < 0 && l < 0 ? "sell" : null;
}
export interface ContractSpec {
  tickSize: number;
  lossTickValue: number;
  volumeMin: number;
  volumeStep: number;
  volumeMax: number;
  costsPerLot: number;
  minStopDistance: number;
  marginPerLot: number;
  freeMargin: number;
  verified: boolean;
  linear: boolean;
}
export interface RiskPlan {
  entry: number;
  stop: number;
  target: number;
  quantity: number;
  plannedLoss: number;
  budget: number;
  priceRisk: number;
}
export function sizeTrade(
  side: "buy" | "sell",
  entry: number,
  trigger: Candle,
  equity: number,
  riskPercent: number,
  spec: ContractSpec,
  obstacles: readonly number[],
): { plan: RiskPlan | null; reason: string } {
  const no = (reason: string) => ({ plan: null, reason });
  if (!spec.verified || !spec.linear)
    return no("Verify a linear contract and account-currency tick economics.");
  if (
    ![
      entry,
      equity,
      riskPercent,
      spec.tickSize,
      spec.lossTickValue,
      spec.volumeMin,
      spec.volumeStep,
      spec.volumeMax,
      spec.marginPerLot,
      spec.freeMargin,
    ].every((v) => Number.isFinite(v) && v > 0) ||
    ![spec.costsPerLot, spec.minStopDistance].every(
      (v) => Number.isFinite(v) && v >= 0,
    ) ||
    riskPercent > RULES.maxRiskPercent ||
    spec.volumeMin > spec.volumeMax
  )
    return no("Invalid contract, equity or risk inputs.");
  if (
    !validCandles([trigger], 60) ||
    !obstacles.every((v) => Number.isFinite(v) && v > 0)
  )
    return no("Invalid trigger or obstacle data.");
  const aligned = (v: number) =>
    Math.abs(v / spec.tickSize - Math.round(v / spec.tickSize)) < 1e-6;
  if (!aligned(trigger.low) || !aligned(trigger.high) || !aligned(entry))
    return no("Prices must align to the actual tick size.");
  const stop = Number(
    (side === "buy"
      ? trigger.low - spec.tickSize
      : trigger.high + spec.tickSize
    ).toPrecision(14),
  );
  const d = side === "buy" ? entry - stop : stop - entry;
  if (stop <= 0 || d <= 0 || d < spec.minStopDistance)
    return no("Invalid entry or broker minimum stop distance; skip.");
  const rawTarget = side === "buy" ? entry + 2 * d : entry - 2 * d;
  const target = Number(
    (
      (side === "buy"
        ? Math.ceil(rawTarget / spec.tickSize - 1e-9)
        : Math.floor(rawTarget / spec.tickSize + 1e-9)) * spec.tickSize
    ).toPrecision(14),
  );
  if (target <= 0) return no("Target is invalid.");
  if (
    obstacles.some((level) =>
      side === "buy"
        ? level > entry && target >= level
        : level < entry && target <= level,
    )
  )
    return no("The 2R target touches or crosses a premarked obstacle.");
  const budget = (equity * riskPercent) / 100,
    perLot = (d / spec.tickSize) * spec.lossTickValue + spec.costsPerLot;
  const raw = Math.min(
    budget / perLot,
    spec.volumeMax,
    spec.freeMargin / spec.marginPerLot,
  );
  let quantity = Number(
    (Math.floor(raw / spec.volumeStep + 1e-10) * spec.volumeStep).toPrecision(
      12,
    ),
  );
  if (quantity * perLot > budget + 1e-8)
    quantity = Number((quantity - spec.volumeStep).toPrecision(12));
  if (
    ![budget, perLot, quantity, target, quantity * perLot].every(
      Number.isFinite,
    )
  )
    return no("Sizing calculation exceeds supported numeric bounds.");
  if (quantity < spec.volumeMin || quantity <= 0)
    return no("Rounded-down quantity is below the broker minimum.");
  return {
    plan: {
      entry,
      stop,
      target,
      quantity,
      plannedLoss: quantity * perLot,
      budget,
      priceRisk: d,
    },
    reason:
      "Sized from trigger invalidation; confirm actual fill and accepted protection.",
  };
}
export interface ReplayInput {
  strategy: StrategyId;
  date: string;
  session: TradingSession;
  asOf: number;
  m1: readonly Candle[];
  m15: readonly Candle[];
  provider: string;
  symbol: string;
  calendarVerified: boolean;
  normalSession: boolean;
  newsVerified: boolean;
  relevantNews: readonly number[];
  previousDay?: {
    high: number;
    low: number;
    complete: boolean;
    stub: boolean;
    cutoff: string;
  };
  entriesToday: number;
  dailyLossPercent: number;
  openPositions: number;
  equity: number;
  riskPercent: number;
  contract: ContractSpec;
  obstacles: readonly number[];
}
export interface ReplayResult {
  phase:
    | "blocked"
    | "waiting-range"
    | "waiting-breakout"
    | "waiting-retest"
    | "waiting-entry"
    | "cancelled"
    | "expired"
    | "skipped"
    | "ready"
    | "open"
    | "closed";
  reason: string;
  range?: { high: number; low: number };
  side?: "buy" | "sell";
  breakoutAt?: number;
  trigger?: Candle;
  plan?: RiskPlan;
  exit?: {
    time: number;
    price: number;
    reason: "stop" | "target" | "session-close";
    ambiguous: boolean;
  };
}
export function evaluateReplay(input: ReplayInput): ReplayResult {
  const { asOf, strategy, date } = input;
  const blocked = (reason: string): ReplayResult => ({
    phase: "blocked",
    reason,
  });
  if (
    !isStrategyId(strategy) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(asOf) ||
    !input.provider.trim() ||
    !input.symbol.trim()
  )
    return blocked("Choose a strategy, date, symbol and one provider.");
  if (!input.session || !validSession(input.session))
    return blocked(
      "Verify the exact instrument session, UTC anchor and cutoff before replay.",
    );
  const start = input.session.open,
    end = input.session.cutoff,
    pre = input.session.preStart;
  if (new Date(start * 1000).toISOString().slice(0, 10) !== date)
    return blocked("Session date must match the UTC anchor date.");
  if (!input.calendarVerified || !input.normalSession)
    return blocked(
      "Verify instrument-specific holiday, weekend and maintenance availability.",
    );
  if (strategy === "pre-window" && pre === undefined)
    return blocked(
      "No verified pre-session interval; this setup is unavailable.",
    );
  if (!input.newsVerified || !input.relevantNews.every(Number.isFinite))
    return blocked("Verify the relevant high-impact event calendar.");
  if (
    ![input.entriesToday, input.dailyLossPercent, input.openPositions].every(
      (v) => Number.isFinite(v) && v >= 0,
    ) ||
    !Number.isInteger(input.entriesToday) ||
    !Number.isInteger(input.openPositions) ||
    input.entriesToday >= 1 ||
    input.dailyLossPercent >= 1 ||
    input.openPositions > 0
  )
    return blocked(
      "Daily entry, net-loss or existing-position limit prevents a new entry.",
    );
  const all = input.m1.filter((c) => c.time <= asOf);
  if (!validCandles(all, 60) || !validCandles(input.m15, 900))
    return blocked("Missing, duplicate or invalid candle data.");
  const neededStart = strategy === "pre-window" ? pre! : start;
  const known = all.filter(
    (c) => c.time >= neededStart && c.time + 60 <= Math.min(asOf, end),
  );
  if (
    asOf > neededStart &&
    (known.length !==
      Math.max(0, Math.floor((Math.min(asOf, end) - neededStart) / 60)) ||
      known.some((c, i) => c.time !== neededStart + i * 60))
  )
    return blocked("Required minute bars are missing; do not bridge gaps.");
  const freeze = strategy === "opening-range" ? start + 300 : start;
  if (asOf < freeze)
    return {
      phase: "waiting-range",
      reason:
        "Wait for the selected range to finish; do not freeze unfinished candles.",
    };
  let range: { high: number; low: number };
  if (strategy === "previous-day") {
    const p = input.previousDay;
    if (
      !p?.complete ||
      p.stub ||
      !p.cutoff.trim() ||
      !Number.isFinite(p.high) ||
      !Number.isFinite(p.low) ||
      p.low <= 0 ||
      p.high <= p.low
    )
      return blocked(
        "Previous complete provider day and cutoff are required; skip stub days.",
      );
    range = { high: p.high, low: p.low };
  } else {
    const bars = all.filter(
      (c) =>
        c.time >= (strategy === "pre-window" ? pre! : start) &&
        c.time + 60 <= freeze,
    );
    if (!bars.length) return blocked("No completed range candles.");
    range = {
      high: Math.max(...bars.map((c) => c.high)),
      low: Math.min(...bars.map((c) => c.low)),
    };
  }
  const result = (
    phase: ReplayResult["phase"],
    reason: string,
  ): ReplayResult => ({ phase, reason, range });
  const opening = all.find((c) => c.time === start);
  if (!opening)
    return result("waiting-breakout", "Await the session opening price.");
  if (range.high <= range.low) return blocked("Range has no width.");
  if (
    strategy === "previous-day" &&
    (opening.open <= range.low || opening.open >= range.high)
  )
    return result(
      "skipped",
      "Session must open strictly inside the previous-day range.",
    );
  if (
    strategy === "pre-window" &&
    (opening.open < range.low || opening.open > range.high)
  )
    return result("skipped", "Session opens outside the pre-window range.");
  const five = aggregate(all, 300, asOf, start).filter(
    (c) =>
      c.time >= (strategy === "opening-range" ? freeze : start) &&
      c.time + 300 < end,
  );
  const breakout = five.find((c) => {
    const d = confirmedDirection(input.m15, c.time + 300);
    return d === "buy"
      ? c.close > range.high
      : d === "sell"
        ? c.close < range.low
        : false;
  });
  if (!breakout)
    return result(
      asOf >= end ? "expired" : "waiting-breakout",
      asOf >= end
        ? "Session ended without an eligible breakout."
        : "Wait for a strict 5m close beyond the edge with confirmed 15m direction.",
    );
  const side = breakout.close > range.high ? "buy" : "sell",
    edge = side === "buy" ? range.high : range.low,
    breakoutAt = breakout.time + 300;
  const details = { range, side, breakoutAt } as const;
  const retests = all.filter(
    (c) =>
      c.time >= breakoutAt && c.time < breakoutAt + 300 && c.time + 60 <= asOf,
  );
  let trigger: Candle | undefined;
  for (const c of retests) {
    if (side === "buy" ? c.close < edge : c.close > edge)
      return {
        phase: "cancelled",
        reason:
          "A wrong-side 1m close cancels the first attempt. Stop this strategy today.",
        ...details,
      };
    if (
      side === "buy"
        ? c.low <= edge && c.close > edge && c.close > c.open
        : c.high >= edge && c.close < edge && c.close < c.open
    ) {
      trigger = c;
      break;
    }
  }
  if (!trigger)
    return {
      phase: retests.length >= 5 || asOf >= end ? "expired" : "waiting-retest",
      reason:
        retests.length >= 5
          ? "Five completed candles passed without a trigger. No second attempt."
          : "Only later completed 1m candles count; equality consumes a candle.",
      ...details,
    };
  const entryAt = trigger.time + 60;
  if (entryAt >= end)
    return {
      phase: "skipped",
      reason: "Entry is at or after the declared UTC cutoff.",
      ...details,
      trigger,
    };
  if (input.relevantNews.some((t) => Math.abs(t - entryAt) <= 600))
    return {
      phase: "skipped",
      reason: "Entry is within the inclusive 10-minute relevant-news blackout.",
      ...details,
      trigger,
    };
  if (confirmedDirection(input.m15, entryAt) !== side)
    return {
      phase: "skipped",
      reason: "Confirmed 15m direction no longer agrees at entry.",
      ...details,
      trigger,
    };
  const entry = all.find((c) => c.time === entryAt);
  if (!entry)
    return {
      phase: "waiting-entry",
      reason: "Await the next 1m open; never enter before trigger close.",
      ...details,
      trigger,
    };
  if (side === "buy" ? entry.open <= edge : entry.open >= edge)
    return {
      phase: "skipped",
      reason: "Next-open gap invalidates the reclaimed entry level.",
      ...details,
      trigger,
    };
  const sized = sizeTrade(
    side,
    entry.open,
    trigger,
    input.equity,
    input.riskPercent,
    input.contract,
    input.obstacles,
  );
  if (!sized.plan)
    return { phase: "skipped", reason: sized.reason, ...details, trigger };
  const plan = sized.plan;
  for (const c of all.filter(
    (c) => c.time >= entryAt && c.time < end && c.time + 60 <= asOf,
  )) {
    const stopHit = side === "buy" ? c.low <= plan.stop : c.high >= plan.stop;
    const targetHit =
      side === "buy" ? c.high >= plan.target : c.low <= plan.target;
    if (stopHit || targetHit) {
      const price = stopHit
        ? side === "buy"
          ? Math.min(plan.stop, c.open)
          : Math.max(plan.stop, c.open)
        : plan.target;
      return {
        phase: "closed",
        reason:
          stopHit && targetHit
            ? "Both exits touched in one candle: stop-first, ambiguity flagged."
            : stopHit
              ? "Protective stop reached."
              : "Fixed 2R price target reached.",
        ...details,
        trigger,
        plan,
        exit: {
          time: c.time + 60,
          price,
          reason: stopHit ? "stop" : "target",
          ambiguous: stopHit && targetHit,
        },
      };
    }
  }
  if (asOf >= end) {
    const close = all.find((c) => c.time === end);
    if (!close)
      return {
        ...blocked(
          "Session-cutoff execution price missing; outcome is unknown.",
        ),
        ...details,
        trigger,
        plan,
      };
    return {
      phase: "closed",
      reason: "the declared UTC cutoff time exit.",
      ...details,
      trigger,
      plan,
      exit: {
        time: end,
        price: close.open,
        reason: "session-close",
        ambiguous: false,
      },
    };
  }
  return {
    phase: asOf === entryAt ? "ready" : "open",
    reason:
      "Replay entry at next open. Verify actual protection separately; no real order is sent.",
    ...details,
    trigger,
    plan,
  };
}

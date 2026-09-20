import {
  aggregate,
  type ReplayInput,
  type StrategyId,
  type Candle,
} from "./index.js";
/** Invented teaching candles and economics. Never market history or broker specifications. */
export function teachingReplay(
  strategy: StrategyId,
  symbol = "XAUUSD",
  scenario = "valid",
): ReplayInput {
  const open = Date.parse("2026-09-21T22:02:00Z") / 1000;
  const from = Math.floor(open / 900) * 900 - 12 * 900;
  const centers = [90, 93, 91, 95, 93, 97, 95, 99, 97, 100, 98, 99];
  const scale = symbol === "USDJPY" ? 0.1 : 10,
    base = symbol === "USDJPY" ? 150 : 2500;
  const price = (v: number) => Number((base + (v - 100) * scale).toFixed(3));
  const rows: Candle[] = [];
  const breakoutMinute = strategy === "opening-range" ? 9 : 4;
  for (let t = from; t <= open + 90 * 60; t += 60) {
    const minute = (t - open) / 60;
    let o: number, h: number, l: number, c: number;
    if (minute < 0) {
      const block = Math.floor((t - from) / 900);
      const p = centers[Math.min(block, 11)]!;
      o = p;
      c = p + 0.1;
      h = p + 0.4;
      l = p - 0.4;
    } else if (minute <= breakoutMinute) {
      o = 100.3;
      c = 100.5;
      h = 101;
      l = 100;
      if (minute === breakoutMinute) {
        c = scenario === "wick" ? 100.9 : 101.3;
        h = 101.4;
      }
    } else if (minute === breakoutMinute + 1) {
      o = 101.1;
      c = scenario === "cancel" ? 100.8 : 101.2;
      l =
        scenario === "cancel"
          ? 100.75
          : scenario === "expire"
            ? 101.05
            : 100.95;
      h = 101.35;
    } else {
      o = 101.2;
      c = 101.3;
      h = 101.5;
      l = 101.1;
      if (minute >= breakoutMinute + 7) {
        o = 101.4;
        c = 101.8;
        h = 102;
        l = 101.3;
      }
    }
    // Pre-session fixture must have the same 100..101 reference range.
    if (minute >= -15 && minute < 0) {
      o = 100.3;
      c = 100.5;
      h = 101;
      l = 100;
    }
    rows.push({
      time: t,
      open: price(o),
      high: price(h),
      low: price(l),
      close: price(c),
    });
  }
  const session = {
    open,
    close: open + 22 * 3600,
    cutoff: open + 90 * 60,
    preStart: open - 15 * 60,
    verified: true,
    kind: "venue-open" as const,
    label: "Synthetic UTC teaching session",
    source: "Invented fixture; not actual XAUUSD/USDJPY trading hours",
  };
  return {
    strategy,
    symbol,
    provider: "SYNTHETIC teaching feed",
    date: "2026-09-21",
    session,
    asOf: open,
    m1: rows,
    m15: aggregate(rows, 900, open + 91 * 60),
    calendarVerified: true,
    normalSession: true,
    newsVerified: true,
    relevantNews: scenario === "news" ? [open + (breakoutMinute + 2) * 60] : [],
    previousDay: {
      high: price(101),
      low: price(100),
      complete: true,
      stub: false,
      cutoff: "Synthetic provider day",
    },
    entriesToday: 0,
    dailyLossPercent: 0,
    openPositions: 0,
    equity: 10000,
    riskPercent: 0.5,
    contract: {
      tickSize: symbol === "USDJPY" ? 0.001 : 0.01,
      lossTickValue: 1,
      volumeMin: 0.01,
      volumeStep: 0.01,
      volumeMax: 10,
      costsPerLot: 10,
      minStopDistance: 0,
      marginPerLot: 1000,
      freeMargin: 10000,
      verified: true,
      linear: true,
    },
    obstacles: scenario === "obstacle" ? [price(101.6)] : [],
  };
}

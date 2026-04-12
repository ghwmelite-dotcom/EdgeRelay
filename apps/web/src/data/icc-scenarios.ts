// ─────────────────────────────────────────────────────────────────────────────
// ICC Practice Scenarios — 8 scenarios with 50 × 4H candles each
// Lower timeframes (1H, 15M, 5M) are generated algorithmically at runtime.
// ─────────────────────────────────────────────────────────────────────────────

export interface ICCAnswer {
  bias: 'bullish' | 'bearish';
  indicationRange: [number, number]; // [startIndex, endIndex] on 1H chart
  correctionRange: [number, number]; // [startIndex, endIndex] on 15M chart
  continuationCandle: number; // index on 5M chart (optimal entry)
  optimalEntry: { price: number; sl: number; tp: number };
}

export interface ICCScenario {
  id: string;
  name: string;
  instrument: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  session: string;
  sessionHours: string;
  assetGuidance: string;
  accentColor: string;
  pipValue: number;
  seed: number;
  h4Data: number[][]; // [t, o, h, l, c][] — 50 candles
  answer: ICCAnswer;
}

// ── Deterministic PRNG (mulberry32) ──────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Candle generator helpers ─────────────────────────────────────────────────
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

interface CandleGenOptions {
  startTime: number;
  interval: number;
  count: number;
  startPrice: number;
  decimals: number;
  seed: number;
  /** Each segment: [candleCount, drift per candle, volatility multiplier] */
  segments: [number, number, number][];
}

function generateCandles(opts: CandleGenOptions): number[][] {
  const rng = mulberry32(opts.seed);
  const candles: number[][] = [];
  let price = opts.startPrice;
  let candleIndex = 0;

  for (const [count, drift, vol] of opts.segments) {
    for (let i = 0; i < count && candleIndex < opts.count; i++, candleIndex++) {
      const t = opts.startTime + candleIndex * opts.interval;
      const open = roundTo(price, opts.decimals);

      // Body direction biased by drift
      const bodySize = (rng() * 0.4 + 0.1) * vol;
      const direction = rng() < (drift > 0 ? 0.65 : drift < 0 ? 0.35 : 0.5) ? 1 : -1;
      const close = roundTo(open + direction * bodySize * (opts.decimals <= 2 ? 1 : (opts.decimals === 3 ? 0.1 : 0.001)), opts.decimals);

      // Wicks
      const wickUp = roundTo((rng() * 0.3 + 0.05) * vol * (opts.decimals <= 2 ? 1 : (opts.decimals === 3 ? 0.1 : 0.001)), opts.decimals);
      const wickDown = roundTo((rng() * 0.3 + 0.05) * vol * (opts.decimals <= 2 ? 1 : (opts.decimals === 3 ? 0.1 : 0.001)), opts.decimals);

      const high = roundTo(Math.max(open, close) + wickUp, opts.decimals);
      const low = roundTo(Math.min(open, close) - wickDown, opts.decimals);

      candles.push([t, open, high, low, close]);

      // Next open ≈ this close + drift
      price = close + drift * (opts.decimals <= 2 ? 1 : (opts.decimals === 3 ? 0.1 : 0.001));
    }
  }

  return candles;
}

// ── Scenario 1: EURUSD Bullish (beginner) ────────────────────────────────────
function buildEurusdBullish(): number[][] {
  const rng = mulberry32(11111);
  const candles: number[][] = [];
  let price = 1.0850;
  const t0 = 1706000000;
  const dec = 5;

  // Phase 1: Consolidation (candles 0-7)
  for (let i = 0; i < 8; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 0.0008 + 0.0002) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0005 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0005 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.45) * 0.0003;
  }

  // Phase 2: Strong impulse up — INDICATION (candles 8-18)
  for (let i = 8; i < 19; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0015 + 0.0008;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(open - rng() * 0.0003 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 0.0002;
  }

  // Phase 3: Correction pullback 38-50% (candles 19-28)
  const swingHigh = price;
  const swingLow = 1.0850;
  const correctionTarget = swingHigh - (swingHigh - swingLow) * (0.38 + rng() * 0.12);
  const corrDrift = (correctionTarget - price) / 10;
  for (let i = 19; i < 29; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 0.0004;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: Continuation higher (candles 29-49)
  for (let i = 29; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0012 + 0.0004;
    const dir = rng() < 0.7 ? 1 : -1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0005 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + 0.0003;
  }

  return candles;
}

// ── Scenario 2: GBPUSD Bearish (beginner) ────────────────────────────────────
function buildGbpusdBearish(): number[][] {
  const rng = mulberry32(22222);
  const candles: number[][] = [];
  let price = 1.2750;
  const t0 = 1706000000;
  const dec = 5;

  // Phase 1: Consolidation (0-6)
  for (let i = 0; i < 7; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 0.0008 + 0.0002) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0005 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0005 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.55) * 0.0003;
  }

  // Phase 2: Strong impulse down — INDICATION (7-17)
  for (let i = 7; i < 18; i++) {
    const open = roundTo(price, dec);
    const body = -(rng() * 0.0015 + 0.0008);
    const close = roundTo(open + body, dec);
    const high = roundTo(open + rng() * 0.0003 + 0.0001, dec);
    const low = roundTo(close - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - rng() * 0.0002;
  }

  // Phase 3: Correction bounce up 38-50% (18-27)
  const swingLow = price;
  const corrTarget = swingLow + (1.2750 - swingLow) * (0.38 + rng() * 0.12);
  const corrDrift = (corrTarget - price) / 10;
  for (let i = 18; i < 28; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 0.0004;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: Continuation lower (28-49)
  for (let i = 28; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0012 + 0.0004;
    const dir = rng() < 0.7 ? -1 : 1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0005 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - 0.0003;
  }

  return candles;
}

// ── Scenario 3: USDJPY Bullish (intermediate) ───────────────────────────────
function buildUsdjpyBullish(): number[][] {
  const rng = mulberry32(33333);
  const candles: number[][] = [];
  let price = 148.50;
  const t0 = 1706000000;
  const dec = 3;

  // Phase 1: Consolidation (0-5)
  for (let i = 0; i < 6; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 0.08 + 0.02) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.05 + 0.01, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.05 - 0.01, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.45) * 0.03;
  }

  // Phase 2: Impulse up — INDICATION (6-16)
  for (let i = 6; i < 17; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.12 + 0.06;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 0.04 + 0.01, dec);
    const low = roundTo(open - rng() * 0.03 - 0.01, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 0.02;
  }

  // Phase 3: Shallow correction 25-30% pullback (17-26)
  const swingHigh = price;
  const corrTarget = swingHigh - (swingHigh - 148.50) * (0.25 + rng() * 0.05);
  const corrDrift = (corrTarget - price) / 10;
  for (let i = 17; i < 27; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 0.04;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.04 + 0.01, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.04 - 0.01, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: Continuation higher (27-49)
  for (let i = 27; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.10 + 0.03;
    const dir = rng() < 0.68 ? 1 : -1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.04 + 0.01, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.04 - 0.01, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + 0.025;
  }

  return candles;
}

// ── Scenario 4: XAUUSD Bearish (intermediate) ───────────────────────────────
function buildXauusdBearish(): number[][] {
  const rng = mulberry32(44444);
  const candles: number[][] = [];
  let price = 2040.00;
  const t0 = 1706000000;
  const dec = 2;

  // Phase 1: Consolidation (0-5)
  for (let i = 0; i < 6; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 2.0 + 0.5) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.5 + 0.3, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.5 - 0.3, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.55) * 0.8;
  }

  // Phase 2: Strong impulse down — INDICATION (6-16)
  for (let i = 6; i < 17; i++) {
    const open = roundTo(price, dec);
    const body = -(rng() * 3.5 + 1.5);
    const close = roundTo(open + body, dec);
    const high = roundTo(open + rng() * 1.0 + 0.2, dec);
    const low = roundTo(close - rng() * 1.2 - 0.3, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - rng() * 0.5;
  }

  // Phase 3: Deep correction 60%+ pullback (17-28) — looks like reversal
  const swingLow = price;
  const corrTarget = swingLow + (2040.00 - swingLow) * (0.60 + rng() * 0.08);
  const corrDrift = (corrTarget - price) / 12;
  for (let i = 17; i < 29; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 1.0;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.2 + 0.2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.0 - 0.2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: Continuation lower — bears win (29-49)
  for (let i = 29; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 2.5 + 0.8;
    const dir = rng() < 0.72 ? -1 : 1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.2 + 0.2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.3 - 0.3, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - 0.6;
  }

  return candles;
}

// ── Scenario 5: NAS100 Bullish that FAILS (advanced) ────────────────────────
function buildNas100Failed(): number[][] {
  const rng = mulberry32(55555);
  const candles: number[][] = [];
  let price = 17500;
  const t0 = 1706000000;
  const dec = 2;

  // Phase 1: Consolidation (0-5)
  for (let i = 0; i < 6; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 15 + 5) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 10 + 2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 10 - 2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.45) * 5;
  }

  // Phase 2: Impulse up — INDICATION (6-14)
  for (let i = 6; i < 15; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 20 + 12;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 8 + 2, dec);
    const low = roundTo(open - rng() * 6 - 1, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 3;
  }

  // Phase 3: Correction pullback (15-23)
  const swingHigh = price;
  const corrTarget = swingHigh - (swingHigh - 17500) * 0.45;
  const corrDrift = (corrTarget - price) / 9;
  for (let i = 15; i < 24; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 8;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 8 + 2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 8 - 2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: False continuation — rallies then BREAKS structure (24-34)
  for (let i = 24; i < 30; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 15 + 5;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 6 + 1, dec);
    const low = roundTo(open - rng() * 5 - 1, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 2;
  }

  // Phase 5: Structure breaks — big sell-off (30-49)
  for (let i = 30; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 18 + 8;
    const dir = rng() < 0.75 ? -1 : 1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 10 + 2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 12 - 3, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - 5;
  }

  return candles;
}

// ── Scenario 6: EURUSD Reversal (advanced) ───────────────────────────────────
function buildEurusdReversal(): number[][] {
  const rng = mulberry32(66666);
  const candles: number[][] = [];
  let price = 1.1100;
  const t0 = 1706000000;
  const dec = 5;

  // Phase 1: Existing downtrend (0-14)
  for (let i = 0; i < 15; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0012 + 0.0004;
    const dir = rng() < 0.7 ? -1 : 1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0005 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0005 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close - 0.0004;
  }

  // Phase 2: Break of structure — strong bullish candle(s) (15-18)
  for (let i = 15; i < 19; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0018 + 0.0012;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(open - rng() * 0.0003 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 0.0002;
  }

  // Phase 3: New bullish indication impulse (19-28)
  for (let i = 19; i < 29; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0014 + 0.0006;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(open - rng() * 0.0003 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 0.0002;
  }

  // Phase 4: Correction (29-36)
  const swingHigh = price;
  const corrTarget = swingHigh - (swingHigh - 1.1020) * 0.40;
  const corrDrift = (corrTarget - price) / 8;
  for (let i = 29; i < 37; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 0.0004;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0004 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 5: Continuation higher (37-49)
  for (let i = 37; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 0.0012 + 0.0004;
    const dir = rng() < 0.7 ? 1 : -1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 0.0005 + 0.0001, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.0004 - 0.0001, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + 0.0003;
  }

  return candles;
}

// ── Scenario 7: GBPJPY Range — NO valid ICC (expert) ────────────────────────
function buildGbpjpyRange(): number[][] {
  const rng = mulberry32(77777);
  const candles: number[][] = [];
  let price = 189.00;
  const t0 = 1706000000;
  const dec = 3;
  const rangeMid = 189.00;
  const rangeHalf = 1.00; // oscillates between 188.00-190.00

  for (let i = 0; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 0.25 + 0.05) * (rng() < 0.5 ? 1 : -1);
    let close = roundTo(open + body, dec);

    // Mean-revert to keep in range
    const distFromMid = close - rangeMid;
    if (Math.abs(distFromMid) > rangeHalf * 0.8) {
      close = roundTo(close - distFromMid * 0.4, dec);
    }

    const high = roundTo(Math.max(open, close) + rng() * 0.15 + 0.03, dec);
    const low = roundTo(Math.min(open, close) - rng() * 0.15 - 0.03, dec);

    // Hard clamp to range boundaries
    const clampedHigh = roundTo(Math.min(high, 190.20), dec);
    const clampedLow = roundTo(Math.max(low, 187.80), dec);

    candles.push([t0 + i * 14400, open, clampedHigh, clampedLow, close]);

    // Next open mean-reverts
    const revert = (rangeMid - close) * 0.15;
    price = close + revert + (rng() - 0.5) * 0.2;
    price = Math.max(188.20, Math.min(189.80, price));
  }

  return candles;
}

// ── Scenario 8: XAUUSD News Recovery (expert) ───────────────────────────────
function buildXauusdNewsRecovery(): number[][] {
  const rng = mulberry32(88888);
  const candles: number[][] = [];
  let price = 2050.00;
  const t0 = 1706000000;
  const dec = 2;

  // Phase 1: Pre-news calm (0-7)
  for (let i = 0; i < 8; i++) {
    const open = roundTo(price, dec);
    const body = (rng() * 1.5 + 0.3) * (rng() < 0.5 ? 1 : -1);
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.0 + 0.2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.0 - 0.2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + (rng() - 0.45) * 0.5;
  }

  // Phase 2: News spike to ~2090 (8-12) — 5 big bullish candles
  for (let i = 8; i < 13; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 6.0 + 4.0;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 2.5 + 0.5, dec);
    const low = roundTo(open - rng() * 1.5 - 0.3, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 1.0;
  }

  // Phase 3: Pullback to ~2060 (13-22) — volatile retrace
  const spikeHigh = price;
  const pullbackTarget = 2060.00;
  const pbDrift = (pullbackTarget - price) / 10;
  for (let i = 13; i < 23; i++) {
    const open = roundTo(price, dec);
    const body = pbDrift + (rng() - 0.5) * 2.0;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 2.0 + 0.5, dec);
    const low = roundTo(Math.min(open, close) - rng() * 2.0 - 0.5, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 4: New ICC indication — impulse up (23-32)
  for (let i = 23; i < 33; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 2.0 + 1.0;
    const close = roundTo(open + body, dec);
    const high = roundTo(close + rng() * 1.0 + 0.2, dec);
    const low = roundTo(open - rng() * 0.8 - 0.2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + rng() * 0.3;
  }

  // Phase 5: Small correction (33-38)
  const swHigh = price;
  const corrTarget = swHigh - (swHigh - 2060) * 0.35;
  const corrDrift = (corrTarget - price) / 6;
  for (let i = 33; i < 39; i++) {
    const open = roundTo(price, dec);
    const body = corrDrift + (rng() - 0.5) * 1.0;
    const close = roundTo(open + body, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.0 + 0.2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.0 - 0.2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close;
  }

  // Phase 6: Continuation to ~2080 (39-49)
  for (let i = 39; i < 50; i++) {
    const open = roundTo(price, dec);
    const body = rng() * 2.0 + 0.6;
    const dir = rng() < 0.7 ? 1 : -1;
    const close = roundTo(open + body * dir, dec);
    const high = roundTo(Math.max(open, close) + rng() * 1.2 + 0.2, dec);
    const low = roundTo(Math.min(open, close) - rng() * 1.0 - 0.2, dec);
    candles.push([t0 + i * 14400, open, high, low, close]);
    price = close + 0.4;
  }

  return candles;
}

// ── Build all scenarios ──────────────────────────────────────────────────────

export const ICC_SCENARIOS: ICCScenario[] = [
  {
    id: 'icc-eurusd-bullish',
    name: 'EURUSD Bullish Trend',
    instrument: 'EURUSD',
    difficulty: 'beginner',
    description:
      'A textbook bullish ICC setup on EURUSD. Price establishes a clear uptrend with a strong impulse move (indication), pulls back 38-50% (correction), then continues higher (continuation). Identify the three phases and find your entry on the continuation.',
    session: 'London',
    sessionHours: '07:00 - 16:00 UTC',
    assetGuidance:
      'EURUSD is the most liquid forex pair. During London session, spreads are tightest and ICC patterns form cleanest. Look for the impulse move in the first 2 hours of London open.',
    accentColor: 'neon-cyan',
    pipValue: 10,
    seed: 11111,
    h4Data: buildEurusdBullish(),
    answer: {
      bias: 'bullish',
      indicationRange: [32, 72], // 1H indices (4H candles 8-18 × 4)
      correctionRange: [304, 448], // 15M indices (4H candles 19-28 × 16)
      continuationCandle: 700, // 5M index (4H candle ~29 × 48/2)
      optimalEntry: { price: 1.0950, sl: 1.0910, tp: 1.1070 },
    },
  },
  {
    id: 'icc-gbpusd-bearish',
    name: 'GBPUSD Bearish Trend',
    instrument: 'GBPUSD',
    difficulty: 'beginner',
    description:
      'A clean bearish ICC pattern on GBPUSD. Price drops sharply (indication), bounces up for a correction, then continues lower. Practice identifying bearish bias and waiting for the correction to complete before entering short.',
    session: 'London',
    sessionHours: '07:00 - 16:00 UTC',
    assetGuidance:
      'GBPUSD tends to move faster than EURUSD with wider ranges. In London session, cable often sets its daily range in the first 3 hours. Watch for aggressive impulse moves off key levels.',
    accentColor: 'neon-green',
    pipValue: 10,
    seed: 22222,
    h4Data: buildGbpusdBearish(),
    answer: {
      bias: 'bearish',
      indicationRange: [28, 68], // 1H indices (4H candles 7-17 × 4)
      correctionRange: [288, 432], // 15M indices (4H candles 18-27 × 16)
      continuationCandle: 672, // 5M index
      optimalEntry: { price: 1.2650, sl: 1.2690, tp: 1.2530 },
    },
  },
  {
    id: 'icc-usdjpy-bullish',
    name: 'USDJPY Shallow Pullback',
    instrument: 'USDJPY',
    difficulty: 'intermediate',
    description:
      'A bullish USDJPY setup with a deceptively shallow correction (only 25-30% pullback). Many traders wait for a deeper pullback that never comes. This scenario tests your patience and ability to enter on a shallow correction with proper risk management.',
    session: 'Tokyo-London',
    sessionHours: '00:00 - 10:00 UTC',
    assetGuidance:
      'USDJPY is most active during Tokyo-London overlap. Yen pairs tend to trend strongly once momentum establishes. Shallow pullbacks are common in strong trends — do not wait for 50% if momentum is clearly one-sided.',
    accentColor: 'neon-amber',
    pipValue: 6.67,
    seed: 33333,
    h4Data: buildUsdjpyBullish(),
    answer: {
      bias: 'bullish',
      indicationRange: [24, 64], // 1H (4H 6-16 × 4)
      correctionRange: [272, 416], // 15M (4H 17-26 × 16)
      continuationCandle: 648, // 5M
      optimalEntry: { price: 149.20, sl: 148.90, tp: 150.10 },
    },
  },
  {
    id: 'icc-xauusd-bearish',
    name: 'XAUUSD Deep Correction Trap',
    instrument: 'XAUUSD',
    difficulty: 'intermediate',
    description:
      'Gold drops sharply then stages a 60%+ correction that looks like a full reversal. Many traders flip bullish here — but the original bearish bias holds. This scenario teaches you to trust the higher-timeframe structure and not get faked out by deep corrections.',
    session: 'London-NY Overlap',
    sessionHours: '12:00 - 17:00 UTC',
    assetGuidance:
      'XAUUSD is highly volatile during London-NY overlap. Gold often makes deep corrections that trap reversal traders before continuing the trend. Trust the initial impulse direction unless structure clearly breaks.',
    accentColor: 'neon-red',
    pipValue: 1,
    seed: 44444,
    h4Data: buildXauusdBearish(),
    answer: {
      bias: 'bearish',
      indicationRange: [24, 64], // 1H (4H 6-16 × 4)
      correctionRange: [272, 448], // 15M (4H 17-28 × 16)
      continuationCandle: 696, // 5M
      optimalEntry: { price: 2025.00, sl: 2035.00, tp: 2005.00 },
    },
  },
  {
    id: 'icc-nas100-failed',
    name: 'NAS100 Failed Continuation',
    instrument: 'NAS100',
    difficulty: 'advanced',
    description:
      'This setup looks like a perfect bullish ICC — impulse up, clean correction, then continuation. But the continuation FAILS and price breaks structure to the downside. This is a critical lesson: recognize when ICC invalidates and cut your loss. Not every setup works.',
    session: 'New York Open',
    sessionHours: '13:30 - 20:00 UTC',
    assetGuidance:
      'NAS100 is prone to failed breakouts around the NY open. High-beta tech stocks can reverse sharply on sector rotation or macro headlines. Always have a hard stop and recognize invalidation quickly.',
    accentColor: 'neon-purple',
    pipValue: 1,
    seed: 55555,
    h4Data: buildNas100Failed(),
    answer: {
      bias: 'bullish',
      indicationRange: [24, 56], // 1H (4H 6-14 × 4)
      correctionRange: [240, 368], // 15M (4H 15-23 × 16)
      continuationCandle: 576, // 5M — entry point (which then fails)
      optimalEntry: { price: 17620.00, sl: 17570.00, tp: 17720.00 },
    },
  },
  {
    id: 'icc-eurusd-reversal',
    name: 'EURUSD Trend Reversal ICC',
    instrument: 'EURUSD',
    difficulty: 'advanced',
    description:
      'Price is in a downtrend, then breaks structure with a strong bullish impulse. A NEW bullish ICC forms after the break of structure. This teaches you to spot fresh ICC setups after trend reversals — the highest-probability entries in trading.',
    session: 'London',
    sessionHours: '07:00 - 16:00 UTC',
    assetGuidance:
      'After a break of structure on EURUSD, the first ICC pattern in the new direction is the highest-probability setup. Wait for the break to be confirmed (close above/below key level), then look for indication-correction-continuation in the new direction.',
    accentColor: 'neon-cyan',
    pipValue: 10,
    seed: 66666,
    h4Data: buildEurusdReversal(),
    answer: {
      bias: 'bullish',
      indicationRange: [76, 112], // 1H (4H 19-28 × 4)
      correctionRange: [464, 576], // 15M (4H 29-36 × 16)
      continuationCandle: 888, // 5M (~4H candle 37)
      optimalEntry: { price: 1.1060, sl: 1.1020, tp: 1.1180 },
    },
  },
  {
    id: 'icc-gbpjpy-range',
    name: 'GBPJPY Range — No Trade',
    instrument: 'GBPJPY',
    difficulty: 'expert',
    description:
      'Price oscillates in a tight range between 188.00 and 190.00 with no valid ICC pattern. There is NO correct trade here. This is a discipline test — the best traders know when NOT to trade. Identify the ranging conditions and stay flat.',
    session: 'London',
    sessionHours: '07:00 - 16:00 UTC',
    assetGuidance:
      'GBPJPY in a range is a trap for aggressive traders. Without a clear impulse move that breaks range structure, there is no valid ICC setup. Patience is your edge — wait for range expansion before looking for ICC.',
    accentColor: 'neon-amber',
    pipValue: 6.67,
    seed: 77777,
    h4Data: buildGbpjpyRange(),
    answer: {
      bias: 'bearish', // Not applicable — no valid trade
      indicationRange: [0, 0], // No valid indication
      correctionRange: [0, 0], // No valid correction
      continuationCandle: 0, // No valid entry
      optimalEntry: { price: 0, sl: 0, tp: 0 }, // No trade — student should recognize this
    },
  },
  {
    id: 'icc-xauusd-news',
    name: 'XAUUSD Post-News ICC',
    instrument: 'XAUUSD',
    difficulty: 'expert',
    description:
      'Gold spikes to ~2090 on a news event, then pulls back to ~2060 as volatility settles. After the dust clears, a valid bullish ICC forms — indication up from 2060, correction, then continuation toward 2080. This teaches finding clean structure after chaos.',
    session: 'New York',
    sessionHours: '13:30 - 20:00 UTC',
    assetGuidance:
      'After news-driven spikes on XAUUSD, do NOT chase the initial move. Wait for price to settle and form a new structure. The first clean ICC after volatility subsides offers excellent risk-reward because the directional bias has been established.',
    accentColor: 'neon-red',
    pipValue: 1,
    seed: 88888,
    h4Data: buildXauusdNewsRecovery(),
    answer: {
      bias: 'bullish',
      indicationRange: [92, 128], // 1H (4H 23-32 × 4)
      correctionRange: [528, 608], // 15M (4H 33-38 × 16)
      continuationCandle: 936, // 5M (~4H candle 39)
      optimalEntry: { price: 2072.00, sl: 2064.00, tp: 2088.00 },
    },
  },
];

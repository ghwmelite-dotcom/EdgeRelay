/**
 * ICC Candle Generator — Generates multi-timeframe candle data
 * from 4H seed candles using deterministic interpolation.
 *
 * 4H → 1H (4 subdivisions per candle)
 * 1H → 15M (4 subdivisions per candle)
 * 15M → 5M (3 subdivisions per candle)
 */

import type { Candle } from './chart-simulator-engine';

// Seeded PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Interpolate a single parent candle into N child candles.
 * Children's combined range stays within parent's H/L,
 * first child opens at parent.o, last child closes at parent.c.
 */
export function interpolateCandle(
  parent: Candle,
  subdivisions: number,
  rng: () => number,
  childInterval: number,
): Candle[] {
  const children: Candle[] = [];
  const range = parent.h - parent.l;
  const volatility = range * 0.15;

  // Generate intermediate close prices via random walk within parent range
  const closes: number[] = [parent.o];
  for (let i = 1; i < subdivisions; i++) {
    const target = parent.o + (parent.c - parent.o) * (i / subdivisions);
    const noise = gaussianRandom(rng) * volatility;
    let price = target + noise;
    // Clamp within parent range with small buffer
    price = Math.max(parent.l + range * 0.02, Math.min(parent.h - range * 0.02, price));
    closes.push(price);
  }
  closes.push(parent.c);

  for (let i = 0; i < subdivisions; i++) {
    const open = closes[i];
    const close = closes[i + 1];
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);

    // Generate wicks — stay within parent range
    const wickUp = Math.abs(rng()) * volatility * 0.5;
    const wickDown = Math.abs(rng()) * volatility * 0.5;
    const high = Math.min(parent.h, bodyHigh + wickUp);
    const low = Math.max(parent.l, bodyLow - wickDown);

    children.push({
      t: parent.t + i * childInterval,
      o: open,
      h: high,
      l: low,
      c: close,
    });
  }

  return children;
}

/**
 * Generate a full lower timeframe from parent candles.
 */
export function generateTimeframe(
  parentCandles: Candle[],
  subdivisions: number,
  seed: number,
  childIntervalSeconds: number,
): Candle[] {
  const rng = mulberry32(seed);
  const result: Candle[] = [];

  for (const parent of parentCandles) {
    const children = interpolateCandle(parent, subdivisions, rng, childIntervalSeconds);
    result.push(...children);
  }

  return result;
}

/**
 * Generate all 4 timeframes from 4H seed data.
 */
export function generateAllTimeframes(
  h4Candles: Candle[],
  seed: number,
): { h4: Candle[]; h1: Candle[]; m15: Candle[]; m5: Candle[] } {
  const h1 = generateTimeframe(h4Candles, 4, seed, 3600);
  const m15 = generateTimeframe(h1, 4, seed + 1000, 900);
  const m5 = generateTimeframe(m15, 3, seed + 2000, 300);

  return { h4: h4Candles, h1, m15, m5 };
}

/**
 * Convert compact array format [t, o, h, l, c] to Candle objects.
 */
export function unpackCandles(packed: number[][]): Candle[] {
  return packed.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

export type Timeframe = '4H' | '1H' | '15M' | '5M';

export const TF_LABELS: Record<Timeframe, string> = {
  '4H': '4 Hour',
  '1H': '1 Hour',
  '15M': '15 Min',
  '5M': '5 Min',
};

// Tick ratios — how many 5M candles per higher TF candle
export const TF_TICK_RATIOS: Record<Timeframe, number> = {
  '5M': 1,
  '15M': 3,
  '1H': 12,
  '4H': 48,
};

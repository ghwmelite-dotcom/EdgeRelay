// Shared swing-point detection. ICC reads pure structure, so every downstream
// module relies on a consistent definition of "swing high" and "swing low".
//
// A swing high is a candle whose high is strictly greater than the highs of
// the `lookback` candles on each side. Mirror logic for swing lows. Lookback
// of 2 gives us responsive pivots on 4H that still filter out single-bar
// noise. Memory of the module: the oldest candle is index 0.

import type { SwingPoint } from '@edgerelay/shared';

export interface Candle {
  time: number;   // Unix seconds, ascending
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function detectSwings(candles: Candle[], lookback = 2): SwingPoint[] {
  const swings: SwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return swings;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      const prev = candles[i - j]!;
      const next = candles[i + j]!;
      if (prev.high >= c.high || next.high >= c.high) isHigh = false;
      if (prev.low  <= c.low  || next.low  <= c.low)  isLow  = false;
    }
    if (isHigh) swings.push({ type: 'high', price: c.high, index: i });
    if (isLow)  swings.push({ type: 'low',  price: c.low,  index: i });
  }

  return swings;
}

/** Returns the last N swings in chronological order (oldest → newest). */
export function lastSwings(swings: SwingPoint[], n: number): SwingPoint[] {
  return swings.slice(-n);
}

/** Latest swing high (closest to present). */
export function latestSwingHigh(swings: SwingPoint[]): SwingPoint | null {
  for (let i = swings.length - 1; i >= 0; i--) {
    const s = swings[i];
    if (s && s.type === 'high') return s;
  }
  return null;
}

/** Latest swing low (closest to present). */
export function latestSwingLow(swings: SwingPoint[]): SwingPoint | null {
  for (let i = swings.length - 1; i >= 0; i--) {
    const s = swings[i];
    if (s && s.type === 'low') return s;
  }
  return null;
}

/** Nth-latest swing of a given type (1 = latest, 2 = previous, ...). */
export function nthLatestSwing(
  swings: SwingPoint[],
  type: 'high' | 'low',
  n: number,
): SwingPoint | null {
  let count = 0;
  for (let i = swings.length - 1; i >= 0; i--) {
    const s = swings[i];
    if (s && s.type === type) {
      count++;
      if (count === n) return s;
    }
  }
  return null;
}

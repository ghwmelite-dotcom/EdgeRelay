// Breakout detector: scans M15 candles after the range close for the
// FIRST candle that closes outside the range. Returns the signal
// candle or null if nothing has broken yet.
//
// Philosophy matches Crabel's original ORB rules: the break is confirmed
// on close, not intrabar. A wick above the range that closes back inside
// does not fire a signal — exactly the kind of false break that intraday
// mean reversion thrives on.

import type { Candle } from '../bias/swings.js';

export interface BreakoutResult {
  direction: 'long' | 'short';
  candle: Candle;
  price: number;
  breakAtUnix: number;
}

export function detectBreakout(
  candles: Candle[],
  rangeCloseUnix: number,
  rangeHigh: number,
  rangeLow: number,
  validityEndUnix: number,
): BreakoutResult | null {
  // Consider only candles that closed strictly after range formation and
  // on or before the validity cutoff. Candle.time is the open time; the
  // candle is considered closed at time + 15 min.
  for (const c of candles) {
    const openTs = c.time;
    const closeTs = openTs + 15 * 60;
    if (openTs < rangeCloseUnix) continue;
    if (openTs >= validityEndUnix) break;
    // The candle must be closed — we don't fire on a forming bar.
    // Callers pass only complete candles, but belt-and-braces: skip the
    // implicit "latest incomplete" if it somehow made it through.
    if (closeTs > Date.now() / 1000 + 60) continue;

    if (c.close > rangeHigh) {
      return { direction: 'long', candle: c, price: c.close, breakAtUnix: closeTs };
    }
    if (c.close < rangeLow) {
      return { direction: 'short', candle: c, price: c.close, breakAtUnix: closeTs };
    }
  }
  return null;
}

/** After a signal fires, walk forward candles to find outcome: SL hit,
 *  TP1 hit, TP2 hit, or timeout (session validity end reached). */
export function resolveOutcome(
  candles: Candle[],
  signalAtUnix: number,
  direction: 'long' | 'short',
  entry: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2: number,
  validityEndUnix: number,
): { outcome: 'tp1' | 'tp2' | 'sl' | 'timeout' | 'open'; price: number; atUnix: number; rMultiple: number } | null {
  const slDistance = Math.abs(entry - stopLoss);
  const forward = candles.filter((c) => c.time >= signalAtUnix && c.time < validityEndUnix);
  if (forward.length === 0) return null;

  for (const c of forward) {
    // Check SL first (conservative — assume worst-case intrabar order)
    if (direction === 'long') {
      if (c.low  <= stopLoss)     return { outcome: 'sl',  price: stopLoss,     atUnix: c.time + 15*60, rMultiple: -1 };
      if (c.high >= takeProfit2)  return { outcome: 'tp2', price: takeProfit2,  atUnix: c.time + 15*60, rMultiple: +(takeProfit2 - entry) / slDistance };
      if (c.high >= takeProfit1)  return { outcome: 'tp1', price: takeProfit1,  atUnix: c.time + 15*60, rMultiple: +(takeProfit1 - entry) / slDistance };
    } else {
      if (c.high >= stopLoss)     return { outcome: 'sl',  price: stopLoss,     atUnix: c.time + 15*60, rMultiple: -1 };
      if (c.low  <= takeProfit2)  return { outcome: 'tp2', price: takeProfit2,  atUnix: c.time + 15*60, rMultiple: +(entry - takeProfit2) / slDistance };
      if (c.low  <= takeProfit1)  return { outcome: 'tp1', price: takeProfit1,  atUnix: c.time + 15*60, rMultiple: +(entry - takeProfit1) / slDistance };
    }
  }

  // Session ended without resolution. If the validity window has passed,
  // record a timeout exit at the last candle's close.
  const last = forward[forward.length - 1]!;
  if (Date.now() / 1000 >= validityEndUnix) {
    const exitPrice = last.close;
    const rMultiple =
      direction === 'long'
        ? (exitPrice - entry) / slDistance
        : (entry - exitPrice) / slDistance;
    return { outcome: 'timeout', price: exitPrice, atUnix: validityEndUnix, rMultiple };
  }
  return { outcome: 'open', price: last.close, atUnix: last.time + 15*60, rMultiple: 0 };
}

// Opening-range tracker: finds the two M15 candles that bound a session
// open and returns the resulting high / low / ATR / size.
//
// The range is the max high and min low of the two M15 candles whose
// open times are {session_open, session_open + 15 min}. Before both
// candles have closed, the range is not yet observable — the function
// returns null and the cron skips this session this tick.

import type { Candle } from '../bias/swings.js';
import type { OrbRange } from '@edgerelay/shared';
import type { SessionBounds } from './sessionWindow.js';

export function computeOpeningRange(
  candles: Candle[],
  bounds: SessionBounds,
): OrbRange | null {
  // Find the two M15 candles starting at openUnix and openUnix + 15 min.
  const firstStart = bounds.openUnix;
  const secondStart = bounds.openUnix + 15 * 60;

  const first  = candles.find((c) => c.time === firstStart);
  const second = candles.find((c) => c.time === secondStart);

  if (!first || !second) return null;

  // Both must be fully closed (the latest candle in the feed must start
  // at or after rangeCloseUnix — i.e., the 07:30 candle or later exists).
  const hasClosed = candles.some((c) => c.time >= bounds.rangeCloseUnix);
  if (!hasClosed) return null;

  const high = Math.max(first.high, second.high);
  const low  = Math.min(first.low,  second.low);

  return {
    high,
    low,
    formedAtUnix: bounds.rangeCloseUnix,
    atr: computeAtr(candles, bounds.rangeCloseUnix, 14),
    rangePct: low > 0 ? ((high - low) / low) * 100 : 0,
  };
}

/** ATR(n) computed over the n M15 candles closed just before `asOfUnix`.
 *  Uses classic Wilder ATR: TR = max(h-l, |h-prevClose|, |l-prevClose|),
 *  then simple mean. (Simple mean is close enough to Wilder's smoothing
 *  at n=14 for this use case — we only need an order-of-magnitude scale.) */
export function computeAtr(candles: Candle[], asOfUnix: number, n: number): number {
  const priors = candles.filter((c) => c.time < asOfUnix);
  if (priors.length < n + 1) return 0;
  const slice = priors.slice(-n - 1);
  let sumTr = 0;
  let count = 0;
  for (let i = 1; i < slice.length; i++) {
    const cur = slice[i]!;
    const prev = slice[i - 1]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low  - prev.close),
    );
    sumTr += tr;
    count++;
  }
  return count > 0 ? sumTr / count : 0;
}

// Suggested trade plan derived from ICC structure.
//
// Only emitted when phase === 'CONTINUATION' AND tradeable AND the impulse
// range is clean (a well-formed correction). Never "you should trade this"
// — always "reference levels for planning; drop to 15M/5M for execution".
//
// Levels:
//   Entry : current candle close (the Continuation trigger)
//   SL    : opposite side of the swing that held the correction, plus a
//           small buffer sized as a fraction of the impulse range. Buffer
//           prevents noise-wick stop-outs while preserving invalidation
//           logic (a real break of the swing kills the setup).
//   TP1   : 2R target (2× SL distance) — the ICC default
//   TP2   : 3R target — swing-to-swing extension

import type { BiasDirection, ICCBreakdown, TradePlan } from '@edgerelay/shared';

export function computeTradePlan(
  icc: ICCBreakdown,
  bias: BiasDirection,
  tradeable: boolean,
  currentPrice: number,
): TradePlan | null {
  if (!tradeable) return null;
  if (icc.phase.current !== 'CONTINUATION') return null;
  if (!icc.correction.impulseRange) return null;
  if (bias === 'NEUTRAL') return null;
  if (currentPrice <= 0) return null;

  const { high, low } = icc.correction.impulseRange;
  const impulse = high - low;
  if (impulse <= 0) return null;

  // Buffer = 8% of impulse range. On a typical 4H impulse this sits beyond
  // common wick noise but inside "this setup is invalidated" territory.
  const buffer = impulse * 0.08;

  const isLong = bias === 'BULLISH';

  // Round entry and SL first, then derive TPs from the rounded SL
  // distance. Rounding each level independently can introduce a tiny
  // drift that makes the displayed RR come out slightly below 2.0 —
  // the house rule is "1:2 or more always, nothing less" so we compute
  // off the rounded SL to guarantee the displayed numbers themselves
  // satisfy RR ≥ 2.
  const roundedEntry = round(currentPrice);
  const roundedSl = round(isLong ? low - buffer : high + buffer);

  const minTick = Math.max(Math.abs(roundedEntry) * 0.0001, 1e-8);
  let slDistance = Math.abs(roundedEntry - roundedSl);
  if (slDistance < minTick) return null;   // too tight — reject rather than lie

  // Reject nonsense: if entry is already beyond SL (e.g., price is below
  // the swing low in a "bullish" read), the plan is invalid.
  if (isLong && roundedSl >= roundedEntry) return null;
  if (!isLong && roundedSl <= roundedEntry) return null;

  // Bump by the smallest grid tick until raw-FP RR ≥ multiple.
  // Prevents IEEE 754 drift from reporting RR = 1.9999…e-14 on
  // the stored 5-dp decimals.
  const tp1 = bumpTpForRR(roundedEntry, roundedSl, 2, isLong);
  const tp2 = bumpTpForRR(roundedEntry, roundedSl, 3, isLong);

  const slPct = (slDistance / roundedEntry) * 100;
  const tp1Pct = (Math.abs(tp1 - roundedEntry) / roundedEntry) * 100;
  const tp2Pct = (Math.abs(tp2 - roundedEntry) / roundedEntry) * 100;

  return {
    direction: isLong ? 'long' : 'short',
    entry: roundedEntry,
    stopLoss: roundedSl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    slDistancePct: round(slPct, 2),
    tp1DistancePct: round(tp1Pct, 2),
    tp2DistancePct: round(tp2Pct, 2),
    rationaleSl: isLong
      ? `Swing low ${round(low)} held the correction; 8% impulse buffer below invalidates structure. TP1 at 1:2R, TP2 at 1:3R — RR floor enforced.`
      : `Swing high ${round(high)} held the correction; 8% impulse buffer above invalidates structure. TP1 at 1:2R, TP2 at 1:3R — RR floor enforced.`,
  };
}

function round(n: number, dp = 5): number {
  const factor = 10 ** dp;
  return Math.round(n * factor) / factor;
}

function bumpTpForRR(entry: number, sl: number, multiple: number, isLong: boolean, dp = 5): number {
  const lsd = 10 ** -dp;
  const slDist = Math.abs(entry - sl);
  let tp = round(isLong ? entry + slDist * multiple : entry - slDist * multiple, dp);
  for (let i = 0; i < 4; i++) {
    if (Math.abs(tp - entry) / slDist >= multiple) return tp;
    tp = round(isLong ? tp + lsd : tp - lsd, dp);
  }
  return tp;
}

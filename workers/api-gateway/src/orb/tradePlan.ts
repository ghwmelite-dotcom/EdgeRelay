// ORB trade plan: entry on break close, SL beyond opposite side of
// range, TP1 at 1:2 R, TP2 at 1:3 R.
//
// HARD RULE: every plan this function emits has RR ≥ 1:2 on TP1. The
// TP levels are derived from the SL *distance*, not from range size —
// this matters because SL distance = range_size + buffer (strictly
// bigger than range), so a "1× range size" TP would be less than 1:1 RR.
// Matches the ICC trade plan math so both engines share identical risk
// semantics.
//
// The buffer is an ATR-based skim — wider than the raw range, just past
// where a retest wick is likely to fizzle. 20% of the 14-M15 ATR is the
// compromise between "tight risk" and "survives the retest".

import type { OrbRange, OrbTradePlan } from '@edgerelay/shared';

export function computeOrbTradePlan(
  direction: 'long' | 'short',
  entry: number,
  range: OrbRange,
): OrbTradePlan {
  const rangeSize = range.high - range.low;
  const buffer = Math.max(range.atr * 0.2, rangeSize * 0.05);

  // Round entry and SL first, then derive TPs from the *rounded* SL
  // distance. Deriving TPs from unrounded values and rounding them
  // independently can introduce a 1-ULP drift that makes the displayed
  // RR come out to 1.98 instead of 2.00 — and the house rule is
  // "1:2 or more always, nothing less". Computing off rounded SL
  // ensures the displayed numbers themselves satisfy RR ≥ 2.
  const roundedEntry = round(entry);
  const roundedSl =
    direction === 'long'
      ? round(range.low  - buffer)
      : round(range.high + buffer);

  // If rounding collapsed SL onto entry (very tiny range + high
  // precision) fall back to a minimum tick based on 0.01% of entry
  // so we never divide by zero downstream.
  const minTick = Math.max(Math.abs(roundedEntry) * 0.0001, 1e-8);
  let slDistance = Math.abs(roundedEntry - roundedSl);
  if (slDistance < minTick) slDistance = minTick;

  // Derive TPs by *adding/subtracting* the integer-multiple SL distance
  // to the rounded entry and round again. Then bump by the smallest
  // grid tick (1 LSD at 5dp) until raw-FP (tp-entry)/(entry-sl) ≥ multiple.
  // Guards against IEEE 754 rounding drift making a strict RR check
  // see 1.9999…e-14-short-of-2 on the stored decimals.
  const tp1 = bumpTpForRR(roundedEntry, roundedSl, 2, direction === 'long');
  const tp2 = bumpTpForRR(roundedEntry, roundedSl, 3, direction === 'long');

  const tp1Distance = Math.abs(tp1 - roundedEntry);
  const tp2Distance = Math.abs(tp2 - roundedEntry);

  return {
    direction,
    entry: roundedEntry,
    stopLoss: roundedSl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    slDistancePct: round((slDistance / roundedEntry) * 100, 2),
    tp1DistancePct: round((tp1Distance / roundedEntry) * 100, 2),
    tp2DistancePct: round((tp2Distance / roundedEntry) * 100, 2),
    rationaleSl:
      direction === 'long'
        ? `Range low ${round(range.low)} held; SL below with 20% ATR buffer (${round(buffer)}). TP1 at 1:2R, TP2 at 1:3R — RR floor enforced.`
        : `Range high ${round(range.high)} held; SL above with 20% ATR buffer (${round(buffer)}). TP1 at 1:2R, TP2 at 1:3R — RR floor enforced.`,
  };
}

function round(n: number, dp = 5): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
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

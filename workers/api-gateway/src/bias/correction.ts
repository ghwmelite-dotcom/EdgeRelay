// Module D — Correction Zone (weight 15%).
//
// When the market is in a CORRECTION phase, this module measures how deep
// the retracement has gone relative to the Indication impulse, and whether
// price currently sits in the "sweet spot" (38–62%) where Continuation is
// most likely.

import type {
  CorrectionModule,
  CorrectionZoneKind,
  ICCPhaseModule,
  MarketStateKind,
  SwingPoint,
} from '@edgerelay/shared';
import type { Candle } from './swings.js';
import { latestSwingHigh, latestSwingLow } from './swings.js';

export function analyzeCorrection(
  candles: Candle[],
  swings: SwingPoint[],
  marketState: MarketStateKind,
  phase: ICCPhaseModule,
): CorrectionModule {
  if (candles.length === 0 || phase.current === 'NO_SETUP') {
    return empty();
  }

  const last = candles[candles.length - 1];
  if (!last) return empty();
  const latestHigh = latestSwingHigh(swings);
  const latestLow  = latestSwingLow(swings);
  if (!latestHigh || !latestLow) return empty();

  let impulseHigh: number;
  let impulseLow: number;
  if (marketState === 'UPTREND') {
    impulseHigh = latestHigh.price;
    impulseLow  = latestLow.price;
  } else if (marketState === 'DOWNTREND') {
    impulseHigh = latestHigh.price;
    impulseLow  = latestLow.price;
  } else {
    return empty();
  }

  const range = impulseHigh - impulseLow;
  if (range <= 0) return empty();

  const retracements = {
    r25: marketState === 'UPTREND' ? impulseHigh - 0.25 * range : impulseLow + 0.25 * range,
    r38: marketState === 'UPTREND' ? impulseHigh - 0.382 * range : impulseLow + 0.382 * range,
    r50: marketState === 'UPTREND' ? impulseHigh - 0.5 * range  : impulseLow + 0.5 * range,
    r62: marketState === 'UPTREND' ? impulseHigh - 0.618 * range : impulseLow + 0.618 * range,
    r79: marketState === 'UPTREND' ? impulseHigh - 0.786 * range : impulseLow + 0.786 * range,
  };

  const depth =
    marketState === 'UPTREND'
      ? ((impulseHigh - last.close) / range) * 100
      : ((last.close - impulseLow) / range) * 100;

  const zone: CorrectionZoneKind =
    depth < 0   ? 'Above Impulse' :
    depth < 38  ? 'Shallow (0-38%)' :
    depth <= 62 ? 'Optimal (38-62%)' :
    depth <= 79 ? 'Deep (62-79%)' :
    depth < 100 ? 'Critical (79%+)' :
    'N/A';

  const inOptimalZone = depth >= 38 && depth <= 62;

  // Score: rewards optimal pullback depth in the right direction
  let score = 0;
  const sign = marketState === 'UPTREND' ? 1 : -1;
  if (inOptimalZone) score = 80 * sign;
  else if (depth >= 25 && depth < 38) score = 50 * sign;
  else if (depth > 62 && depth <= 79) score = 40 * sign;
  else if (depth > 79 && depth < 100) score = 10 * sign;
  else if (depth >= 0 && depth < 25)  score = 30 * sign;
  else score = 0;

  return {
    score: Math.round(score),
    impulseRange: { high: impulseHigh, low: impulseLow },
    currentDepth: Math.round(depth * 10) / 10,
    inOptimalZone,
    zone,
    retracementLevels: {
      r25: round(retracements.r25),
      r38: round(retracements.r38),
      r50: round(retracements.r50),
      r62: round(retracements.r62),
      r79: round(retracements.r79),
    },
  };
}

function empty(): CorrectionModule {
  return {
    score: 0,
    impulseRange: null,
    currentDepth: null,
    inOptimalZone: false,
    zone: 'N/A',
    retracementLevels: null,
  };
}

function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

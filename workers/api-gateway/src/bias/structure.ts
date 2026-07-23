// Module C — Swing Structure (weight 20%).
//
// Maps the most significant swing highs and lows so the UI can show the
// structural skeleton of the market. Also flags recent level breaks which
// materially informs the Indication detection in Module B.

import type { SwingStructureModule, SwingPoint } from '@edgerelay/shared';
import type { Candle } from './swings.js';
import { nthLatestSwing } from './swings.js';

export function analyzeStructure(
  candles: Candle[],
  swings: SwingPoint[],
): SwingStructureModule {
  const lastHigh  = nthLatestSwing(swings, 'high', 1);
  const lastLow   = nthLatestSwing(swings, 'low',  1);
  const prevHigh  = nthLatestSwing(swings, 'high', 2);
  const prevLow   = nthLatestSwing(swings, 'low',  2);

  // Recent breaks: scan the last 10 bars for closes that pierced an old swing.
  const recentBreaks: SwingStructureModule['recentBreaks'] = [];
  const lookbackBars = Math.min(10, candles.length);
  const horizonIdx = candles.length - lookbackBars;

  // Candidate swings to check for breaks (any swing older than lookback window)
  const candidates = swings.filter((s) => s.index < horizonIdx);

  for (let i = horizonIdx; i < candles.length; i++) {
    const c = candles[i];
    if (!c) continue;
    for (const s of candidates) {
      if (s.type === 'high' && c.close > s.price && !alreadyBroken(recentBreaks, s.price, 'above')) {
        recentBreaks.push({ level: s.price, direction: 'above', barsAgo: candles.length - 1 - i });
      }
      if (s.type === 'low' && c.close < s.price && !alreadyBroken(recentBreaks, s.price, 'below')) {
        recentBreaks.push({ level: s.price, direction: 'below', barsAgo: candles.length - 1 - i });
      }
    }
  }

  // Score: clean alternating structure with a clear latest swing pair scores higher.
  let score = 0;
  if (lastHigh && lastLow && prevHigh && prevLow) {
    const risingHighs = lastHigh.price > prevHigh.price;
    const risingLows  = lastLow.price  > prevLow.price;
    const fallingHighs = lastHigh.price < prevHigh.price;
    const fallingLows  = lastLow.price  < prevLow.price;
    if (risingHighs && risingLows)        score = 70;
    else if (fallingHighs && fallingLows) score = -70;
    else                                  score = 10; // messy

    // Bonus for recent break confirming direction
    const latestBreak = recentBreaks.slice(-1)[0];
    if (latestBreak) {
      if (latestBreak.direction === 'above' && score > 0) score = Math.min(90, score + 20);
      if (latestBreak.direction === 'below' && score < 0) score = Math.max(-90, score - 20);
    }
  }

  return {
    score: Math.round(score),
    keyLevels: {
      lastSwingHigh: lastHigh?.price ?? null,
      lastSwingLow:  lastLow?.price  ?? null,
      previousSwingHigh: prevHigh?.price ?? null,
      previousSwingLow:  prevLow?.price  ?? null,
    },
    recentBreaks: recentBreaks.slice(-5),
  };
}

function alreadyBroken(
  breaks: SwingStructureModule['recentBreaks'],
  level: number,
  direction: 'above' | 'below',
): boolean {
  return breaks.some((b) => b.level === level && b.direction === direction);
}

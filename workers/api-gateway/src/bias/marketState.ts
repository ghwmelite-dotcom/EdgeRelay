// Module A — Market State (weight 30%).
//
// ICC recognises exactly three states:
//   UPTREND       — progressive Higher Highs AND Higher Lows
//   DOWNTREND     — progressive Lower Highs AND Lower Lows
//   CONSOLIDATION — anything else (mixed HH/LL, flat, choppy)
//
// This is the foundation of the bias — if the market isn't cleanly trending
// on 4H, ICC says do NOT trade, regardless of what other modules show.

import type { MarketStateModule, MarketStateKind, SwingPoint } from '@edgerelay/shared';
import { nthLatestSwing } from './swings.js';

export function analyzeMarketState(swings: SwingPoint[]): MarketStateModule {
  const highs = swings.filter((s) => s.type === 'high').slice(-4);
  const lows  = swings.filter((s) => s.type === 'low').slice(-4);

  if (highs.length < 2 || lows.length < 2) {
    return {
      score: 0,
      state: 'CONSOLIDATION',
      swingSequence: 'Insufficient swing history',
      tradeable: false,
    };
  }

  const hhCount = countMonotonic(highs.map((h) => h.price), 'up');
  const hlCount = countMonotonic(lows.map((l) => l.price), 'up');
  const lhCount = countMonotonic(highs.map((h) => h.price), 'down');
  const llCount = countMonotonic(lows.map((l) => l.price), 'down');

  // Interleaved label sequence helps the UI render "HH, HL, HH, HL"
  const labelled = labelSwings(swings);

  let state: MarketStateKind = 'CONSOLIDATION';
  let score = 0;

  // Strong uptrend: at least 3 consecutive HH and 3 consecutive HL
  if (hhCount >= 3 && hlCount >= 3) {
    state = 'UPTREND';
    score = 80 + Math.min(20, (hhCount + hlCount - 6) * 4);
  } else if (hhCount >= 2 && hlCount >= 2) {
    state = 'UPTREND';
    score = 40 + (hhCount + hlCount - 4) * 10;
  } else if (llCount >= 3 && lhCount >= 3) {
    state = 'DOWNTREND';
    score = -(80 + Math.min(20, (llCount + lhCount - 6) * 4));
  } else if (llCount >= 2 && lhCount >= 2) {
    state = 'DOWNTREND';
    score = -(40 + (llCount + lhCount - 4) * 10);
  } else {
    state = 'CONSOLIDATION';
    // Tiny directional lean if one side shows slight advantage
    score = clamp((hhCount + hlCount - llCount - lhCount) * 5, -20, 20);
  }

  return {
    score: clamp(Math.round(score), -100, 100),
    state,
    swingSequence: labelled.slice(-6).join(', ') || 'n/a',
    tradeable: state !== 'CONSOLIDATION',
  };
}

// ── helpers ────────────────────────────────────────────────────

function countMonotonic(values: number[], direction: 'up' | 'down'): number {
  if (values.length === 0) return 0;
  let count = 1;
  for (let i = 1; i < values.length; i++) {
    const curr = values[i]!;
    const prev = values[i - 1]!;
    const rising = curr > prev;
    const falling = curr < prev;
    if ((direction === 'up' && rising) || (direction === 'down' && falling)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function labelSwings(swings: SwingPoint[]): string[] {
  const out: string[] = [];
  let prevHigh: number | null = null;
  let prevLow: number | null = null;
  for (const s of swings) {
    if (s.type === 'high') {
      out.push(prevHigh === null ? 'H' : s.price > prevHigh ? 'HH' : 'LH');
      prevHigh = s.price;
    } else {
      out.push(prevLow === null ? 'L' : s.price > prevLow ? 'HL' : 'LL');
      prevLow = s.price;
    }
  }
  return out;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// keep linter happy — nthLatestSwing exported from swings.ts is used elsewhere
export { nthLatestSwing };

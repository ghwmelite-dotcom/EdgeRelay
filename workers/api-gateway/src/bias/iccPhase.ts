// Module B — ICC Phase (weight 25%).
//
// After market state is established we locate which ICC phase the asset is
// currently in:
//   INDICATION   — price has just broken a prior swing; impulse still in play
//   CORRECTION   — post-break pullback against the indication direction
//   CONTINUATION — pullback has stalled and price is resuming the indication
//   NO_SETUP     — trend not clean enough, or no recent break to anchor to
//
// The function does NOT try to emulate multi-timeframe confirmation; that's
// the trader's job on 15M/5M. We only classify the 4H flow.

import type {
  ICCPhaseModule,
  ICCPhaseKind,
  MarketStateKind,
  SwingPoint,
} from '@edgerelay/shared';
import type { Candle } from './swings.js';
import { nthLatestSwing, latestSwingHigh, latestSwingLow } from './swings.js';

export function analyzeICCPhase(
  candles: Candle[],
  swings: SwingPoint[],
  marketState: MarketStateKind,
): ICCPhaseModule {
  if (marketState === 'CONSOLIDATION' || candles.length === 0) {
    return {
      score: 0,
      current: 'NO_SETUP',
      detail: 'Market is consolidating — ICC requires a clean trend on 4H before a setup can form.',
      indicationLevel: null,
      correctionDepth: null,
      entryReady: false,
    };
  }

  const lastIdx = candles.length - 1;
  const last = candles[lastIdx];
  if (!last) return noSetup('No candles supplied.');

  if (marketState === 'UPTREND') {
    // Find the most recent swing high before the current impulse
    const brokenHigh = nthLatestSwing(swings, 'high', 2); // second latest = the one that got broken
    const latestHigh = latestSwingHigh(swings);
    const latestLow  = latestSwingLow(swings);

    if (!brokenHigh || !latestHigh || !latestLow) {
      return noSetup('Not enough swing history to pin an Indication.');
    }

    // The latest swing high is the new peak created by the break; brokenHigh is the prior peak
    // Indication is valid only if the latest high actually exceeded the previous one.
    const indicationValid = latestHigh.price > brokenHigh.price;
    if (!indicationValid) {
      return noSetup('No recent Indication break on 4H.');
    }

    const barsSincePeak = lastIdx - latestHigh.index;
    const peakPrice = latestHigh.price;
    const swingLowPrice = latestLow.price;
    const impulseRange = peakPrice - swingLowPrice;

    // Current retracement from the peak, as % of impulse
    const retraced = impulseRange > 0
      ? clamp(((peakPrice - last.close) / impulseRange) * 100, 0, 200)
      : 0;

    // Phase detection ---------------------------------------------------
    //  - very recent peak & minimal retrace → INDICATION still unfolding
    //  - retraced > 10% and price below peak but above swing low → CORRECTION
    //  - retraced was deep, now price is pushing back toward peak → CONTINUATION
    //  - retraced > 100% (broke swing low) → NO_SETUP (structure broke)
    if (retraced >= 100) {
      return noSetup('Correction broke prior swing low — structure invalidated.');
    }

    // Look at last 3 closes to gauge whether price is pushing back up
    const recent = candles.slice(-3);
    const pushingUp =
      recent.length === 3 &&
      recent[2]!.close > recent[1]!.close &&
      recent[1]!.close > recent[0]!.close;

    let phase: ICCPhaseKind;
    let detail: string;
    let entryReady = false;

    if (barsSincePeak <= 1 && retraced < 20) {
      phase = 'INDICATION';
      detail = `Bullish Indication — price broke above ${fmt(brokenHigh.price)} on the last close. Wait for the correction.`;
    } else if (retraced >= 30 && retraced <= 79 && pushingUp) {
      phase = 'CONTINUATION';
      detail = `Correction held at ${retraced.toFixed(0)}% and price is pushing back up. Continuation is live.`;
      entryReady = true;
    } else if (retraced >= 10) {
      phase = 'CORRECTION';
      detail = `Pullback underway — currently ${retraced.toFixed(0)}% into the impulse. Let it finish.`;
    } else {
      phase = 'INDICATION';
      detail = `Bullish Indication break above ${fmt(brokenHigh.price)} — impulse still in progress.`;
    }

    return {
      score: scoreForPhase(phase, 'up'),
      current: phase,
      detail,
      indicationLevel: brokenHigh.price,
      correctionDepth: Math.round(retraced),
      entryReady,
    };
  }

  // DOWNTREND (mirror logic)
  const brokenLow = nthLatestSwing(swings, 'low', 2);
  const latestLow  = latestSwingLow(swings);
  const latestHigh = latestSwingHigh(swings);

  if (!brokenLow || !latestLow || !latestHigh) {
    return noSetup('Not enough swing history to pin an Indication.');
  }

  const indicationValid = latestLow.price < brokenLow.price;
  if (!indicationValid) return noSetup('No recent Indication break on 4H.');

  const barsSinceTrough = lastIdx - latestLow.index;
  const troughPrice = latestLow.price;
  const swingHighPrice = latestHigh.price;
  const impulseRange = swingHighPrice - troughPrice;

  const retraced = impulseRange > 0
    ? clamp(((last.close - troughPrice) / impulseRange) * 100, 0, 200)
    : 0;

  if (retraced >= 100) {
    return noSetup('Correction broke prior swing high — structure invalidated.');
  }

  const recent = candles.slice(-3);
  const pushingDown =
    recent.length === 3 &&
    recent[2]!.close < recent[1]!.close &&
    recent[1]!.close < recent[0]!.close;

  let phase: ICCPhaseKind;
  let detail: string;
  let entryReady = false;

  if (barsSinceTrough <= 1 && retraced < 20) {
    phase = 'INDICATION';
    detail = `Bearish Indication — price broke below ${fmt(brokenLow.price)} on the last close. Wait for the correction.`;
  } else if (retraced >= 30 && retraced <= 79 && pushingDown) {
    phase = 'CONTINUATION';
    detail = `Correction stalled at ${retraced.toFixed(0)}% and price is rolling back down. Continuation is live.`;
    entryReady = true;
  } else if (retraced >= 10) {
    phase = 'CORRECTION';
    detail = `Pullback underway — ${retraced.toFixed(0)}% into the impulse. Patience.`;
  } else {
    phase = 'INDICATION';
    detail = `Bearish Indication break below ${fmt(brokenLow.price)} — impulse still in progress.`;
  }

  return {
    score: scoreForPhase(phase, 'down'),
    current: phase,
    detail,
    indicationLevel: brokenLow.price,
    correctionDepth: Math.round(retraced),
    entryReady,
  };
}

// ── helpers ────────────────────────────────────────────────────

function noSetup(detail: string): ICCPhaseModule {
  return {
    score: 0,
    current: 'NO_SETUP',
    detail,
    indicationLevel: null,
    correctionDepth: null,
    entryReady: false,
  };
}

function scoreForPhase(phase: ICCPhaseKind, direction: 'up' | 'down'): number {
  const sign = direction === 'up' ? 1 : -1;
  switch (phase) {
    case 'CONTINUATION': return 95 * sign;   // strongest — entry zone
    case 'CORRECTION':   return 60 * sign;   // bias intact, waiting
    case 'INDICATION':   return 75 * sign;   // fresh break — strong signal
    default:             return 0;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function fmt(n: number): string {
  if (n > 1000) return n.toFixed(2);
  if (n > 10)   return n.toFixed(2);
  return n.toFixed(5);
}

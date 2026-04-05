/**
 * Trade Replay Engine — Generates synthetic candle data from trade metadata.
 * Uses a Brownian bridge algorithm: guaranteed to start at entry and end at exit
 * with realistic noise in between, clamped against SL/TP constraints.
 */

import type { Candle } from './chart-simulator-engine';
import { getPipMultiplier } from './chart-simulator-engine';
import type { JournalTrade } from '@/stores/journal';

export interface ReplayData {
  candles: Candle[];
  entryIndex: number;
  exitIndex: number;
  exitPrice: number;
  exitReason: 'sl' | 'tp' | 'manual';
  timeframeLabel: string;
}

// Seeded PRNG (mulberry32) for deterministic replays
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for Gaussian noise
function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
}

export function generateReplayCandles(trade: JournalTrade): ReplayData {
  const rng = mulberry32(trade.deal_ticket);
  const pipMult = getPipMultiplier(trade.symbol);
  const entryPrice = trade.price || 0;

  // Determine exit price
  let exitPrice: number;
  if (trade.pips != null && trade.pips !== 0) {
    exitPrice = trade.direction === 'buy'
      ? entryPrice + trade.pips * pipMult
      : entryPrice - trade.pips * pipMult;
  } else if (trade.profit != null && trade.volume > 0) {
    // Derive from profit
    const pipValue = pipMult < 0.001 ? 10 : pipMult < 0.01 ? 100 : pipMult < 1 ? 1 : 1;
    const pips = trade.profit / (pipValue * trade.volume);
    exitPrice = trade.direction === 'buy' ? entryPrice + pips * pipMult : entryPrice - pips * pipMult;
  } else {
    exitPrice = entryPrice; // Fallback
  }

  // Determine exit reason
  let exitReason: 'sl' | 'tp' | 'manual' = 'manual';
  if (trade.sl && Math.abs(exitPrice - trade.sl) < pipMult * 3) exitReason = 'sl';
  else if (trade.tp && Math.abs(exitPrice - trade.tp) < pipMult * 3) exitReason = 'tp';

  // Determine number of candles and timeframe
  const duration = trade.duration_seconds || 3600;
  let candleInterval: number;
  let timeframeLabel: string;
  if (duration < 1800) { candleInterval = 60; timeframeLabel = 'M1'; }
  else if (duration < 14400) { candleInterval = 300; timeframeLabel = 'M5'; }
  else if (duration < 86400) { candleInterval = 900; timeframeLabel = 'M15'; }
  else { candleInterval = 3600; timeframeLabel = 'H1'; }

  let tradeCandleCount = Math.max(15, Math.min(60, Math.floor(duration / candleInterval)));
  const preEntryCandles = 8;
  const totalCandles = preEntryCandles + tradeCandleCount;

  // Noise scale
  const atr = trade.atr_at_entry || Math.abs(exitPrice - entryPrice) * 0.3 || pipMult * 20;
  const noiseScale = atr * 0.15;

  // Generate price path using Brownian bridge
  const path: number[] = [];

  // Pre-entry candles: drift toward entry
  const preStart = entryPrice + (rng() - 0.5) * atr * 0.5;
  for (let i = 0; i < preEntryCandles; i++) {
    const t = i / preEntryCandles;
    const interpolated = preStart + (entryPrice - preStart) * t;
    path.push(interpolated + gaussianRandom(rng) * noiseScale * 0.5);
  }

  // Trade candles: Brownian bridge from entry to exit
  path.push(entryPrice); // Entry point
  for (let i = 1; i < tradeCandleCount; i++) {
    const t = i / tradeCandleCount;
    const expected = entryPrice + (exitPrice - entryPrice) * t;
    const remaining = 1 - t;
    const noise = gaussianRandom(rng) * noiseScale * Math.sqrt(remaining);
    let value = expected + noise;

    // Clamp against SL/TP to keep visual consistency
    if (trade.sl && exitReason !== 'sl') {
      // Trade didn't hit SL, so price should never breach it
      if (trade.direction === 'buy') value = Math.max(value, trade.sl + pipMult * 2);
      else value = Math.min(value, trade.sl - pipMult * 2);
    }
    if (trade.tp && exitReason !== 'tp') {
      // Trade didn't hit TP, so price should never breach it
      if (trade.direction === 'buy') value = Math.min(value, trade.tp - pipMult * 2);
      else value = Math.max(value, trade.tp + pipMult * 2);
    }

    path.push(value);
  }
  path.push(exitPrice); // Exit point

  // Convert path to candles
  const candles: Candle[] = [];
  const baseTime = (trade.time || Date.now() / 1000) - (preEntryCandles + tradeCandleCount) * candleInterval;

  for (let i = 0; i < path.length; i++) {
    const close = path[i];
    const open = i > 0 ? path[i - 1] : close + gaussianRandom(rng) * noiseScale * 0.3;
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const wickUp = Math.abs(gaussianRandom(rng)) * noiseScale * 0.4;
    const wickDown = Math.abs(gaussianRandom(rng)) * noiseScale * 0.4;

    candles.push({
      t: baseTime + i * candleInterval,
      o: open,
      h: bodyHigh + wickUp,
      l: bodyLow - wickDown,
      c: close,
    });
  }

  return {
    candles,
    entryIndex: preEntryCandles,
    exitIndex: candles.length - 1,
    exitPrice,
    exitReason,
    timeframeLabel,
  };
}

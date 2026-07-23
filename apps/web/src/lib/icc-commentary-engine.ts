/**
 * ICC Commentary Engine — Rule-based market commentary during playback.
 * Reuses pattern detection from ICCPatternScanner.
 */
import type { Candle } from '@/lib/chart-simulator-engine';
import type { Timeframe } from '@/lib/icc-candle-generator';
import { detectPatterns, calculateATR, type DetectedPattern } from '@/components/practice/icc/ICCPatternScanner';

export interface CommentaryMessage {
  id: string;
  text: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'warning' | 'setup';
  timeframe: Timeframe;
}

let msgCounter = 0;

function checkConsecutiveCandles(candles: Candle[], count: number): { direction: 'bullish' | 'bearish'; count: number } | null {
  if (candles.length < count) return null;
  const recent = candles.slice(-count);
  const bullish = recent.every(c => c.c > c.o);
  const bearish = recent.every(c => c.c < c.o);
  if (bullish) return { direction: 'bullish', count };
  if (bearish) return { direction: 'bearish', count };
  return null;
}

function checkATRBreakout(candles: Candle[], period = 14): boolean {
  if (candles.length < period + 1) return false;
  const atr = calculateATR(candles.slice(0, -1), period);
  if (atr === 0) return false;
  const last = candles[candles.length - 1];
  const move = Math.abs(last.c - last.o);
  return move > atr * 2;
}

const TEMPLATES = {
  impulseUp: [
    'Strong bullish impulse on {tf} — could be an indication forming.',
    'Big move up on {tf}. Buyers are in control.',
    'Decisive bullish candles on {tf} — watch for continuation after a pullback.',
  ],
  impulseDown: [
    'Strong bearish impulse on {tf} — potential indication.',
    'Sellers pushing price down on {tf}.',
    'Aggressive bearish candles on {tf} — look for the correction next.',
  ],
  pullback: [
    'Price pulling back on {tf}. Could be a correction forming.',
    'Retracement in progress on {tf}. Be patient — wait for it to complete.',
    'Pullback underway on {tf}. Watch for the 50-61.8% zone.',
  ],
  consolidation: [
    'Market consolidating on {tf}. No clear direction — stay patient.',
    'Tight range on {tf}. Wait for a breakout before marking anything.',
    'Choppy price action on {tf}. Not every moment is tradeable.',
  ],
  atrBreakout: [
    'Large candle on {tf} — over 2x ATR. Something is happening.',
    'Volatility spike on {tf}! Pay attention to the direction.',
  ],
  consecutive: [
    '{count} consecutive {dir} candles on {tf}. Momentum building.',
    '{dir} momentum on {tf} — {count} candles in a row.',
  ],
};

function pickTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

export function generateCommentary(
  candles: Record<Timeframe, Candle[]>,
  visibleCounts: Record<Timeframe, number>,
): CommentaryMessage | null {
  const timeframes: Timeframe[] = ['1H', '15M', '5M'];

  for (const tf of timeframes) {
    const count = visibleCounts[tf];
    if (count < 10) continue;
    const visible = candles[tf].slice(0, count);

    // Check ATR breakout on latest candle
    if (checkATRBreakout(visible)) {
      const last = visible[visible.length - 1];
      const dir = last.c > last.o ? 'bullish' : 'bearish';
      return {
        id: `msg-${++msgCounter}`,
        text: pickTemplate(TEMPLATES.atrBreakout).replace('{tf}', tf),
        type: dir,
        timeframe: tf,
      };
    }

    // Check consecutive candles
    for (const n of [4, 3]) {
      const result = checkConsecutiveCandles(visible, n);
      if (result) {
        return {
          id: `msg-${++msgCounter}`,
          text: pickTemplate(TEMPLATES.consecutive)
            .replace('{tf}', tf)
            .replace('{count}', String(result.count))
            .replace('{dir}', result.direction),
          type: result.direction,
          timeframe: tf,
        };
      }
    }

    // Use pattern scanner
    const patterns = detectPatterns(candles[tf], count, tf);
    if (patterns.length > 0) {
      const top = patterns[0];
      if (top.type === 'impulse_up') {
        return { id: `msg-${++msgCounter}`, text: pickTemplate(TEMPLATES.impulseUp).replace('{tf}', tf), type: 'bullish', timeframe: tf };
      }
      if (top.type === 'impulse_down') {
        return { id: `msg-${++msgCounter}`, text: pickTemplate(TEMPLATES.impulseDown).replace('{tf}', tf), type: 'bearish', timeframe: tf };
      }
      if (top.type.startsWith('pullback')) {
        return { id: `msg-${++msgCounter}`, text: pickTemplate(TEMPLATES.pullback).replace('{tf}', tf), type: 'neutral', timeframe: tf };
      }
      if (top.type === 'consolidation') {
        return { id: `msg-${++msgCounter}`, text: pickTemplate(TEMPLATES.consolidation).replace('{tf}', tf), type: 'warning', timeframe: tf };
      }
    }
  }

  return null;
}

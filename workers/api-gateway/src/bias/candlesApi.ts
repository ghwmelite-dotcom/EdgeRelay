// Candle + overlay feed for the live ICC chart on /bias/:symbol.
//
// The engine already fetches and caches candles for every cron tick; we
// also analyze swings + indication + impulse + retracement levels. Here
// we stitch both into one response so the chart can draw the structure
// exactly as the engine sees it — no divergence between "engine read"
// and "chart annotations".

import type { Env } from '../types.js';
import { ASSETS, loadCandlesForAsset, type BiasInterval } from './fetcher.js';
import { detectSwings } from './swings.js';
import { analyzeMarketState } from './marketState.js';
import { analyzeICCPhase } from './iccPhase.js';
import { analyzeStructure } from './structure.js';
import { analyzeCorrection } from './correction.js';
import { computeTradePlan } from './tradePlan.js';
import type {
  BiasDirection,
  ICCPhaseKind,
  MarketStateKind,
  TradePlan,
} from '@edgerelay/shared';

export interface CandlePoint {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SwingMarker {
  /** Unix seconds of the candle that formed the swing. */
  time: number;
  type: 'high' | 'low';
  price: number;
}

export interface CandlesOverlay {
  symbol: string;
  interval: BiasInterval;
  candles: CandlePoint[];
  state: {
    bias: BiasDirection;
    score: number;
    phase: ICCPhaseKind;
    marketState: MarketStateKind;
    correctionDepth: number | null;
  };
  /** Most recent swings for visual markers. */
  swings: SwingMarker[];
  /** The swing price that was broken to trigger the current indication. */
  indicationLevel: number | null;
  /** Current impulse from low → high (bull) or high → low (bear). */
  impulseRange: { high: number; low: number } | null;
  /** Fib retracement levels of that impulse. */
  retracementLevels: {
    r25: number;
    r38: number;
    r50: number;
    r62: number;
    r79: number;
  } | null;
  /** Reference entry/SL/TP when in Continuation + tradeable; else null. */
  tradePlan: TradePlan | null;
}

export async function loadCandlesOverlay(
  env: Env,
  symbol: string,
  interval: BiasInterval,
): Promise<CandlesOverlay | null> {
  if (!env.TWELVE_DATA_KEY) return null;
  const spec = ASSETS.find((a) => a.key === symbol.toUpperCase());
  if (!spec) return null;

  const { candles } = await loadCandlesForAsset(spec, {
    apiKey: env.TWELVE_DATA_KEY,
    kv: env.BOT_STATE,
    ttlSeconds: 900,
    outputSize: 150,
    interval,
  });

  if (candles.length === 0) return null;

  const swings = detectSwings(candles, 2);
  const marketState = analyzeMarketState(swings);
  const phase       = analyzeICCPhase(candles, swings, marketState.state);
  const structure   = analyzeStructure(candles, swings);
  const correction  = analyzeCorrection(candles, swings, marketState.state, phase);

  const last = candles[candles.length - 1];
  const currentPrice = last?.close ?? 0;

  // Compute tradePlan for Continuation phase regardless of composite
  // confidence thresholds — the chart annotates structurally, not by score.
  const tradeable =
    marketState.tradeable &&
    phase.current !== 'NO_SETUP' &&
    marketState.state !== 'CONSOLIDATION';
  const compositeBias: BiasDirection =
    marketState.state === 'UPTREND' ? 'BULLISH' :
    marketState.state === 'DOWNTREND' ? 'BEARISH' :
    'NEUTRAL';
  const tradePlan = computeTradePlan(
    { marketState, phase, structure, correction, session: { score: 0, active: 'Off-Hours', momentum: 'Indecisive', relevance: 'Low', recentCandleProfile: '' } },
    compositeBias,
    tradeable,
    currentPrice,
  );

  // Keep the last ~20 swing markers; more than that clutters the chart.
  const markers: SwingMarker[] = swings.slice(-20).map((s) => ({
    time: candles[s.index]?.time ?? 0,
    type: s.type,
    price: s.price,
  })).filter((m) => m.time > 0);

  return {
    symbol: spec.key,
    interval,
    candles: candles.map((c) => ({
      time: c.time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })),
    state: {
      bias: compositeBias,
      score: 0, // UI reads bias/score from /v1/bias — avoid duplicating logic here
      phase: phase.current,
      marketState: marketState.state,
      correctionDepth: phase.correctionDepth,
    },
    swings: markers,
    indicationLevel: phase.indicationLevel,
    impulseRange: correction.impulseRange,
    retracementLevels: correction.retracementLevels,
    tradePlan,
  };
}

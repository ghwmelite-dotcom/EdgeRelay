// Composite bias scorer.
//
// Combines the five ICC modules into a single asset-level bias with a
// weighted blend. Bias thresholds are deliberately wide — ICC demands
// clarity, so the NEUTRAL zone is meant to be common.

import type {
  AssetBias,
  BiasDirection,
  ICCBreakdown,
  TradePlan,
} from '@edgerelay/shared';
import type { Candle } from './swings.js';
import { detectSwings } from './swings.js';
import { analyzeMarketState } from './marketState.js';
import { analyzeICCPhase } from './iccPhase.js';
import { analyzeStructure } from './structure.js';
import { analyzeCorrection } from './correction.js';
import { analyzeSession, type AssetCategory } from './session.js';
import { computeTradePlan } from './tradePlan.js';

export interface BreakdownResult {
  icc: ICCBreakdown;
  score: number;
  bias: BiasDirection;
  confidence: number;
  tradeable: boolean;
  tradePlan: TradePlan | null;
}

/** Runs all five ICC modules on a single candle stream and returns a
 *  flat breakdown + composite score/bias. Used for both 4H and 1H streams. */
export function analyzeBreakdown(
  candles: Candle[],
  category: AssetCategory,
  now?: Date,
): BreakdownResult {
  const swings = detectSwings(candles, 2);

  const marketState = analyzeMarketState(swings);
  const phase       = analyzeICCPhase(candles, swings, marketState.state);
  const structure   = analyzeStructure(candles, swings);
  const correction  = analyzeCorrection(candles, swings, marketState.state, phase);
  const session     = analyzeSession(candles, category, marketState.state, now);

  const icc: ICCBreakdown = { marketState, phase, structure, correction, session };

  const rawScore =
    marketState.score * ICC_WEIGHTS.marketState +
    phase.score       * ICC_WEIGHTS.iccPhase +
    structure.score   * ICC_WEIGHTS.swingStructure +
    correction.score  * ICC_WEIGHTS.correctionZone +
    session.score     * ICC_WEIGHTS.sessionMomentum;

  const score = Math.round(clamp(rawScore, -100, 100));
  const bias: BiasDirection = score > 25 ? 'BULLISH' : score < -25 ? 'BEARISH' : 'NEUTRAL';

  const edge = 25;
  const raw = Math.max(0, Math.abs(score) - edge);
  let confidence = Math.round((raw / (100 - edge)) * 100);
  if (!marketState.tradeable) confidence = Math.min(confidence, 25);
  if (phase.current === 'NO_SETUP') confidence = Math.min(confidence, 35);

  const tradeable =
    marketState.tradeable &&
    phase.current !== 'NO_SETUP' &&
    bias !== 'NEUTRAL';

  const last = candles[candles.length - 1];
  const currentPrice = last?.close ?? 0;
  const tradePlan = computeTradePlan(icc, bias, tradeable, currentPrice);

  return { icc, score, bias, confidence, tradeable, tradePlan };
}

export const ICC_WEIGHTS = {
  marketState:     0.30,
  iccPhase:        0.25,
  swingStructure:  0.20,
  correctionZone:  0.15,
  sessionMomentum: 0.10,
} as const;

export interface AnalyzerInput {
  symbol: string;
  label: string;
  category: AssetCategory;
  candles: Candle[];
  now?: Date;
}

export function analyzeAsset(input: AnalyzerInput): AssetBias {
  const { symbol, label, category, candles } = input;
  const result = analyzeBreakdown(candles, category, input.now);

  const last = candles[candles.length - 1];
  const first = candles[Math.max(0, candles.length - 7)]; // ~24h ago on 4H
  const change24h = last && first && first.close > 0
    ? ((last.close - first.close) / first.close) * 100
    : 0;

  const sparkData = candles.slice(-30).map((c) => c.close);

  return {
    symbol,
    label,
    category,
    price: last?.close ?? 0,
    change24h: Math.round(change24h * 100) / 100,
    bias: result.bias,
    score: result.score,
    confidence: result.confidence,
    tradeable: result.tradeable,
    icc: result.icc,
    sparkData,
    tradePlan: result.tradePlan ?? undefined,
  };
}

/** Combines a 4H and a 1H analysis into a single AssetBias with confluence
 *  metadata. When both timeframes agree on direction AND both are tradeable,
 *  `confluence.aligned` is true — the A+ setup flag. */
export function analyzeAssetMultiTF(
  input: AnalyzerInput,
  candles1H: Candle[],
): AssetBias {
  const base = analyzeAsset(input);
  const result1H = analyzeBreakdown(candles1H, input.category, input.now);

  const aligned =
    base.tradeable &&
    result1H.tradeable &&
    base.bias === result1H.bias;

  const reason = aligned
    ? `4H and 1H both ${base.bias.toLowerCase()} with tradeable setups — full confluence.`
    : !base.tradeable
      ? '4H has no active setup — 1H confluence not applicable.'
      : !result1H.tradeable
        ? '4H bias in play but 1H is not tradeable yet.'
        : `Conflicting bias across timeframes (4H ${base.bias}, 1H ${result1H.bias}).`;

  return {
    ...base,
    icc1H:   result1H.icc,
    bias1H:  result1H.bias,
    score1H: result1H.score,
    tradePlan1H: result1H.tradePlan ?? undefined,
    confluence: { aligned, direction: aligned ? base.bias : 'NEUTRAL', reason },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

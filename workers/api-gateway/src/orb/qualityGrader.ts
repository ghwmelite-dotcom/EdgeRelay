// ORB quality grader — same 4-tier shape as ICC so the UI can share
// visual treatment. 8 criteria; A+ requires the strongest three; A needs
// 6+; B needs 4+; C otherwise.

import type {
  OrbQuality,
  OrbQualityResult,
  OrbCriterion,
  OrbRange,
  OrbSession,
} from '@edgerelay/shared';
import type { Candle } from '../bias/swings.js';
import type { AssetSpec } from '../bias/fetcher.js';
import { sessionRelevanceFor } from './sessionWindow.js';

interface QualityInputs {
  asset: AssetSpec;
  session: OrbSession;
  range: OrbRange;
  breakCandle: Candle;
  priorCandles: Candle[];   // candles before the break, for momentum context
  direction: 'long' | 'short';
}

export function computeOrbQuality(inp: QualityInputs): OrbQualityResult {
  const { asset, session, range, breakCandle, priorCandles, direction } = inp;
  const rangeSize = range.high - range.low;

  // Body / range ratio of the break candle — strong directional bodies
  // signal real flow, wicky candles often fail.
  const bodyPct = rangeSize > 0
    ? Math.abs(breakCandle.close - breakCandle.open) / Math.max(breakCandle.high - breakCandle.low, 1e-9)
    : 0;

  // Close location within the break candle (for long: 1 = close at high,
  // 0 = close at low). Close-near-extreme = continuation likely.
  const range2 = breakCandle.high - breakCandle.low;
  const closeLocation = range2 > 0
    ? direction === 'long'
      ? (breakCandle.close - breakCandle.low) / range2
      : (breakCandle.high - breakCandle.close) / range2
    : 0.5;

  // Recent momentum: last 4 M15 candles should not have been reversing.
  const recent = priorCandles.slice(-4);
  const recentReversal = (() => {
    if (recent.length < 2) return false;
    const first = recent[0]!;
    const last = recent[recent.length - 1]!;
    return direction === 'long' ? last.close < first.close : last.close > first.close;
  })();

  // Range-size sanity: too tight (inside ATR noise) or too wide (news
  // spike) both lower quality.
  const atrRatio = range.atr > 0 ? rangeSize / range.atr : 0;
  const healthyRange = atrRatio >= 0.8 && atrRatio <= 3.5;

  const relevance = sessionRelevanceFor(asset, session);

  const criteria: OrbCriterion[] = [
    { key: 'session_relevance',
      label: `Session (${session === 'london' ? 'London' : 'New York'}) suits this asset`,
      met: relevance === 'high' },
    { key: 'session_medium_or_high',
      label: 'Session is at least medium relevance',
      met: relevance !== 'low' },
    { key: 'strong_body',
      label: 'Break candle body ≥ 60% of its range',
      met: bodyPct >= 0.6 },
    { key: 'close_near_extreme',
      label: 'Break closed in top/bottom 25% of the candle',
      met: closeLocation >= 0.75 },
    { key: 'no_recent_reversal',
      label: 'Last 4 candles aligned with break direction',
      met: !recentReversal },
    { key: 'healthy_range_size',
      label: 'Range size is 0.8–3.5× ATR (not too tight / wild)',
      met: healthyRange },
    { key: 'range_above_min',
      label: 'Range ≥ 0.1% of price (above noise floor)',
      met: range.rangePct >= 0.1 },
    { key: 'range_below_max',
      label: 'Range ≤ 2% of price (not a news-spike range)',
      met: range.rangePct <= 2.0 },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const totalCount = criteria.length;

  // Tier rules:
  //   A+ requires the three strongest simultaneously: high relevance +
  //      strong body + close-near-extreme
  //   A  = 6+ of 8
  //   B  = 4+ of 8
  //   C  = otherwise
  const highRelevance = criteria[0]!.met;
  const strongBody    = criteria[2]!.met;
  const closeExtreme  = criteria[3]!.met;

  let quality: OrbQuality;
  if (highRelevance && strongBody && closeExtreme) quality = 'A_PLUS';
  else if (metCount >= 6) quality = 'A';
  else if (metCount >= 4) quality = 'B';
  else quality = 'C';

  let headlineWarning: string | null = null;
  if (quality !== 'A_PLUS') {
    const missed: string[] = [];
    if (!highRelevance) missed.push(`off-peak session for ${asset.key}`);
    if (!strongBody) missed.push('weak body (possible fakeout)');
    if (!closeExtreme) missed.push('close not near extreme');
    if (!criteria[5]!.met) missed.push('range size unusual');
    if (missed.length > 0) headlineWarning = missed.slice(0, 2).join(' · ');
  }

  return { quality, metCount, totalCount, criteria, headlineWarning };
}

// Module E — Session & Momentum (weight 10%).
//
// ICC respects that strong Indications occur during active sessions. The
// module blends "is the active session appropriate for this asset?" with
// "are the last few candles showing real momentum?" into a small tilt on
// the composite score.

import type {
  SessionModule,
  SessionKind,
  MomentumKind,
  MarketStateKind,
} from '@edgerelay/shared';
import type { Candle } from './swings.js';

export type AssetCategory = 'Metal' | 'Index' | 'Forex';

export function analyzeSession(
  candles: Candle[],
  category: AssetCategory,
  marketState: MarketStateKind,
  now: Date = new Date(),
): SessionModule {
  const hourUTC = now.getUTCHours();
  const active = classifySession(hourUTC);

  const relevance = sessionRelevance(active, category);

  const { momentum, profile } = assessMomentum(candles);

  // Score: small lift/penalty in the trend direction based on confluence
  let score = 0;
  const trendSign = marketState === 'UPTREND' ? 1 : marketState === 'DOWNTREND' ? -1 : 0;
  if (trendSign !== 0) {
    const momentumFactor =
      momentum === 'Strong' ? 30 :
      momentum === 'Moderate' ? 15 :
      momentum === 'Weak' ? 5 :
      0;
    const sessionFactor =
      relevance === 'High' ? 1.2 :
      relevance === 'Medium' ? 1.0 :
      0.5;
    score = Math.round(momentumFactor * sessionFactor) * trendSign;
  }

  return {
    score,
    active,
    momentum,
    relevance,
    recentCandleProfile: profile,
  };
}

// ── helpers ────────────────────────────────────────────────────

function classifySession(hourUTC: number): SessionKind {
  // London: 08–16 UTC, NY: 13–21 UTC, Asian: 00–08 UTC, Off-hours: 21–24.
  if (hourUTC >= 13 && hourUTC < 16) return 'London-NY Overlap';
  if (hourUTC >= 8  && hourUTC < 13) return 'London';
  if (hourUTC >= 16 && hourUTC < 21) return 'New York';
  if (hourUTC >= 0  && hourUTC < 8)  return 'Asian';
  return 'Off-Hours';
}

function sessionRelevance(session: SessionKind, category: AssetCategory): 'High' | 'Medium' | 'Low' {
  if (session === 'London-NY Overlap') return 'High';
  if (category === 'Forex') {
    if (session === 'London' || session === 'New York') return 'High';
    if (session === 'Asian') return 'Medium';
    return 'Low';
  }
  if (category === 'Index') {
    if (session === 'New York') return 'High';
    if (session === 'London') return 'Medium';
    return 'Low';
  }
  // Metal (XAUUSD) responds to both London and NY
  if (session === 'London' || session === 'New York') return 'High';
  if (session === 'Asian') return 'Medium';
  return 'Low';
}

function assessMomentum(candles: Candle[]): { momentum: MomentumKind; profile: string } {
  const n = 5;
  const recent = candles.slice(-n);
  if (recent.length === 0) return { momentum: 'Indecisive', profile: 'No recent candle data.' };

  let bullishBodies = 0;
  let bearishBodies = 0;
  let totalRange = 0;
  let totalBody = 0;

  for (const c of recent) {
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    totalBody += body;
    totalRange += range || 1e-9;
    if (c.close > c.open && body > range * 0.5) bullishBodies++;
    if (c.close < c.open && body > range * 0.5) bearishBodies++;
  }

  const bodyRatio = totalRange > 0 ? totalBody / totalRange : 0;
  const directional = Math.max(bullishBodies, bearishBodies);

  let momentum: MomentumKind;
  if (directional >= 3 && bodyRatio > 0.6) momentum = 'Strong';
  else if (directional >= 2 && bodyRatio > 0.4) momentum = 'Moderate';
  else if (bodyRatio > 0.3) momentum = 'Weak';
  else momentum = 'Indecisive';

  const side = bullishBodies >= bearishBodies ? 'bullish' : 'bearish';
  const profile = `${directional} of last ${recent.length} candles show ${side} bodies (avg body ${(bodyRatio * 100).toFixed(0)}% of range).`;
  return { momentum, profile };
}

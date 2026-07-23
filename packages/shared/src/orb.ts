// ── ORB (Opening Range Breakout) shared types ────────────────────
//
// ORB is a companion strategy to ICC. ICC reads structural pullbacks in
// trends; ORB captures volatility expansions at session opens. The two
// together cover both trending pullback conditions and breakout
// conditions — most well-documented swing/day-trade setups fall into one
// bucket or the other.
//
// The sessions we track are UTC-anchored:
//   - London: 07:00 UTC, range formed by 07:30 UTC, valid until 12:00 UTC
//   - NY:     13:30 UTC, range formed by 14:00 UTC, valid until 20:00 UTC

export type OrbSession = 'london' | 'newyork';

export type OrbOutcome = 'tp1' | 'tp2' | 'sl' | 'timeout' | 'open';

export type OrbQuality = 'A_PLUS' | 'A' | 'B' | 'C';

export interface OrbCriterion {
  key: string;
  label: string;
  met: boolean;
}

export interface OrbQualityResult {
  quality: OrbQuality;
  metCount: number;
  totalCount: number;
  criteria: OrbCriterion[];
  headlineWarning: string | null;
}

export interface OrbRange {
  high: number;
  low: number;
  formedAtUnix: number;
  atr: number;          // 14-M15 ATR captured at range formation
  rangePct: number;     // (high - low) / low · 100
}

export interface OrbTradePlan {
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit1: number;   // 1× range size
  takeProfit2: number;   // 2× range size
  slDistancePct: number;
  tp1DistancePct: number;
  tp2DistancePct: number;
  rationaleSl: string;
}

export interface OrbSignal {
  id: string;
  symbol: string;
  session: OrbSession;
  date: string;                 // UTC 'YYYY-MM-DD'
  range: OrbRange;
  signalType: 'long' | 'short' | null;
  signalPrice: number | null;
  signalAtUnix: number | null;
  tradePlan: OrbTradePlan | null;
  quality: OrbQuality | null;
  metCount: number;
  totalCount: number;
  criteria: OrbCriterion[];
  outcome: OrbOutcome;
  outcomePrice: number | null;
  outcomeAtUnix: number | null;
  rMultiple: number | null;
}

/** Live per-asset ORB state returned by /v1/orb/:symbol. */
export interface OrbAssetState {
  symbol: string;
  label: string;
  category: 'Metal' | 'Index' | 'Forex';
  activeSession: OrbSession | null;
  todayLondon: OrbSignal | null;
  todayNewyork: OrbSignal | null;
  recent: OrbSignal[];          // last 7 days across both sessions
}

/** Candles + range overlay for the chart. */
export interface OrbCandlesPayload {
  symbol: string;
  interval: '15min';
  candles: Array<{ time: number; open: number; high: number; low: number; close: number }>;
  today: {
    london: OrbSignal | null;
    newyork: OrbSignal | null;
  };
}

/** Aggregate engine-wide ORB state served at /v1/orb. */
export interface OrbResponse {
  timestamp: string;
  timeframe: '15min';
  engine: 'orb-v1';
  assets: OrbAssetState[];
  summary: {
    totalSignalsToday: number;
    longsToday: number;
    shortsToday: number;
    aPlusToday: number;
  };
}

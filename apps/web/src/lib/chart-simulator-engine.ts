/**
 * Chart Simulator Engine — Pure TypeScript simulation logic.
 * No React, no side effects. All functions are pure.
 */

export interface Candle {
  t: number; // unix timestamp seconds
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
}

export interface Position {
  id: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  lotSize: number;
  sl: number;
  tp: number;
  entryIndex: number; // candle index where opened
  unrealizedPnl: number;
}

export interface ClosedTrade {
  id: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  sl: number;
  tp: number;
  pnl: number; // in dollars
  pips: number;
  exitReason: 'sl' | 'tp' | 'manual';
  entryIndex: number;
  exitIndex: number;
}

export interface SessionStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
}

export interface Scenario {
  id: string;
  name: string;
  instrument: string;
  timeframe: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredLevel: number;
  pipValue: number; // $ per pip per lot
  candles: Candle[];
  accentColor: string;
}

export interface SimulatorState {
  scenario: Scenario | null;
  visibleCount: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  isPlaying: boolean;
  playbackSpeed: number;
  balance: number;
  startingBalance: number;
}

// ── Position Management ──────────────────────────────────

let posCounter = 0;

export function openPosition(
  direction: 'buy' | 'sell',
  entryPrice: number,
  lotSize: number,
  slPips: number,
  tpPips: number,
  entryIndex: number,
  pipMultiplier: number = 0.0001,
): Position {
  const sl = direction === 'buy'
    ? entryPrice - slPips * pipMultiplier
    : entryPrice + slPips * pipMultiplier;
  const tp = direction === 'buy'
    ? entryPrice + tpPips * pipMultiplier
    : entryPrice - tpPips * pipMultiplier;

  return {
    id: `pos-${++posCounter}-${Date.now()}`,
    direction,
    entryPrice,
    lotSize,
    sl,
    tp,
    entryIndex,
    unrealizedPnl: 0,
  };
}

export function calculatePnl(
  position: Position,
  currentPrice: number,
  pipValue: number,
  pipMultiplier: number = 0.0001,
): number {
  const priceDiff = position.direction === 'buy'
    ? currentPrice - position.entryPrice
    : position.entryPrice - currentPrice;
  const pips = priceDiff / pipMultiplier;
  return pips * pipValue * position.lotSize;
}

export function calculatePips(
  direction: 'buy' | 'sell',
  entryPrice: number,
  exitPrice: number,
  pipMultiplier: number = 0.0001,
): number {
  const diff = direction === 'buy' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return diff / pipMultiplier;
}

// ── SL/TP Hit Detection ──────────────────────────────────

export function checkSlTp(position: Position, candle: Candle): 'sl' | 'tp' | null {
  if (position.direction === 'buy') {
    // Check SL first (conservative)
    if (candle.l <= position.sl) return 'sl';
    if (candle.h >= position.tp) return 'tp';
  } else {
    // Sell position
    if (candle.h >= position.sl) return 'sl';
    if (candle.l <= position.tp) return 'tp';
  }
  return null;
}

export function closePosition(
  position: Position,
  exitPrice: number,
  exitReason: 'sl' | 'tp' | 'manual',
  exitIndex: number,
  pipValue: number,
  pipMultiplier: number = 0.0001,
): ClosedTrade {
  const pips = calculatePips(position.direction, position.entryPrice, exitPrice, pipMultiplier);
  const pnl = pips * pipValue * position.lotSize;

  return {
    id: position.id,
    direction: position.direction,
    entryPrice: position.entryPrice,
    exitPrice,
    lotSize: position.lotSize,
    sl: position.sl,
    tp: position.tp,
    pnl,
    pips,
    exitReason,
    entryIndex: position.entryIndex,
    exitIndex,
  };
}

// ── Advance Candle (Master Function) ─────────────────────

export function advanceCandle(
  positions: Position[],
  closedTrades: ClosedTrade[],
  newCandle: Candle,
  candleIndex: number,
  pipValue: number,
  pipMultiplier: number = 0.0001,
): { positions: Position[]; closedTrades: ClosedTrade[]; newClosures: ClosedTrade[] } {
  const remaining: Position[] = [];
  const newClosures: ClosedTrade[] = [];

  for (const pos of positions) {
    const hit = checkSlTp(pos, newCandle);
    if (hit) {
      const exitPrice = hit === 'sl' ? pos.sl : pos.tp;
      const trade = closePosition(pos, exitPrice, hit, candleIndex, pipValue, pipMultiplier);
      newClosures.push(trade);
    } else {
      // Update unrealized P&L
      remaining.push({
        ...pos,
        unrealizedPnl: calculatePnl(pos, newCandle.c, pipValue, pipMultiplier),
      });
    }
  }

  return {
    positions: remaining,
    closedTrades: [...closedTrades, ...newClosures],
    newClosures,
  };
}

// ── Session Stats ────────────────────────────────────────

export function calculateSessionStats(closedTrades: ClosedTrade[]): SessionStats {
  if (closedTrades.length === 0) {
    return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgRR: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0 };
  }

  const wins = closedTrades.filter(t => t.pnl > 0).length;
  const losses = closedTrades.filter(t => t.pnl <= 0).length;
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);

  // Average R:R (only for trades with both SL and TP data)
  const rrValues = closedTrades
    .filter(t => t.exitReason !== 'manual')
    .map(t => Math.abs(t.pips) / Math.abs(calculatePips(t.direction, t.entryPrice, t.sl)));
  const avgRR = rrValues.length > 0 ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  // Max drawdown (running P&L curve)
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  for (const t of closedTrades) {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    totalTrades: closedTrades.length,
    wins,
    losses,
    winRate: Math.round((wins / closedTrades.length) * 100),
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    bestTrade: Math.max(...closedTrades.map(t => t.pnl)),
    worstTrade: Math.min(...closedTrades.map(t => t.pnl)),
  };
}

// ── Pip Multiplier Helper ────────────────────────────────

export function getPipMultiplier(instrument: string): number {
  const upper = instrument.toUpperCase();
  if (upper.includes('JPY')) return 0.01;
  if (upper.includes('XAU') || upper.includes('GOLD')) return 0.1;
  if (upper.includes('NAS') || upper.includes('US30') || upper.includes('SPX')) return 1.0;
  if (upper.includes('OIL') || upper.includes('WTI') || upper.includes('BRENT')) return 0.01;
  return 0.0001; // Standard forex
}

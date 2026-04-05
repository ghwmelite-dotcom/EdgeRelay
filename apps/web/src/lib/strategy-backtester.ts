/**
 * Client-side Strategy Backtester
 * Runs a simplified signal logic against candle data and produces
 * backtest results (equity curve, win rate, profit factor, drawdown).
 */

import type { Candle } from './chart-simulator-engine';
import { getPipMultiplier } from './chart-simulator-engine';

export interface BacktestParams {
  instrument: string;
  indicators: string[];
  lotSize: number;
  slPips: number;
  tpPips: number;
  maxDailyLoss: number;
  useSession: boolean;
  sessionStart: number;
  sessionEnd: number;
}

export interface BacktestTrade {
  entryIndex: number;
  exitIndex: number;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pips: number;
  exitReason: 'sl' | 'tp';
}

export interface BacktestResult {
  trades: BacktestTrade[];
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  equityCurve: number[];
  avgWin: number;
  avgLoss: number;
  avgRR: number;
}

// ── Simple indicator calculations ────────────────────────

function sma(data: number[], period: number, index: number): number | null {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) sum += data[i];
  return sum / period;
}

function ema(data: number[], period: number, index: number, prev: number | null): number {
  const k = 2 / (period + 1);
  if (prev === null || index < period - 1) return sma(data, period, index) || data[index];
  return data[index] * k + prev * (1 - k);
}

function rsi(closes: number[], period: number, index: number): number | null {
  if (index < period) return null;
  let gains = 0, losses = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

// ── Signal Generator (rule-based from indicator selection) ──

function generateSignal(
  candles: Candle[],
  index: number,
  indicators: string[],
  closes: number[],
  emaFastPrev: { v: number | null },
  emaSlowPrev: { v: number | null },
): 'buy' | 'sell' | null {
  if (index < 30) return null; // Need history for indicators

  const hasMA = indicators.some(i => i.toLowerCase().includes('moving') || i.toLowerCase().includes('ma'));
  const hasRSI = indicators.some(i => i.toLowerCase().includes('rsi'));
  const hasBB = indicators.some(i => i.toLowerCase().includes('bollinger') || i.toLowerCase().includes('bands'));
  const hasMACD = indicators.some(i => i.toLowerCase().includes('macd'));
  const hasStoch = indicators.some(i => i.toLowerCase().includes('stoch'));

  let buyScore = 0;
  let sellScore = 0;
  let signals = 0;

  // MA Crossover
  if (hasMA) {
    const fastNow = ema(closes, 9, index, emaFastPrev.v);
    const slowNow = ema(closes, 21, index, emaSlowPrev.v);
    const fastPrev = emaFastPrev.v || fastNow;
    const slowPrev = emaSlowPrev.v || slowNow;
    emaFastPrev.v = fastNow;
    emaSlowPrev.v = slowNow;

    if (fastPrev <= slowPrev && fastNow > slowNow) buyScore += 2;
    if (fastPrev >= slowPrev && fastNow < slowNow) sellScore += 2;
    if (fastNow > slowNow) buyScore += 1;
    if (fastNow < slowNow) sellScore += 1;
    signals++;
  }

  // RSI
  if (hasRSI) {
    const r = rsi(closes, 14, index);
    if (r !== null) {
      if (r < 30) buyScore += 2;
      if (r > 70) sellScore += 2;
      if (r < 45) buyScore += 1;
      if (r > 55) sellScore += 1;
    }
    signals++;
  }

  // Bollinger Bands (simplified — use SMA ± 2 stddev)
  if (hasBB) {
    const period = 20;
    const mid = sma(closes, period, index);
    if (mid !== null) {
      let sumSq = 0;
      for (let i = index - period + 1; i <= index; i++) sumSq += Math.pow(closes[i] - mid, 2);
      const stddev = Math.sqrt(sumSq / period);
      const upper = mid + 2 * stddev;
      const lower = mid - 2 * stddev;
      if (closes[index] <= lower) buyScore += 2;
      if (closes[index] >= upper) sellScore += 2;
    }
    signals++;
  }

  // MACD (simplified)
  if (hasMACD) {
    const ema12 = sma(closes, 12, index);
    const ema26 = sma(closes, 26, index);
    if (ema12 !== null && ema26 !== null) {
      const macdLine = ema12 - ema26;
      const prevEma12 = sma(closes, 12, index - 1);
      const prevEma26 = sma(closes, 26, index - 1);
      const prevMacd = prevEma12 && prevEma26 ? prevEma12 - prevEma26 : 0;
      if (prevMacd <= 0 && macdLine > 0) buyScore += 2;
      if (prevMacd >= 0 && macdLine < 0) sellScore += 2;
    }
    signals++;
  }

  // Stochastic (simplified)
  if (hasStoch) {
    const period = 14;
    if (index >= period) {
      let highest = -Infinity, lowest = Infinity;
      for (let i = index - period + 1; i <= index; i++) {
        if (candles[i].h > highest) highest = candles[i].h;
        if (candles[i].l < lowest) lowest = candles[i].l;
      }
      const k = highest !== lowest ? ((closes[index] - lowest) / (highest - lowest)) * 100 : 50;
      if (k < 20) buyScore += 2;
      if (k > 80) sellScore += 2;
    }
    signals++;
  }

  // Fallback: if no indicators selected, use simple trend
  if (signals === 0) {
    const trend = closes[index] - closes[Math.max(0, index - 20)];
    if (trend > 0) buyScore += 1;
    else sellScore += 1;
    signals = 1;
  }

  const threshold = Math.max(2, signals);
  if (buyScore >= threshold && buyScore > sellScore) return 'buy';
  if (sellScore >= threshold && sellScore > buyScore) return 'sell';
  return null;
}

// ── Main Backtest Runner ─────────────────────────────────

export function runBacktest(candles: Candle[], params: BacktestParams): BacktestResult {
  const pipMult = getPipMultiplier(params.instrument);
  const pipValue = pipMult < 0.001 ? 10 : pipMult < 0.01 ? 100 : 1;
  const closes = candles.map(c => c.c);
  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = [10000];
  let balance = 10000;
  let inPosition = false;
  let posDir: 'buy' | 'sell' = 'buy';
  let posEntry = 0;
  let posEntryIdx = 0;
  let posSl = 0;
  let posTp = 0;

  const emaFastPrev = { v: null as number | null };
  const emaSlowPrev = { v: null as number | null };

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    // Check SL/TP for open position
    if (inPosition) {
      let hit: 'sl' | 'tp' | null = null;
      let exitPrice = 0;

      if (posDir === 'buy') {
        if (candle.l <= posSl) { hit = 'sl'; exitPrice = posSl; }
        else if (candle.h >= posTp) { hit = 'tp'; exitPrice = posTp; }
      } else {
        if (candle.h >= posSl) { hit = 'sl'; exitPrice = posSl; }
        else if (candle.l <= posTp) { hit = 'tp'; exitPrice = posTp; }
      }

      if (hit) {
        const pips = posDir === 'buy' ? (exitPrice - posEntry) / pipMult : (posEntry - exitPrice) / pipMult;
        const pnl = pips * pipValue * params.lotSize;
        balance += pnl;
        trades.push({ entryIndex: posEntryIdx, exitIndex: i, direction: posDir, entryPrice: posEntry, exitPrice, pnl, pips, exitReason: hit });
        inPosition = false;
      }
    }

    // Generate signal if not in position
    if (!inPosition) {
      const signal = generateSignal(candles, i, params.indicators, closes, emaFastPrev, emaSlowPrev);
      if (signal) {
        posDir = signal;
        posEntry = candle.c;
        posEntryIdx = i;
        posSl = signal === 'buy' ? posEntry - params.slPips * pipMult : posEntry + params.slPips * pipMult;
        posTp = signal === 'buy' ? posEntry + params.tpPips * pipMult : posEntry - params.tpPips * pipMult;
        inPosition = true;
      }
    }

    equityCurve.push(balance);
  }

  // Calculate stats
  const wins = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl <= 0).length;
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  // Max drawdown
  let peak = 10000, maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe (simplified)
  const returns = trades.map(t => t.pnl);
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const stdReturn = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 1;
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  return {
    trades,
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
    totalPnl: Math.round(balance - 10000),
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDD),
    maxDrawdownPct: Math.round((maxDD / 10000) * 10000) / 100,
    sharpeRatio: Math.round(sharpe * 100) / 100,
    equityCurve,
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    avgRR: Math.round(avgRR * 100) / 100,
  };
}

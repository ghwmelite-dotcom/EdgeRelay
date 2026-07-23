// Backtest simulator over bias_history.
//
// Walks 4H snapshots for a symbol, takes a simulated trade whenever the
// configured entry_trigger fires, exits at either SL / TP / time_stop,
// returns full equity curve + summary stats.
//
// Philosophy: the numbers here come directly from the engine's real-time
// track record. There is no parameter optimisation, no look-ahead, no
// re-running the analyzer — just: "if you'd executed on every call, here's
// what would have happened to your equity". The rawness is the point.

import type { Env } from '../types.js';
import type { BiasDirection } from '@edgerelay/shared';

export type EntryTrigger = 'continuation' | 'indication' | 'a_plus' | 'any_tradeable';

export interface BacktestParams {
  symbol: string;
  startingBalance: number;      // e.g. 10_000
  riskPercent: number;          // 0.5, 1, 2 — risked per trade
  stopLossPercent: number;      // e.g. 1.0 = 1% below/above entry price
  takeProfitR: number;          // e.g. 2 = 2R target (TP = 2× SL distance)
  timeStopHours: number;        // e.g. 48 — close if neither SL nor TP hit
  entryTrigger: EntryTrigger;
  maxConcurrentTrades?: number; // default 1 — no pyramiding by default
}

export interface SimTrade {
  openedAt: string;
  closedAt: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitReason: 'tp' | 'sl' | 'time';
  rMultiple: number;            // +2 means +2R (3× TP-R), -1 means stopped out
  pnl: number;                  // currency
  balance: number;              // after this trade
  score: number;                // the bias score at entry
}

export interface BacktestResult {
  params: BacktestParams;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
  expectancy: number;           // avg $ per trade
  maxDrawdownPercent: number;
  sharpe: number | null;        // on per-trade returns
  endingBalance: number;
  totalReturnPercent: number;
  equityCurve: Array<{ t: string; balance: number }>;
  trades: SimTrade[];
  /** True once there's enough data; UIs should show "building dataset". */
  meaningful: boolean;
  warning?: string;
}

interface HistoryRow {
  captured_unix: number;
  captured_at: string;
  price: number;
  bias: BiasDirection;
  score: number;
  phase: string;
  tradeable: number;
  snapshot_json: string;
}

export async function runBacktest(env: Env, params: BacktestParams): Promise<BacktestResult> {
  const symbol = params.symbol.toUpperCase();
  const { results } = await env.DB.prepare(
    `SELECT captured_unix, captured_at, price, bias, score, phase, tradeable, snapshot_json
     FROM bias_history
     WHERE symbol = ? AND interval = '4h'
     ORDER BY captured_unix ASC`,
  ).bind(symbol).all<HistoryRow>();

  const rows = results ?? [];
  if (rows.length < 10) {
    return emptyResult(params, 'Not enough history yet — the engine needs more data. Check back in 24-48 hours.');
  }

  const entryRows = selectEntryRows(rows, params.entryTrigger);

  let balance = params.startingBalance;
  let peak = balance;
  let maxDD = 0;
  const trades: SimTrade[] = [];
  const equityCurve: Array<{ t: string; balance: number }> = [
    { t: rows[0]!.captured_at, balance },
  ];

  // maxConcurrent=1 means: skip any entry whose opened_unix is earlier than
  // the previous trade's exit_unix — we can't hold two at once. Default 1.
  const maxConcurrent = params.maxConcurrentTrades ?? 1;
  let lastExitUnix = 0;

  for (const entry of entryRows) {
    if (maxConcurrent === 1 && entry.captured_unix < lastExitUnix) continue;
    const direction: 'long' | 'short' = entry.bias === 'BULLISH' ? 'long' : 'short';

    const sl = direction === 'long'
      ? entry.price * (1 - params.stopLossPercent / 100)
      : entry.price * (1 + params.stopLossPercent / 100);
    const slDistance = Math.abs(entry.price - sl);
    const tp = direction === 'long'
      ? entry.price + slDistance * params.takeProfitR
      : entry.price - slDistance * params.takeProfitR;

    const riskAmount = balance * (params.riskPercent / 100);
    // "Contract size" is riskAmount / slDistance — simulated as $-per-move
    const perPoint = slDistance > 0 ? riskAmount / slDistance : 0;

    // Walk forward rows looking for SL, TP, or time stop
    const exitCutoff = entry.captured_unix + params.timeStopHours * 3600;
    const futures = rows.filter((r) => r.captured_unix > entry.captured_unix && r.captured_unix <= exitCutoff);

    let exit: HistoryRow | null = null;
    let exitReason: SimTrade['exitReason'] = 'time';
    let exitPrice = entry.price;

    for (const f of futures) {
      if (direction === 'long') {
        if (f.price <= sl) { exit = f; exitReason = 'sl'; exitPrice = sl; break; }
        if (f.price >= tp) { exit = f; exitReason = 'tp'; exitPrice = tp; break; }
      } else {
        if (f.price >= sl) { exit = f; exitReason = 'sl'; exitPrice = sl; break; }
        if (f.price <= tp) { exit = f; exitReason = 'tp'; exitPrice = tp; break; }
      }
    }

    if (!exit) {
      // Time stop — use the last available price in the window
      const last = futures[futures.length - 1];
      if (!last) continue; // not enough future rows yet
      exit = last;
      exitReason = 'time';
      exitPrice = last.price;
    }

    // P&L in currency
    const pnl = direction === 'long'
      ? (exitPrice - entry.price) * perPoint
      : (entry.price - exitPrice) * perPoint;
    const rMultiple = slDistance > 0 ? pnl / riskAmount : 0;

    balance += pnl;
    peak = Math.max(peak, balance);
    const ddPct = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    if (ddPct > maxDD) maxDD = ddPct;
    lastExitUnix = exit.captured_unix;

    trades.push({
      openedAt: entry.captured_at,
      closedAt: exit.captured_at,
      direction,
      entryPrice: entry.price,
      exitPrice,
      stopLoss: sl,
      takeProfit: tp,
      exitReason,
      rMultiple: Math.round(rMultiple * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      score: entry.score,
    });
    equityCurve.push({ t: exit.captured_at, balance: Math.round(balance * 100) / 100 });
  }

  const wins = trades.filter((t) => t.rMultiple > 0).length;
  const losses = trades.filter((t) => t.rMultiple <= 0).length;
  const avgR = trades.length > 0 ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length : 0;
  const expectancy = trades.length > 0 ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0;
  const rs = trades.map((t) => t.rMultiple);
  const sharpe = rs.length > 1 ? computeSharpe(rs) : null;

  const result: BacktestResult = {
    params,
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? Math.round((wins / trades.length) * 1000) / 10 : 0,
    avgR: Math.round(avgR * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    maxDrawdownPercent: Math.round(maxDD * 100) / 100,
    sharpe,
    endingBalance: Math.round(balance * 100) / 100,
    totalReturnPercent: Math.round(((balance - params.startingBalance) / params.startingBalance) * 10000) / 100,
    equityCurve,
    trades,
    meaningful: trades.length >= 10,
  };

  if (!result.meaningful) {
    result.warning = `Only ${trades.length} trade${trades.length === 1 ? '' : 's'} simulated — these results are not statistically meaningful yet. Give the engine a few more days of data.`;
  }

  return result;
}

// ── entry selection ──────────────────────────────────────────

function selectEntryRows(rows: HistoryRow[], trigger: EntryTrigger): HistoryRow[] {
  // We want to take the entry only on the FIRST row where the trigger fires
  // (don't re-enter while we're still in the same setup).
  const out: HistoryRow[] = [];
  let lastPhase = '';
  for (const r of rows) {
    const matches = entryMatches(r, trigger);
    const phase = r.phase;
    if (matches && phase !== lastPhase) {
      out.push(r);
    }
    lastPhase = phase;
  }
  return out;
}

function entryMatches(row: HistoryRow, trigger: EntryTrigger): boolean {
  if (row.bias === 'NEUTRAL') return false;

  switch (trigger) {
    case 'any_tradeable':
      return row.tradeable === 1;
    case 'continuation':
      return row.phase === 'CONTINUATION' && row.tradeable === 1;
    case 'indication':
      return row.phase === 'INDICATION' && row.tradeable === 1;
    case 'a_plus':
      try {
        const snap = JSON.parse(row.snapshot_json) as { confluence?: { aligned?: boolean } };
        return !!snap.confluence?.aligned;
      } catch {
        return false;
      }
  }
}

// ── stats ────────────────────────────────────────────────────

function computeSharpe(rs: number[]): number {
  const n = rs.length;
  const mean = rs.reduce((s, r) => s + r, 0) / n;
  const variance = rs.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return 0;
  // Approximation: sharpe = mean-R / stdev-R. Not annualized — we're scoring
  // per-trade R distribution, which is what matters for a discretionary read.
  return Math.round((mean / stdev) * 100) / 100;
}

function emptyResult(params: BacktestParams, warning: string): BacktestResult {
  return {
    params,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgR: 0,
    expectancy: 0,
    maxDrawdownPercent: 0,
    sharpe: null,
    endingBalance: params.startingBalance,
    totalReturnPercent: 0,
    equityCurve: [],
    trades: [],
    meaningful: false,
    warning,
  };
}

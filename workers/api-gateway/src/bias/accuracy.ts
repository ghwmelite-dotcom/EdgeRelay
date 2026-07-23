// Historical-accuracy backtest over bias_history.
//
// Rules:
//   - Only score rows where a directional bias was called (BULLISH / BEARISH).
//   - A call is counted "correct" if price moved in the bias direction between
//     the snapshot and a verification point N bars ahead (default 6 × 4H = 24h).
//   - Price-derived from the captured snapshot_json so we don't have to
//     re-fetch candles.
//
// The verification horizon matters: on 4H with 24h lookahead, we're testing
// whether a 4H bias held up for one full trading day. Too short and noise
// dominates; too long and the bias has rotated already.

import type { Env } from '../types.js';
import type { BiasDirection } from '@edgerelay/shared';

export interface AccuracyStats {
  symbol: string;
  interval: string;
  windowDays: number;
  totalCalls: number;
  directionalCalls: number;   // excluding NEUTRAL
  correct: number;
  incorrect: number;
  winRate: number;            // 0..100, of directional calls
  avgMovePct: number;         // average absolute % move over verification horizon
  lastCalculated: string;
}

export interface AccuracyBreakdown {
  byWindow: {
    '7d':  AccuracyStats;
    '30d': AccuracyStats;
    '90d': AccuracyStats;
    all:   AccuracyStats;
  };
}

interface HistoryRow {
  symbol: string;
  captured_unix: number;
  price: number;
  bias: BiasDirection;
  score: number;
}

const LOOKAHEAD_SECONDS = 6 * 4 * 3600;  // 6 × 4H candles = 24h

export async function computeAccuracy(
  env: Env,
  symbol: string | null,
  interval: '4h' = '4h',
): Promise<Record<string, AccuracyBreakdown>> {
  const sql = symbol
    ? `SELECT symbol, captured_unix, price, bias, score FROM bias_history
       WHERE interval = ? AND symbol = ?
       ORDER BY captured_unix ASC`
    : `SELECT symbol, captured_unix, price, bias, score FROM bias_history
       WHERE interval = ?
       ORDER BY symbol ASC, captured_unix ASC`;

  const stmt = symbol
    ? env.DB.prepare(sql).bind(interval, symbol.toUpperCase())
    : env.DB.prepare(sql).bind(interval);

  const { results } = await stmt.all<HistoryRow>();
  const rows = results ?? [];

  const bySymbol = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    const bucket = bySymbol.get(r.symbol) ?? [];
    bucket.push(r);
    bySymbol.set(r.symbol, bucket);
  }

  const out: Record<string, AccuracyBreakdown> = {};
  const now = Math.floor(Date.now() / 1000);

  for (const [sym, list] of bySymbol) {
    out[sym] = {
      byWindow: {
        '7d':  computeWindow(sym, interval, list, now - 7  * 86400, now, 7),
        '30d': computeWindow(sym, interval, list, now - 30 * 86400, now, 30),
        '90d': computeWindow(sym, interval, list, now - 90 * 86400, now, 90),
        all:   computeWindow(sym, interval, list, 0, now, Math.ceil((now - (list[0]?.captured_unix ?? now)) / 86400)),
      },
    };
  }
  return out;
}

function computeWindow(
  symbol: string,
  interval: string,
  list: HistoryRow[],
  fromUnix: number,
  toUnix: number,
  windowDays: number,
): AccuracyStats {
  const eligible = list.filter((r) => r.captured_unix >= fromUnix && r.captured_unix <= toUnix);
  let directional = 0;
  let correct = 0;
  let incorrect = 0;
  let moveSum = 0;
  let moveCount = 0;

  // Snapshots indexed by captured_unix for O(log n) lookup of a future row
  for (let i = 0; i < eligible.length; i++) {
    const row = eligible[i]!;
    if (row.bias === 'NEUTRAL') continue;
    directional++;

    const verifyAtUnix = row.captured_unix + LOOKAHEAD_SECONDS;
    if (verifyAtUnix > toUnix) continue; // not yet verifiable

    // Find the nearest row at or after verifyAtUnix
    const future = findNearestAfter(list, verifyAtUnix);
    if (!future || future.captured_unix - verifyAtUnix > 4 * 3600) continue;

    const movePct = row.price > 0 ? ((future.price - row.price) / row.price) * 100 : 0;
    moveSum += Math.abs(movePct);
    moveCount++;

    const predictedUp = row.bias === 'BULLISH';
    const actualUp = future.price > row.price;
    if (predictedUp === actualUp) correct++; else incorrect++;
  }

  const verifiable = correct + incorrect;
  return {
    symbol,
    interval,
    windowDays,
    totalCalls: eligible.length,
    directionalCalls: directional,
    correct,
    incorrect,
    winRate: verifiable > 0 ? Math.round((correct / verifiable) * 1000) / 10 : 0,
    avgMovePct: moveCount > 0 ? Math.round((moveSum / moveCount) * 100) / 100 : 0,
    lastCalculated: new Date().toISOString(),
  };
}

function findNearestAfter(list: HistoryRow[], ts: number): HistoryRow | null {
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const row = list[mid]!;
    if (row.captured_unix < ts) lo = mid + 1;
    else hi = mid - 1;
  }
  return list[lo] ?? null;
}

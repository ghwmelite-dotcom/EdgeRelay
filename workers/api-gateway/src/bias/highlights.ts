// Engine-wide highlights for the public /track-record page.
//
// Returns:
//   - aggregate: total calls, directional calls, verified, correct, win rate,
//     sample size flag.
//   - dailyTrend: rolling daily win rate for the last 30 days.
//   - aPlusHistory: recent A+ SETUP events from bias_history (uses confluence
//     decoded from snapshot_json since the flat columns don't capture it).
//   - perAsset: per-symbol aggregate win rate.

import type { Env } from '../types.js';
import { computeAccuracy } from './accuracy.js';

export interface HighlightsResponse {
  asOf: string;
  aggregate: {
    totalCalls: number;
    directionalCalls: number;
    verified: number;
    correct: number;
    winRate: number;
    /** true once we have ≥20 verified calls — below that, numbers are noise. */
    meaningful: boolean;
  };
  dailyTrend: Array<{ date: string; verified: number; correct: number; winRate: number }>;
  aPlusHistory: Array<{
    symbol: string;
    captured_at: string;
    bias: string;
    score: number;
    price: number;
  }>;
  perAsset: Array<{
    symbol: string;
    winRate: number;
    verified: number;
    totalCalls: number;
  }>;
}

const LOOKAHEAD_SECONDS = 6 * 4 * 3600;

interface HistoryRow {
  symbol: string;
  captured_unix: number;
  captured_at: string;
  price: number;
  bias: string;
  score: number;
  snapshot_json: string | null;
}

export async function computeHighlights(env: Env): Promise<HighlightsResponse> {
  const accuracyData = await computeAccuracy(env, null);

  // Aggregate across all symbols
  let totalCalls = 0;
  let directionalCalls = 0;
  let verified = 0;
  let correct = 0;

  const perAsset: HighlightsResponse['perAsset'] = [];
  for (const [symbol, br] of Object.entries(accuracyData)) {
    const all = br.byWindow.all;
    totalCalls       += all.totalCalls;
    directionalCalls += all.directionalCalls;
    verified         += all.correct + all.incorrect;
    correct          += all.correct;
    perAsset.push({
      symbol,
      winRate: all.winRate,
      verified: all.correct + all.incorrect,
      totalCalls: all.totalCalls,
    });
  }

  const aggregateWinRate = verified > 0 ? Math.round((correct / verified) * 1000) / 10 : 0;

  const dailyTrend = await computeDailyTrend(env);
  const aPlusHistory = await loadAPlusHistory(env);

  return {
    asOf: new Date().toISOString(),
    aggregate: {
      totalCalls,
      directionalCalls,
      verified,
      correct,
      winRate: aggregateWinRate,
      meaningful: verified >= 20,
    },
    dailyTrend,
    aPlusHistory,
    perAsset,
  };
}

async function computeDailyTrend(env: Env): Promise<HighlightsResponse['dailyTrend']> {
  // Pull all 4h rows in the last 30 days, bucket by UTC date, score each
  // bucket by looking up the future row for each call.
  const now = Math.floor(Date.now() / 1000);
  const from = now - 30 * 86400;

  const { results } = await env.DB.prepare(
    `SELECT symbol, captured_unix, price, bias
     FROM bias_history
     WHERE interval = '4h' AND captured_unix >= ?
     ORDER BY symbol ASC, captured_unix ASC`,
  ).bind(from).all<{ symbol: string; captured_unix: number; price: number; bias: string }>();

  const rows = results ?? [];
  // Build per-symbol ordered list for the future-row lookup
  const bySymbol = new Map<string, typeof rows>();
  for (const r of rows) {
    const bucket = bySymbol.get(r.symbol) ?? [];
    bucket.push(r);
    bySymbol.set(r.symbol, bucket);
  }

  const perDay = new Map<string, { verified: number; correct: number }>();

  for (const list of bySymbol.values()) {
    for (const row of list) {
      if (row.bias === 'NEUTRAL') continue;
      const verifyAt = row.captured_unix + LOOKAHEAD_SECONDS;
      if (verifyAt > now) continue;
      const future = findNearestAfter(list, verifyAt);
      if (!future || future.captured_unix - verifyAt > 4 * 3600) continue;

      const predictedUp = row.bias === 'BULLISH';
      const actualUp = future.price > row.price;
      const date = new Date(row.captured_unix * 1000).toISOString().slice(0, 10);
      const bucket = perDay.get(date) ?? { verified: 0, correct: 0 };
      bucket.verified++;
      if (predictedUp === actualUp) bucket.correct++;
      perDay.set(date, bucket);
    }
  }

  const out: HighlightsResponse['dailyTrend'] = [];
  for (const [date, b] of perDay) {
    out.push({
      date,
      verified: b.verified,
      correct: b.correct,
      winRate: b.verified > 0 ? Math.round((b.correct / b.verified) * 1000) / 10 : 0,
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function findNearestAfter<T extends { captured_unix: number }>(list: T[], ts: number): T | null {
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

async function loadAPlusHistory(env: Env): Promise<HighlightsResponse['aPlusHistory']> {
  // A+ SETUP is encoded inside snapshot_json (confluence.aligned). Pull the
  // last 200 4h rows, decode, keep aligned ones. 200 rows covers the last
  // ~50 hours across 5 assets, which is plenty for the UI.
  const { results } = await env.DB.prepare(
    `SELECT symbol, captured_at, price, bias, score, snapshot_json
     FROM bias_history
     WHERE interval = '4h'
     ORDER BY captured_unix DESC
     LIMIT 200`,
  ).all<HistoryRow>();

  const seen = new Set<string>();
  const out: HighlightsResponse['aPlusHistory'] = [];
  for (const r of results ?? []) {
    if (!r.snapshot_json) continue;
    try {
      const snap = JSON.parse(r.snapshot_json) as { confluence?: { aligned?: boolean } };
      if (!snap.confluence?.aligned) continue;
    } catch {
      continue;
    }
    // Dedup per (symbol, day) so a 6-hour A+ streak shows as one entry
    const dayKey = `${r.symbol}:${r.captured_at.slice(0, 10)}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    out.push({
      symbol: r.symbol,
      captured_at: r.captured_at,
      bias: r.bias,
      score: r.score,
      price: r.price,
    });
    if (out.length >= 20) break;
  }
  return out;
}

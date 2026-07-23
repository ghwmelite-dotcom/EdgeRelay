// Orchestration layer for the ORB engine.
//
// - loadAssetSessionToday(): returns the most up-to-date state of an
//   asset/session for today. If the range is formed, fills it in; if a
//   breakout has occurred, fills the signal; if outcome is known, fills
//   that too.
// - persistAndEmit(): idempotent D1 upsert for orb_history so multiple
//   cron invocations converge on one row per (symbol, session, date).

import type {
  OrbSession,
  OrbSignal,
  OrbRange,
  OrbAssetState,
  OrbTradePlan,
  OrbOutcome,
  OrbQualityResult,
} from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS, loadCandlesForAsset, type AssetSpec } from '../bias/fetcher.js';
import {
  activeSession,
  sessionBoundsFor,
  utcDateStr,
  type SessionBounds,
} from './sessionWindow.js';
import { computeOpeningRange } from './rangeTracker.js';
import { detectBreakout, resolveOutcome } from './breakoutDetector.js';
import { computeOrbTradePlan } from './tradePlan.js';
import { computeOrbQuality } from './qualityGrader.js';

export interface OrbRecompute {
  spec: AssetSpec;
  session: OrbSession;
  bounds: SessionBounds;
  signal: OrbSignal | null;       // the up-to-date state (may be null if range not yet formed)
  justFiredBreakout: boolean;      // true the first tick a break is detected
}

/** Pulls M15 candles for one asset and recomputes state for both
 *  sessions on today's UTC date. Returns both session states. */
export async function recomputeAssetToday(
  env: Env,
  spec: AssetSpec,
  nowUnix: number,
): Promise<OrbRecompute[]> {
  const { candles } = await loadCandlesForAsset(spec, {
    apiKey: env.TWELVE_DATA_KEY!,
    kv: env.BOT_STATE,
    ttlSeconds: 900,
    outputSize: 200,
    interval: '15min',
  });
  if (candles.length === 0) return [];

  const [london, ny] = sessionBoundsFor(nowUnix);
  const out: OrbRecompute[] = [];
  for (const bounds of [london, ny]) {
    // Skip sessions that haven't even started yet today
    if (nowUnix < bounds.openUnix) continue;

    const range = computeOpeningRange(candles, bounds);
    if (!range) {
      // Session has started but range not yet observable in the feed
      out.push({ spec, session: bounds.session, bounds, signal: null, justFiredBreakout: false });
      continue;
    }

    // Range formed — look for a breakout in the validity window
    const maxOpenTime = Math.min(nowUnix, bounds.validityEndUnix - 1);
    const windowCandles = candles.filter((c) => c.time + 15 * 60 <= maxOpenTime + 60);
    const breakout = detectBreakout(
      windowCandles,
      bounds.rangeCloseUnix,
      range.high, range.low,
      bounds.validityEndUnix,
    );

    const dateStr = utcDateStr(bounds.openUnix);

    if (!breakout) {
      out.push({
        spec,
        session: bounds.session,
        bounds,
        signal: {
          id: `${spec.key}-${bounds.session}-${dateStr}`,
          symbol: spec.key,
          session: bounds.session,
          date: dateStr,
          range,
          signalType: null, signalPrice: null, signalAtUnix: null,
          tradePlan: null,
          quality: null, metCount: 0, totalCount: 8, criteria: [],
          outcome: 'open', outcomePrice: null, outcomeAtUnix: null, rMultiple: null,
        },
        justFiredBreakout: false,
      });
      continue;
    }

    // Breakout fired — compute plan + quality + possible outcome
    const plan: OrbTradePlan = computeOrbTradePlan(breakout.direction, breakout.price, range);
    const priorCandles = candles.filter((c) => c.time < breakout.candle.time);
    const quality: OrbQualityResult = computeOrbQuality({
      asset: spec,
      session: bounds.session,
      range,
      breakCandle: breakout.candle,
      priorCandles,
      direction: breakout.direction,
    });

    const outcomeResult = resolveOutcome(
      candles,
      breakout.candle.time + 15 * 60,   // start scanning after the break candle closes
      breakout.direction,
      plan.entry,
      plan.stopLoss,
      plan.takeProfit1,
      plan.takeProfit2,
      bounds.validityEndUnix,
    );
    const outcome: OrbOutcome = outcomeResult?.outcome ?? 'open';

    out.push({
      spec,
      session: bounds.session,
      bounds,
      signal: {
        id: `${spec.key}-${bounds.session}-${dateStr}`,
        symbol: spec.key,
        session: bounds.session,
        date: dateStr,
        range,
        signalType: breakout.direction,
        signalPrice: breakout.price,
        signalAtUnix: breakout.breakAtUnix,
        tradePlan: plan,
        quality: quality.quality,
        metCount: quality.metCount,
        totalCount: quality.totalCount,
        criteria: quality.criteria,
        outcome,
        outcomePrice: outcomeResult?.price ?? null,
        outcomeAtUnix: outcomeResult?.atUnix ?? null,
        rMultiple: outcomeResult?.rMultiple ?? null,
      },
      justFiredBreakout: false,   // filled below by persistAndEmit
    });
  }
  return out;
}

/** Upsert into orb_history and return `justFiredBreakout=true` if this
 *  call is the one that moved the row from signalType=null → signalType
 *  set. Lets the caller decide whether to dispatch alerts. */
export async function persistOrbState(env: Env, state: OrbRecompute): Promise<boolean> {
  if (!state.signal) return false;
  const s = state.signal;
  const criteriaJson = s.criteria.length > 0 ? JSON.stringify(s.criteria) : null;

  // Query prior row to detect transitions
  const prior = await env.DB.prepare(
    `SELECT signal_type, outcome FROM orb_history
      WHERE symbol = ? AND session = ? AND date = ?`,
  ).bind(s.symbol, s.session, s.date).first<{ signal_type: string | null; outcome: string | null }>();

  const justFired = !prior?.signal_type && s.signalType !== null;

  // Upsert — INSERT OR REPLACE would clear id. Use manual split.
  if (!prior) {
    await env.DB.prepare(`
      INSERT INTO orb_history (
        symbol, session, date,
        range_high, range_low, range_formed_at_unix, range_atr, range_pct,
        signal_type, signal_price, signal_at_unix,
        stop_loss, take_profit_1, take_profit_2,
        quality, criteria_met, criteria_total, criteria_json,
        outcome, outcome_price, outcome_at_unix, r_multiple
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      s.symbol, s.session, s.date,
      s.range.high, s.range.low, s.range.formedAtUnix, s.range.atr, s.range.rangePct,
      s.signalType, s.signalPrice, s.signalAtUnix,
      s.tradePlan?.stopLoss ?? null, s.tradePlan?.takeProfit1 ?? null, s.tradePlan?.takeProfit2 ?? null,
      s.quality, s.metCount, s.totalCount, criteriaJson,
      s.outcome, s.outcomePrice, s.outcomeAtUnix, s.rMultiple,
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE orb_history SET
        range_high = ?, range_low = ?, range_formed_at_unix = ?, range_atr = ?, range_pct = ?,
        signal_type = ?, signal_price = ?, signal_at_unix = ?,
        stop_loss = ?, take_profit_1 = ?, take_profit_2 = ?,
        quality = ?, criteria_met = ?, criteria_total = ?, criteria_json = ?,
        outcome = ?, outcome_price = ?, outcome_at_unix = ?, r_multiple = ?
       WHERE symbol = ? AND session = ? AND date = ?
    `).bind(
      s.range.high, s.range.low, s.range.formedAtUnix, s.range.atr, s.range.rangePct,
      s.signalType, s.signalPrice, s.signalAtUnix,
      s.tradePlan?.stopLoss ?? null, s.tradePlan?.takeProfit1 ?? null, s.tradePlan?.takeProfit2 ?? null,
      s.quality, s.metCount, s.totalCount, criteriaJson,
      s.outcome, s.outcomePrice, s.outcomeAtUnix, s.rMultiple,
      s.symbol, s.session, s.date,
    ).run();
  }
  return justFired;
}

// ── HTTP endpoint helpers ─────────────────────────────────────

export async function loadAssetState(env: Env, spec: AssetSpec, nowUnix: number): Promise<OrbAssetState> {
  const today = await recomputeAssetToday(env, spec, nowUnix);
  const london = today.find((s) => s.session === 'london')?.signal ?? null;
  const ny = today.find((s) => s.session === 'newyork')?.signal ?? null;

  // Last 7 days of history
  const { results } = await env.DB.prepare(
    `SELECT * FROM orb_history
     WHERE symbol = ?
     ORDER BY date DESC, session DESC
     LIMIT 14`,
  ).bind(spec.key).all<OrbHistoryRow>();

  const recent: OrbSignal[] = (results ?? []).map(rowToSignal);

  return {
    symbol: spec.key,
    label: spec.label,
    category: spec.category,
    activeSession: activeSession(nowUnix),
    todayLondon: london,
    todayNewyork: ny,
    recent,
  };
}

export async function loadAllAssetStates(env: Env, nowUnix: number): Promise<OrbAssetState[]> {
  return Promise.all(ASSETS.map((a) => loadAssetState(env, a, nowUnix)));
}

interface OrbHistoryRow {
  id: string;
  symbol: string;
  session: string;
  date: string;
  range_high: number | null; range_low: number | null;
  range_formed_at_unix: number | null; range_atr: number | null; range_pct: number | null;
  signal_type: string | null; signal_price: number | null; signal_at_unix: number | null;
  stop_loss: number | null; take_profit_1: number | null; take_profit_2: number | null;
  quality: string | null; criteria_met: number | null; criteria_total: number | null;
  criteria_json: string | null;
  outcome: string | null; outcome_price: number | null; outcome_at_unix: number | null; r_multiple: number | null;
}

function rowToSignal(r: OrbHistoryRow): OrbSignal {
  const rangeHigh = r.range_high ?? 0;
  const rangeLow = r.range_low ?? 0;
  const range: OrbRange = {
    high: rangeHigh,
    low: rangeLow,
    formedAtUnix: r.range_formed_at_unix ?? 0,
    atr: r.range_atr ?? 0,
    rangePct: r.range_pct ?? 0,
  };
  let criteria: OrbSignal['criteria'] = [];
  try { criteria = r.criteria_json ? JSON.parse(r.criteria_json) : []; } catch { /* ignore */ }
  return {
    id: r.id,
    symbol: r.symbol,
    session: r.session as OrbSession,
    date: r.date,
    range,
    signalType: (r.signal_type as 'long' | 'short' | null) ?? null,
    signalPrice: r.signal_price,
    signalAtUnix: r.signal_at_unix,
    tradePlan: r.signal_type && r.signal_price !== null && r.stop_loss !== null && r.take_profit_1 !== null && r.take_profit_2 !== null
      ? {
          direction: r.signal_type as 'long' | 'short',
          entry: r.signal_price,
          stopLoss: r.stop_loss,
          takeProfit1: r.take_profit_1,
          takeProfit2: r.take_profit_2,
          slDistancePct: round((Math.abs(r.signal_price - r.stop_loss) / r.signal_price) * 100, 2),
          tp1DistancePct: round((Math.abs(r.take_profit_1 - r.signal_price) / r.signal_price) * 100, 2),
          tp2DistancePct: round((Math.abs(r.take_profit_2 - r.signal_price) / r.signal_price) * 100, 2),
          rationaleSl: '',
        }
      : null,
    quality: (r.quality as OrbSignal['quality']) ?? null,
    metCount: r.criteria_met ?? 0,
    totalCount: r.criteria_total ?? 8,
    criteria,
    outcome: (r.outcome as OrbOutcome) ?? 'open',
    outcomePrice: r.outcome_price,
    outcomeAtUnix: r.outcome_at_unix,
    rMultiple: r.r_multiple,
  };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

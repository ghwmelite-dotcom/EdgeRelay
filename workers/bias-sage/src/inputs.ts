import type { Env } from './types.js';
import type { UserBiasStat, SageBriefLevel } from '@edgerelay/shared';

// The 5 tracked ICC assets. Hardcoded in Phase 1 — per-user watchlist
// customization is a Phase 2+ feature. Keep in sync with workers/api-gateway/src/bias/fetcher.ts.
export const ICC_WATCHLIST = ['XAUUSD', 'NAS100', 'US30', 'EURUSD', 'GBPUSD'] as const;

export interface UserContext {
  id: string;
  name: string;
  timezone: string;
  watchlist: readonly string[];
}

export interface BiasSnapshotRow {
  symbol: string;
  bias: string;            // BULLISH | BEARISH | NEUTRAL
  score: number;           // -100..100
  phase: string;           // INDICATION | CORRECTION | CONTINUATION | NO_SETUP
  correction_depth: number | null;
}

export interface YesterdayAccuracy {
  symbol: string;
  hit: boolean;
}

export interface PromptInputs {
  level: SageBriefLevel;
  user: UserContext;
  userStats: UserBiasStat[];
  bias: BiasSnapshotRow[];
  yesterdayAccuracy: YesterdayAccuracy[];
  priorAnchorMd: string | null;
  generatedAt: number;
}

export async function buildPromptInputs(
  env: Pick<Env, 'DB' | 'BIAS_SAGE'>,
  userId: string,
  now: number,
): Promise<PromptInputs> {
  const watchlist = ICC_WATCHLIST;
  const placeholders = watchlist.map(() => '?').join(',');

  // Five parallel reads:
  //   1. users — id + name
  //   2. notification_preferences — timezone (default UTC)
  //   3. user_bias_stats — for L1/L2 detection + prompt
  //   4. bias_history latest-per-symbol — current bias snapshot for the watchlist
  //   5. KV: prior day's anchor for narrative continuity
  const [userRow, prefsRow, statsRes, biasRes, priorAnchor] = await Promise.all([
    env.DB.prepare(`SELECT id, name FROM users WHERE id = ?`)
      .bind(userId)
      .first<{ id: string; name: string | null }>(),
    env.DB.prepare(`SELECT timezone FROM notification_preferences WHERE user_id = ?`)
      .bind(userId)
      .first<{ timezone: string | null }>(),
    env.DB.prepare(
      `SELECT symbol, icc_phase, n_trades, n_wins, total_r, last_trade_at
       FROM user_bias_stats WHERE user_id = ?`,
    ).bind(userId).all<UserBiasStat>(),
    // Latest bias_history row per symbol within the watchlist.
    // Phase string: bias || '_' || phase (e.g. BULLISH_INDICATION) — matches
    // the journal-sync aggregator already shipped in Task 4.
    env.DB.prepare(
      `SELECT h.symbol, h.bias, h.score, h.phase, h.correction_depth
       FROM bias_history h
       JOIN (
         SELECT symbol, MAX(captured_unix) AS max_ts
         FROM bias_history
         WHERE symbol IN (${placeholders}) AND interval = '4h'
         GROUP BY symbol
       ) latest ON h.symbol = latest.symbol AND h.captured_unix = latest.max_ts`,
    ).bind(...watchlist).all<BiasSnapshotRow>(),
    env.BIAS_SAGE.get(`anchor:${userId}:${dayKey(now - 86400)}`),
  ]);

  if (!userRow) {
    throw new Error(`user not found: ${userId}`);
  }

  const userStats = statsRes.results ?? [];
  const watchSet = new Set<string>(watchlist);
  const level: SageBriefLevel =
    userStats.some((s) => watchSet.has(s.symbol) && s.n_trades >= 3) ? 'L2' : 'L1';

  return {
    level,
    user: {
      id: userRow.id,
      name: userRow.name ?? 'Trader',
      timezone: prefsRow?.timezone ?? 'UTC',
      watchlist,
    },
    userStats,
    bias: biasRes.results ?? [],
    yesterdayAccuracy: [], // Phase 1: deferred. bias_accuracy_daily table doesn't exist yet.
    priorAnchorMd: priorAnchor,
    generatedAt: now,
  };
}

function dayKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

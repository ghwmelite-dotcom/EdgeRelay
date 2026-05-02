export interface RawTrade {
  user_id: string;
  symbol: string;
  time: number;          // unix seconds
  profit: number;
  risk_reward_ratio: number;
}

export interface RawPhase {
  symbol: string;
  ts: number;            // unix seconds
  phase: string;
}

export interface BiasStat {
  user_id: string;
  symbol: string;
  icc_phase: string;
  n_trades: number;
  n_wins: number;
  total_r: number;
  last_trade_at: number;
  updated_at: number;
}

/**
 * For each trade, find the most recent phase row where ts <= trade.time AND symbol matches.
 * Aggregate counts/wins/R into one row per (user, symbol, phase).
 */
export function computeUserBiasStats(
  trades: RawTrade[],
  phases: RawPhase[],
  now: number,
): BiasStat[] {
  // Index phases per symbol, sorted by ts ascending
  const phasesBySymbol = new Map<string, RawPhase[]>();
  for (const p of phases) {
    const arr = phasesBySymbol.get(p.symbol) ?? [];
    arr.push(p);
    phasesBySymbol.set(p.symbol, arr);
  }
  for (const arr of phasesBySymbol.values()) {
    arr.sort((a, b) => a.ts - b.ts);
  }

  const acc = new Map<string, BiasStat>();

  for (const t of trades) {
    const phasesForSymbol = phasesBySymbol.get(t.symbol);
    if (!phasesForSymbol) continue;
    // Binary search for the latest phase with ts <= t.time
    let lo = 0;
    let hi = phasesForSymbol.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (phasesForSymbol[mid]!.ts <= t.time) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx === -1) continue;
    const phase = phasesForSymbol[idx]!.phase;
    const key = `${t.user_id}|${t.symbol}|${phase}`;
    const existing = acc.get(key);
    if (existing) {
      existing.n_trades++;
      if (t.profit > 0) existing.n_wins++;
      existing.total_r += t.risk_reward_ratio;
      existing.last_trade_at = Math.max(existing.last_trade_at, t.time);
    } else {
      acc.set(key, {
        user_id: t.user_id,
        symbol: t.symbol,
        icc_phase: phase,
        n_trades: 1,
        n_wins: t.profit > 0 ? 1 : 0,
        total_r: t.risk_reward_ratio,
        last_trade_at: t.time,
        updated_at: now,
      });
    }
  }

  return [...acc.values()];
}

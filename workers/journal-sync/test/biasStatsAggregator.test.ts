import { describe, it, expect } from 'vitest';
import { computeUserBiasStats, type RawTrade, type RawPhase } from '../src/biasStatsAggregator.js';

describe('computeUserBiasStats', () => {
  it('classifies trades by symbol × icc_phase and computes win rate', () => {
    const trades: RawTrade[] = [
      { user_id: 'u1', symbol: 'EURUSD', time: 100, profit: 10, risk_reward_ratio: 2 },
      { user_id: 'u1', symbol: 'EURUSD', time: 200, profit: -5, risk_reward_ratio: -1 },
      { user_id: 'u1', symbol: 'EURUSD', time: 300, profit: 12, risk_reward_ratio: 2.4 },
      { user_id: 'u1', symbol: 'NAS100', time: 400, profit: -8, risk_reward_ratio: -1 },
    ];
    const phases: RawPhase[] = [
      { symbol: 'EURUSD', ts: 50,  phase: 'BULL_INDICATION' },
      { symbol: 'EURUSD', ts: 150, phase: 'BULL_CONTINUATION' },
      { symbol: 'EURUSD', ts: 250, phase: 'BULL_INDICATION' },
      { symbol: 'NAS100', ts: 350, phase: 'BEAR_FLIP' },
    ];

    const stats = computeUserBiasStats(trades, phases, 1000);

    const eurInd = stats.find((s) => s.symbol === 'EURUSD' && s.icc_phase === 'BULL_INDICATION');
    expect(eurInd).toBeDefined();
    expect(eurInd!.n_trades).toBe(2);
    expect(eurInd!.n_wins).toBe(2);
    expect(eurInd!.total_r).toBeCloseTo(4.4);

    const eurCont = stats.find((s) => s.symbol === 'EURUSD' && s.icc_phase === 'BULL_CONTINUATION');
    expect(eurCont!.n_trades).toBe(1);
    expect(eurCont!.n_wins).toBe(0);

    const nas = stats.find((s) => s.symbol === 'NAS100');
    expect(nas!.n_trades).toBe(1);
    expect(nas!.n_wins).toBe(0);
  });

  it('skips trades with no phase before their timestamp', () => {
    const trades: RawTrade[] = [
      { user_id: 'u1', symbol: 'EURUSD', time: 10, profit: 5, risk_reward_ratio: 1 },
    ];
    const phases: RawPhase[] = [
      { symbol: 'EURUSD', ts: 100, phase: 'BULL_INDICATION' },
    ];
    expect(computeUserBiasStats(trades, phases, 200)).toEqual([]);
  });
});

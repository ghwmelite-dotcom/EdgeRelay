import { describe, it, expect } from 'vitest';
import { buildPromptInputs, ICC_WATCHLIST } from '../src/inputs.js';
import type { Env } from '../src/types.js';

const MOCK_NOW = 1714636800;

interface FakeRows {
  user?: { id: string; name: string };
  notifPrefs?: { timezone: string } | null;
  stats?: Array<{ symbol: string; icc_phase: string; n_trades: number; n_wins: number; total_r: number; last_trade_at: number }>;
  bias?: Array<{ symbol: string; bias: string; score: number; phase: string; correction_depth: number | null }>;
}

function fakeEnv(rows: FakeRows): Pick<Env, 'DB' | 'BIAS_SAGE'> {
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          first: async () => {
            if (sql.includes('FROM users')) return rows.user ?? null;
            if (sql.includes('notification_preferences')) return rows.notifPrefs ?? null;
            return null;
          },
          all: async () => {
            if (sql.includes('user_bias_stats')) return { results: rows.stats ?? [] };
            if (sql.includes('bias_history')) return { results: rows.bias ?? [] };
            return { results: [] };
          },
        }),
      }),
    } as unknown as D1Database,
    BIAS_SAGE: {
      get: async (_k: string) => null,
    } as unknown as KVNamespace,
  };
}

describe('buildPromptInputs', () => {
  it('returns L2 inputs when at least one watchlist asset has >= 3 trades', async () => {
    const env = fakeEnv({
      user: { id: 'u1', name: 'Oz' },
      notifPrefs: { timezone: 'UTC' },
      stats: [
        { symbol: 'EURUSD', icc_phase: 'BULLISH_INDICATION', n_trades: 7, n_wins: 5, total_r: 8.4, last_trade_at: 1714000000 },
      ],
      bias: [
        { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'INDICATION', correction_depth: 48 },
      ],
    });

    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.level).toBe('L2');
    expect(result.user.name).toBe('Oz');
    expect(result.user.timezone).toBe('UTC');
    expect(result.user.watchlist).toEqual(ICC_WATCHLIST);
    expect(result.userStats).toHaveLength(1);
    expect(result.bias).toHaveLength(1);
    expect(result.yesterdayAccuracy).toEqual([]);
  });

  it('returns L1 when no watchlist asset has >= 3 trades', async () => {
    const env = fakeEnv({
      user: { id: 'u1', name: 'Oz' },
      notifPrefs: { timezone: 'UTC' },
      stats: [
        { symbol: 'EURUSD', icc_phase: 'BULLISH_INDICATION', n_trades: 2, n_wins: 1, total_r: 0.4, last_trade_at: 1714000000 },
      ],
      bias: [
        { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'INDICATION', correction_depth: 48 },
      ],
    });
    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.level).toBe('L1');
  });

  it('returns L1 when stats are for a non-watchlist asset', async () => {
    const env = fakeEnv({
      user: { id: 'u1', name: 'Oz' },
      notifPrefs: { timezone: 'UTC' },
      stats: [
        { symbol: 'BTCUSD', icc_phase: 'BULLISH_INDICATION', n_trades: 99, n_wins: 50, total_r: 10, last_trade_at: 1714000000 },
      ],
    });
    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.level).toBe('L1');
  });

  it('defaults timezone to UTC when no notification_preferences row', async () => {
    const env = fakeEnv({
      user: { id: 'u1', name: 'Oz' },
      notifPrefs: null,
      stats: [],
      bias: [],
    });
    const result = await buildPromptInputs(env, 'u1', MOCK_NOW);
    expect(result.user.timezone).toBe('UTC');
  });

  it('throws when user does not exist', async () => {
    const env = fakeEnv({});
    await expect(buildPromptInputs(env, 'u1', MOCK_NOW)).rejects.toThrow(/user not found/);
  });
});

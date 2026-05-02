import { describe, it, expect } from 'vitest';
import { buildAnchorMessages } from '../src/prompt.js';
import type { PromptInputs } from '../src/inputs.js';

const baseInputs: PromptInputs = {
  level: 'L2',
  user: { id: 'u1', name: 'Oz', timezone: 'UTC', watchlist: ['EURUSD', 'NAS100'] },
  userStats: [
    { symbol: 'EURUSD', icc_phase: 'BULLISH_INDICATION', n_trades: 7, n_wins: 5, total_r: 8.4, last_trade_at: 1714000000 },
    { symbol: 'NAS100', icc_phase: 'BEARISH_NO_SETUP', n_trades: 3, n_wins: 0, total_r: -3.0, last_trade_at: 1714000000 },
  ],
  bias: [
    { symbol: 'EURUSD', bias: 'BULLISH', score: 72, phase: 'INDICATION', correction_depth: 48 },
    { symbol: 'NAS100', bias: 'BEARISH', score: -55, phase: 'NO_SETUP', correction_depth: null },
  ],
  yesterdayAccuracy: [],
  priorAnchorMd: null,
  generatedAt: 1714636800,
};

describe('buildAnchorMessages', () => {
  it('emits a system block with voice spec and hard rules', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.system).toContain('Mentor');
    expect(m.system).toContain('exactly one Socratic question');
    expect(m.system).toContain('<intent>');
  });

  it('embeds user stats verbatim in user message for L2', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.user).toContain('"n_trades": 7');
    expect(m.user).toContain('"symbol": "EURUSD"');
  });

  it('marks L1 in user message and omits stats when level is L1', () => {
    const m = buildAnchorMessages({ ...baseInputs, level: 'L1', userStats: [] });
    expect(m.user).toContain('"level": "L1"');
    expect(m.user).toContain('"userStats": []');
  });

  it('embeds the start-instruction with user name in system prompt', () => {
    const m = buildAnchorMessages(baseInputs);
    expect(m.system).toContain('Morning, Oz.');
    expect(m.system).toContain('Begin your response with');
  });

  it('handles user with default name "Trader" in system start-instruction', () => {
    const m = buildAnchorMessages({ ...baseInputs, user: { ...baseInputs.user, name: 'Trader' } });
    expect(m.system).toContain('Morning, Trader.');
    expect(m.system).toContain('Begin your response with');
  });
});

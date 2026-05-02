import { describe, it, expect } from 'vitest';
import { computeInputsHash, isMaterialChange } from '../src/materiality.js';

describe('computeInputsHash', () => {
  it('produces stable hash for same inputs', () => {
    const a = computeInputsHash({ phases: { EURUSD: 'BULLISH_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    const b = computeInputsHash({ phases: { EURUSD: 'BULLISH_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    expect(a).toBe(b);
  });

  it('produces different hash when phase changes', () => {
    const a = computeInputsHash({ phases: { EURUSD: 'BULLISH_INDICATION' }, openPositions: [], lastBriefId: 'b1' });
    const b = computeInputsHash({ phases: { EURUSD: 'BULLISH_CONTINUATION' }, openPositions: [], lastBriefId: 'b1' });
    expect(a).not.toBe(b);
  });

  it('is order-insensitive on phase keys', () => {
    const a = computeInputsHash({ phases: { EURUSD: 'BULLISH_INDICATION', NAS100: 'BEARISH_NO_SETUP' }, openPositions: [], lastBriefId: null });
    const b = computeInputsHash({ phases: { NAS100: 'BEARISH_NO_SETUP', EURUSD: 'BULLISH_INDICATION' }, openPositions: [], lastBriefId: null });
    expect(a).toBe(b);
  });

  it('is order-insensitive on positions', () => {
    const a = computeInputsHash({
      phases: {},
      openPositions: [{ symbol: 'EURUSD', direction: 'long' }, { symbol: 'NAS100', direction: 'short' }],
      lastBriefId: null,
    });
    const b = computeInputsHash({
      phases: {},
      openPositions: [{ symbol: 'NAS100', direction: 'short' }, { symbol: 'EURUSD', direction: 'long' }],
      lastBriefId: null,
    });
    expect(a).toBe(b);
  });
});

describe('isMaterialChange', () => {
  it('detects phase flip on watchlist as material', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULLISH_INDICATION' },
      currentPhases:  { EURUSD: 'BEARISH_NO_SETUP' },
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    expect(r.material).toBe(true);
    expect(r.triggers).toContain('phase_flip:EURUSD');
  });

  it('ignores phase flips off the watchlist', () => {
    const r = isMaterialChange({
      watchlist: ['XAUUSD'],
      previousPhases: { EURUSD: 'BULLISH_INDICATION' },
      currentPhases:  { EURUSD: 'BEARISH_NO_SETUP' },
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    expect(r.material).toBe(false);
  });

  it('treats alert fired as material', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULLISH_INDICATION' },
      currentPhases:  { EURUSD: 'BULLISH_INDICATION' },
      anyAlertFiredForUser: true,
      regimeFlipped: false,
    });
    expect(r.material).toBe(true);
    expect(r.triggers).toContain('alert');
  });

  it('treats regime flip as material', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULLISH_INDICATION' },
      currentPhases:  { EURUSD: 'BULLISH_INDICATION' },
      anyAlertFiredForUser: false,
      regimeFlipped: true,
    });
    expect(r.material).toBe(true);
    expect(r.triggers).toContain('regime_flip');
  });

  it('returns no triggers when nothing changed', () => {
    const r = isMaterialChange({
      watchlist: ['EURUSD'],
      previousPhases: { EURUSD: 'BULLISH_INDICATION' },
      currentPhases:  { EURUSD: 'BULLISH_INDICATION' },
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    expect(r.material).toBe(false);
    expect(r.triggers).toHaveLength(0);
  });
});

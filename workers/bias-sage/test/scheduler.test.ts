import { describe, it, expect } from 'vitest';
import { isWakeTimeNow } from '../src/scheduler.js';

describe('isWakeTimeNow', () => {
  it('returns true when now is exactly 06:30 UTC', () => {
    // 2024-05-02 06:30 UTC = unix 1714631400
    expect(isWakeTimeNow('UTC', 1714631400)).toBe(true);
  });

  it('returns true within ±2.5 min of 06:30', () => {
    expect(isWakeTimeNow('UTC', 1714631400 + 60)).toBe(true);  // 06:31
    expect(isWakeTimeNow('UTC', 1714631400 - 60)).toBe(true);  // 06:29
    expect(isWakeTimeNow('UTC', 1714631400 + 150)).toBe(true); // 06:32:30 — boundary
  });

  it('returns false outside ±2.5 min window', () => {
    expect(isWakeTimeNow('UTC', 1714631400 + 600)).toBe(false); // 06:40
    expect(isWakeTimeNow('UTC', 1714631400 - 600)).toBe(false); // 06:20
    expect(isWakeTimeNow('UTC', 1714631400 + 200)).toBe(false); // 06:33:20 — outside boundary
  });

  it('respects user tz: 06:30 America/New_York = 10:30 UTC on 2024-05-02', () => {
    // 2024-05-02 06:30 EDT (UTC-4) = 10:30 UTC = unix 1714645800
    expect(isWakeTimeNow('America/New_York', 1714645800)).toBe(true);
    // 06:30 UTC is NOT 06:30 EDT
    expect(isWakeTimeNow('America/New_York', 1714631400)).toBe(false);
  });

  it('handles tz where local 06:30 is yesterday or tomorrow in UTC', () => {
    // 2024-05-02 06:30 Asia/Tokyo (UTC+9) = 21:30 UTC on 2024-05-01 = 1714599000
    expect(isWakeTimeNow('Asia/Tokyo', 1714599000)).toBe(true);
  });
});

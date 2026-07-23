// Session-window helpers for the ORB engine.
//
// Two UTC sessions are tracked per asset:
//   London: 07:00 UTC open, 07:30 range formed, 12:00 UTC validity end
//   NY:     13:30 UTC open, 14:00 range formed, 20:00 UTC validity end
//
// "Relevance" marks whether a given session produces quality signals for
// the asset — gold and majors respect London + NY equally; indices (via
// QQQ/DIA ETF proxies) only really wake up on NY.

import type { OrbSession } from '@edgerelay/shared';
import type { AssetSpec } from '../bias/fetcher.js';

export interface SessionBounds {
  session: OrbSession;
  openUnix: number;          // session open moment on a given date
  rangeCloseUnix: number;    // +30 min — end of range-formation window
  validityEndUnix: number;   // signal hunt ends here
}

/** UTC 'YYYY-MM-DD' for a unix second timestamp. */
export function utcDateStr(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

/** Returns both session bounds for the UTC date of `nowUnix`. */
export function sessionBoundsFor(nowUnix: number): [SessionBounds, SessionBounds] {
  const d = new Date(nowUnix * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  const london: SessionBounds = {
    session: 'london',
    openUnix:        Math.floor(Date.UTC(y, m, day,  7,  0, 0) / 1000),
    rangeCloseUnix:  Math.floor(Date.UTC(y, m, day,  7, 30, 0) / 1000),
    validityEndUnix: Math.floor(Date.UTC(y, m, day, 12,  0, 0) / 1000),
  };
  const newyork: SessionBounds = {
    session: 'newyork',
    openUnix:        Math.floor(Date.UTC(y, m, day, 13, 30, 0) / 1000),
    rangeCloseUnix:  Math.floor(Date.UTC(y, m, day, 14,  0, 0) / 1000),
    validityEndUnix: Math.floor(Date.UTC(y, m, day, 20,  0, 0) / 1000),
  };
  return [london, newyork];
}

/** Which session, if any, is currently in its signal-hunt window? */
export function activeSession(nowUnix: number): OrbSession | null {
  const [london, ny] = sessionBoundsFor(nowUnix);
  // NY wins when both are open — indices and US session relevance dominate.
  if (nowUnix >= ny.rangeCloseUnix && nowUnix < ny.validityEndUnix) return 'newyork';
  if (nowUnix >= london.rangeCloseUnix && nowUnix < london.validityEndUnix) return 'london';
  return null;
}

/** Relevance of a session for a given asset category. Drives the quality
 *  grader's "session-suits-asset" criterion. */
export function sessionRelevanceFor(
  asset: Pick<AssetSpec, 'category'>,
  session: OrbSession,
): 'high' | 'medium' | 'low' {
  if (asset.category === 'Index') return session === 'newyork' ? 'high' : 'low';
  if (asset.category === 'Metal') return 'high';    // Gold responds to both
  // Forex majors: London is primary, NY is secondary
  if (asset.category === 'Forex') return session === 'london' ? 'high' : 'medium';
  return 'medium';
}

/** Active-session cron gate: run only when at least one session is in a
 *  window we care about (during range formation OR the validity window).
 *  The per-asset cron still runs every 15 min, but skips cheaply outside
 *  these windows. */
export function isCronWindow(nowUnix: number): boolean {
  const [london, ny] = sessionBoundsFor(nowUnix);
  return (
    (nowUnix >= london.openUnix && nowUnix < london.validityEndUnix) ||
    (nowUnix >= ny.openUnix && nowUnix < ny.validityEndUnix)
  );
}

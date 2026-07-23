// ORB endpoints — public, edge-cached. Mirror the shape of /v1/bias/* so
// the frontend can consume both engines with near-identical hooks.
//
//   GET /v1/orb                         → all assets, both sessions today
//   GET /v1/orb/:symbol                 → single asset, live state
//   GET /v1/orb/candles/:symbol         → M15 candles + today's range/signal overlays
//   GET /v1/orb/accuracy                → aggregate win rate across orb_history
//   GET /v1/orb/health                  → liveness

import { Hono } from 'hono';
import type {
  ApiResponse,
  OrbResponse,
  OrbCandlesPayload,
} from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS, loadCandlesForAsset } from '../bias/fetcher.js';
import { loadAssetState, loadAllAssetStates } from '../orb/runner.js';
import { sessionBoundsFor } from '../orb/sessionWindow.js';
import { scaleObject } from '../lib/displayScale.js';

export const orb = new Hono<{ Bindings: Env }>();

orb.get('/health', (c) => {
  return c.json<ApiResponse>({
    data: {
      status: 'ok',
      engine: 'orb-v1',
      assets: ASSETS.map((a) => a.key),
      sessions: ['london', 'newyork'],
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});

orb.get('/', async (c) => {
  if (!c.env.TWELVE_DATA_KEY) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'MISSING_API_KEY', message: 'TWELVE_DATA_KEY not configured' } },
      500,
    );
  }
  const nowUnix = Math.floor(Date.now() / 1000);
  const rawStates = await loadAllAssetStates(c.env, nowUnix);
  // Scale index proxies (DIA→DJI, QQQ→NDX) at the output boundary so
  // displayed levels match the user's MT5 broker quote scale.
  const states = rawStates.map((s) => scaleObject(s, s.symbol));

  const todaySignals = states.flatMap((s) => [s.todayLondon, s.todayNewyork].filter(Boolean));
  const fired = todaySignals.filter((s) => s!.signalType);
  const longs = fired.filter((s) => s!.signalType === 'long').length;
  const shorts = fired.filter((s) => s!.signalType === 'short').length;
  const aPlus = fired.filter((s) => s!.quality === 'A_PLUS').length;

  const payload: OrbResponse = {
    timestamp: new Date().toISOString(),
    timeframe: '15min',
    engine: 'orb-v1',
    assets: states,
    summary: {
      totalSignalsToday: fired.length,
      longsToday: longs,
      shortsToday: shorts,
      aPlusToday: aPlus,
    },
  };
  return new Response(JSON.stringify({ data: payload, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, max-age=30',
    },
  });
});

// /accuracy must come BEFORE /:symbol — Hono matches routes in
// registration order, so a bare /:symbol catchall would otherwise
// swallow /accuracy as a 404 "UNKNOWN_SYMBOL".
orb.get('/accuracy', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT symbol,
           COUNT(*) as total,
           SUM(CASE WHEN signal_type IS NOT NULL THEN 1 ELSE 0 END) as signals,
           SUM(CASE WHEN outcome IN ('tp1','tp2') THEN 1 ELSE 0 END) as wins,
           SUM(CASE WHEN outcome = 'sl' THEN 1 ELSE 0 END) as losses,
           SUM(CASE WHEN outcome = 'timeout' THEN 1 ELSE 0 END) as timeouts,
           AVG(r_multiple) as avg_r
    FROM orb_history
    WHERE signal_type IS NOT NULL
    GROUP BY symbol
  `).all<{ symbol: string; total: number; signals: number; wins: number; losses: number; timeouts: number; avg_r: number | null }>();

  const rows = results ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      signals: acc.signals + r.signals,
      wins: acc.wins + r.wins,
      losses: acc.losses + r.losses,
      timeouts: acc.timeouts + r.timeouts,
    }),
    { signals: 0, wins: 0, losses: 0, timeouts: 0 },
  );
  const verified = totals.wins + totals.losses;
  const winRate = verified > 0 ? Math.round((totals.wins / verified) * 1000) / 10 : 0;

  return new Response(JSON.stringify({
    data: {
      aggregate: { ...totals, verified, winRate, meaningful: verified >= 20 },
      perAsset: rows.map((r) => {
        const v = r.wins + r.losses;
        return {
          symbol: r.symbol,
          signals: r.signals,
          verified: v,
          wins: r.wins,
          losses: r.losses,
          timeouts: r.timeouts,
          winRate: v > 0 ? Math.round((r.wins / v) * 1000) / 10 : 0,
          avgR: r.avg_r !== null ? Math.round(r.avg_r * 100) / 100 : 0,
        };
      }),
    },
    error: null,
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=300, max-age=120' },
  });
});

orb.get('/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const spec = ASSETS.find((a) => a.key === symbol);
  if (!spec) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} not tracked` } },
      404,
    );
  }
  const state = await loadAssetState(c.env, spec, Math.floor(Date.now() / 1000));
  return c.json<ApiResponse>({ data: scaleObject(state, spec.key), error: null });
});

orb.get('/candles/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const spec = ASSETS.find((a) => a.key === symbol);
  if (!spec) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} not tracked` } },
      404,
    );
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const { candles } = await loadCandlesForAsset(spec, {
    apiKey: c.env.TWELVE_DATA_KEY!,
    kv: c.env.BOT_STATE,
    ttlSeconds: 900,
    outputSize: 200,
    interval: '15min',
  });

  const state = await loadAssetState(c.env, spec, nowUnix);
  const [london, ny] = sessionBoundsFor(nowUnix);
  // Trim candles to last 24h for the chart — wider time range than ORB
  // itself cares about so users see context around the session range.
  const since = nowUnix - 30 * 3600;
  const trimmed = candles.filter((r) => r.time >= since);

  const payload: OrbCandlesPayload = {
    symbol: spec.key,
    interval: '15min',
    candles: trimmed.map((r) => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close })),
    today: {
      london: state.todayLondon,
      newyork: state.todayNewyork,
    },
  };
  void london; void ny;  // used via loadAssetState

  // Scale index proxies for display (DIA→DJI, QQQ→NDX) so chart axis,
  // range rectangles and trade-plan price lines all render at MT5 scale.
  const scaled = scaleObject(payload, spec.key);

  return new Response(JSON.stringify({ data: scaled, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, max-age=30',
    },
  });
});

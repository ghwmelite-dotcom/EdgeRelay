// ICC 4H Market Bias — public endpoints.
//
//   GET /v1/bias           → all 5 tracked assets
//   GET /v1/bias/:symbol   → single asset
//   GET /v1/bias/health    → engine health
//
// Orchestration lives in src/bias/runner.ts so the scheduled() cron and
// the HTTP route share identical behavior.

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS } from '../bias/fetcher.js';
import { ICC_WEIGHTS } from '../bias/composite.js';
import { runBiasEngine, runBiasForSymbol } from '../bias/runner.js';
import { computeAccuracy } from '../bias/accuracy.js';
import { computeHighlights } from '../bias/highlights.js';
import { runBacktest, type BacktestParams, type EntryTrigger } from '../bias/backtest.js';
import { loadCandlesOverlay } from '../bias/candlesApi.js';
import { scaleObject } from '../lib/displayScale.js';

export const bias = new Hono<{ Bindings: Env }>();

bias.get('/health', (c) => {
  return c.json<ApiResponse>({
    data: {
      status: 'ok',
      engine: 'icc-bias-v1',
      assets: ASSETS.map((a) => a.key),
      weights: ICC_WEIGHTS,
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});

bias.get('/', async (c) => {
  if (!c.env.TWELVE_DATA_KEY) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'MISSING_API_KEY', message: 'TWELVE_DATA_KEY not configured' } },
      500,
    );
  }

  const payload = await runBiasEngine(c.env);
  // Scale index proxies (DIA→DJI, QQQ→NDX) per-asset so display levels
  // match the user's MT5 broker quote scale.
  const scaledAssets = (payload as { assets?: Array<{ symbol: string }> }).assets?.map(
    (a) => scaleObject(a, a.symbol),
  );
  const scaledPayload = scaledAssets ? { ...payload, assets: scaledAssets } : payload;

  return new Response(JSON.stringify({ data: scaledPayload, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, max-age=30',
    },
  });
});

// Backtest simulator — walks historical bias_history with user-provided params.
// Public; cached by request body hash implicitly via edge cache.
bias.post('/backtest', async (c) => {
  const body = await c.req.json().catch(() => null) as Partial<BacktestParams> | null;
  if (!body || !body.symbol) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_INPUT', message: 'symbol is required' } }, 400);
  }
  if (!ASSETS.find((a) => a.key === body.symbol?.toUpperCase())) {
    return c.json<ApiResponse>({ data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${body.symbol} not tracked` } }, 400);
  }

  const params: BacktestParams = {
    symbol: body.symbol.toUpperCase(),
    startingBalance: clamp(body.startingBalance ?? 10000, 100, 1_000_000),
    riskPercent: clamp(body.riskPercent ?? 1, 0.1, 5),
    stopLossPercent: clamp(body.stopLossPercent ?? 1.0, 0.1, 10),
    takeProfitR: clamp(body.takeProfitR ?? 2, 0.5, 10),
    timeStopHours: clamp(body.timeStopHours ?? 48, 4, 168),
    entryTrigger: (['continuation', 'indication', 'a_plus', 'any_tradeable'] as EntryTrigger[]).includes(body.entryTrigger as EntryTrigger)
      ? body.entryTrigger as EntryTrigger
      : 'continuation',
    maxConcurrentTrades: 1,
  };

  const data = await runBacktest(c.env, params);
  return c.json<ApiResponse>({ data, error: null });
});

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Engine-wide highlights — feeds the public /track-record page.
bias.get('/highlights', async (c) => {
  const data = await computeHighlights(c.env);
  return new Response(JSON.stringify({ data, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, max-age=120',
    },
  });
});

// Historical accuracy — all symbols, or a single one.
// Cached for 5 min on the edge since the backtest is O(n) per request.
bias.get('/accuracy', async (c) => {
  const data = await computeAccuracy(c.env, null);
  return new Response(JSON.stringify({ data, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, max-age=120',
    },
  });
});

bias.get('/accuracy/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  if (!ASSETS.find((a) => a.key === symbol)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} not tracked` } },
      404,
    );
  }
  const data = await computeAccuracy(c.env, symbol);
  return new Response(JSON.stringify({ data: data[symbol] ?? null, error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, max-age=120',
    },
  });
});

// Live candles + ICC overlay metadata for the chart on /bias/:symbol.
// Candles are pulled from the KV cache the cron also uses, so this endpoint
// never spends a Twelve Data request.
bias.get('/candles/:symbol/:interval', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const interval = c.req.param('interval') as '4h' | '1h';
  if (interval !== '4h' && interval !== '1h') {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_INPUT', message: 'interval must be 4h or 1h' } },
      400,
    );
  }
  if (!ASSETS.find((a) => a.key === symbol)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} not tracked` } },
      404,
    );
  }
  const data = await loadCandlesOverlay(c.env, symbol, interval);
  if (!data) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NO_DATA', message: 'Candles unavailable for this symbol/interval' } },
      503,
    );
  }
  return new Response(JSON.stringify({ data: scaleObject(data, symbol), error: null }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, max-age=30',
    },
  });
});

// Historical snapshot fetch — powers the "alert replay" banner. When a
// user clicks a push notification, the URL carries ?alert={captured_unix}
// so we can replay the exact state that fired the alert (not just the
// current live state, which may have already evolved past the transition).
bias.get('/snapshot/:symbol/:unix', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const unix = parseInt(c.req.param('unix'), 10);
  if (!ASSETS.find((a) => a.key === symbol)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} not tracked` } },
      404,
    );
  }
  if (!Number.isFinite(unix)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_INPUT', message: 'unix must be an integer' } },
      400,
    );
  }

  // Match the snapshot within a ±120s window of the requested timestamp
  // to absorb minor drift between the cron-recorded captured_unix and the
  // timestamp that ended up in the push URL.
  interface Row {
    symbol: string;
    interval: string;
    captured_at: string;
    captured_unix: number;
    phase: string;
    bias: string;
    price: number;
    score: number;
    snapshot_json: string | null;
  }
  const { results } = await c.env.DB.prepare(`
    SELECT symbol, interval, captured_at, captured_unix, phase, bias, price, score, snapshot_json
    FROM bias_history
    WHERE symbol = ?
      AND captured_unix BETWEEN ? AND ?
    ORDER BY ABS(captured_unix - ?) ASC, interval ASC
    LIMIT 5
  `).bind(symbol, unix - 120, unix + 120, unix).all<Row>();

  const rows = results ?? [];
  if (rows.length === 0) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'NOT_FOUND', message: 'No snapshot near that timestamp' } },
      404,
    );
  }

  // Prefer the 4h row if both are present at that moment (4h is the
  // primary trigger interval for alerts).
  const preferred = rows.find((r) => r.interval === '4h') ?? rows[0]!;
  let asset: unknown = null;
  try { asset = preferred.snapshot_json ? JSON.parse(preferred.snapshot_json) : null; }
  catch { /* leave null */ }

  return new Response(JSON.stringify({
    data: scaleObject({
      capturedAt: preferred.captured_at,
      capturedUnix: preferred.captured_unix,
      interval: preferred.interval,
      symbol: preferred.symbol,
      phase: preferred.phase,
      bias: preferred.bias,
      price: preferred.price,
      score: preferred.score,
      asset,
    }, preferred.symbol),
    error: null,
  }), {
    headers: {
      'Content-Type': 'application/json',
      // Historical rows are immutable — long cache is fine.
      'Cache-Control': 'public, s-maxage=3600, max-age=600',
    },
  });
});

bias.get('/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  if (!c.env.TWELVE_DATA_KEY) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'MISSING_API_KEY', message: 'TWELVE_DATA_KEY not configured' } },
      500,
    );
  }

  const asset = await runBiasForSymbol(symbol, c.env);
  if (!asset) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${symbol} is not tracked` } },
      404,
    );
  }
  return c.json<ApiResponse>({ data: scaleObject(asset, symbol), error: null });
});

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';

/**
 * ChartSage proxy — relays to the standalone ChartSage worker
 * (live XAU/USD + EUR/USD signal analyzer) with the shared secret
 * injected server-side, so the key never reaches the browser.
 * Mounted under protectedApp at /v1/chartsage (JWT required).
 */
const chartsage = new Hono<{ Bindings: Env }>();

const CHARTSAGE_BASE = 'https://chartsage.ghwmelite.workers.dev';

type JsonPayload = Record<string, unknown> | unknown[] | null;

async function relay(
  c: Context<{ Bindings: Env }>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!c.env.CHARTSAGE_API_KEY) {
    return c.json<ApiResponse>(
      {
        data: null,
        error: { code: 'NOT_CONFIGURED', message: 'ChartSage integration is not configured' },
      },
      503,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${CHARTSAGE_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': c.env.CHARTSAGE_API_KEY,
      },
    });
  } catch {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UPSTREAM_UNREACHABLE', message: 'ChartSage is unreachable' } },
      502,
    );
  }

  const payload = (await upstream.json().catch(() => null)) as JsonPayload;
  const upstreamError =
    payload && !Array.isArray(payload) && typeof payload.error === 'string'
      ? payload.error
      : null;

  if (!upstream.ok || upstreamError) {
    const status = (upstream.ok ? 502 : upstream.status) as 400;
    return c.json<ApiResponse>(
      {
        data: null,
        error: {
          code: 'CHARTSAGE_ERROR',
          message: upstreamError || `ChartSage returned ${upstream.status}`,
        },
      },
      status,
    );
  }

  return c.json<ApiResponse>({ data: payload, error: null });
}

// POST /chartsage/analyze-live { symbol: "XAUUSD" | "EURUSD" }
chartsage.post('/analyze-live', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { symbol?: string };
  return relay(c, '/analyze-live', {
    method: 'POST',
    body: JSON.stringify({ symbol: body.symbol ?? '' }),
  });
});

// POST /chartsage/analyze-crypto { symbol?: string } — top-15 scan when omitted
chartsage.post('/analyze-crypto', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { symbol?: string };
  return relay(c, '/analyze-crypto', {
    method: 'POST',
    body: JSON.stringify(body.symbol ? { symbol: body.symbol } : {}),
  });
});

// GET /chartsage/signals?limit=30
chartsage.get('/signals', (c) =>
  relay(c, `/signals?limit=${encodeURIComponent(c.req.query('limit') || '30')}`),
);

// GET /chartsage/stats?payout=80
chartsage.get('/stats', (c) =>
  relay(c, `/stats?payout=${encodeURIComponent(c.req.query('payout') || '80')}`),
);

export { chartsage };

// Twelve Data fetcher with per-symbol KV caching.
//
// Free tier is 800 req/day + 8 req/min. With 5 symbols refreshed every
// 15 minutes that is 5 × 4 = 20 req/hour = 480/day — well under the cap.
// KV read is effectively free and fast, so we cache the raw candle array
// per symbol and the analyzer reconstructs ICC state each request.

import type { Candle } from './swings.js';

export interface AssetSpec {
  key: string;       // Canonical symbol used by our API (e.g., "XAUUSD")
  tdSymbol: string;  // Symbol understood by Twelve Data
  label: string;
  category: 'Metal' | 'Index' | 'Forex';
  decimals: number;
  exchange?: string;
}

// Note on index symbols: Twelve Data's free tier gates NDX / DJI behind the
// Grow plan. We use ETF proxies (QQQ → Nasdaq 100, DIA → Dow 30) which
// track the underlying indices closely. ICC reads swing structure, so
// absolute price level is irrelevant — only shape matters.
export const ASSETS: AssetSpec[] = [
  { key: 'XAUUSD', tdSymbol: 'XAU/USD', label: 'Gold',       category: 'Metal', decimals: 2 },
  { key: 'NAS100', tdSymbol: 'QQQ',     label: 'Nasdaq 100', category: 'Index', decimals: 2 },
  { key: 'US30',   tdSymbol: 'DIA',     label: 'Dow Jones',  category: 'Index', decimals: 2 },
  { key: 'EURUSD', tdSymbol: 'EUR/USD', label: 'EUR/USD',    category: 'Forex', decimals: 5 },
  { key: 'GBPUSD', tdSymbol: 'GBP/USD', label: 'GBP/USD',    category: 'Forex', decimals: 5 },
];

interface TwelveDataValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}
interface TwelveDataResponse {
  meta?: { symbol: string; interval: string; type?: string };
  values?: TwelveDataValue[];
  status?: string;
  code?: number;
  message?: string;
}

export type BiasInterval = '4h' | '1h' | '15min';

export interface FetcherDeps {
  apiKey: string;
  kv: KVNamespace;
  /** TTL in seconds for cached candles. */
  ttlSeconds?: number;
  /** Number of candles to request. Default 150. */
  outputSize?: number;
  /** Timeframe to fetch. Default 4h. */
  interval?: BiasInterval;
  /** Inject for tests. */
  fetchImpl?: typeof fetch;
}

interface CacheEntry {
  candles: Candle[];
  fetchedAt: number;
}

export async function loadCandlesForAsset(
  asset: AssetSpec,
  deps: FetcherDeps,
): Promise<{ candles: Candle[]; stale: boolean; fetchedAt: number }> {
  const ttl = deps.ttlSeconds ?? 900;
  const interval = deps.interval ?? '4h';
  const cacheKey = `bias:candles:${asset.key}:${interval}`;

  const cachedRaw = await deps.kv.get(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CacheEntry;
      const ageSec = (Date.now() - cached.fetchedAt) / 1000;
      if (ageSec < ttl && Array.isArray(cached.candles) && cached.candles.length > 0) {
        return { candles: cached.candles, stale: false, fetchedAt: cached.fetchedAt };
      }
      // Expired but usable as a fallback if the live fetch fails
      const live = await fetchLive(asset, deps).catch(() => null);
      if (!live) return { candles: cached.candles, stale: true, fetchedAt: cached.fetchedAt };
      await writeCache(cacheKey, live, deps.kv, ttl);
      return { candles: live, stale: false, fetchedAt: Date.now() };
    } catch {
      // fall through to live fetch
    }
  }

  const live = await fetchLive(asset, deps);
  await writeCache(cacheKey, live, deps.kv, ttl);
  return { candles: live, stale: false, fetchedAt: Date.now() };
}

async function writeCache(key: string, candles: Candle[], kv: KVNamespace, ttl: number) {
  const payload: CacheEntry = { candles, fetchedAt: Date.now() };
  // Add a generous expirationTtl so stale-but-usable entries stick around
  // briefly if Twelve Data is down when the ttl window lapses.
  await kv.put(key, JSON.stringify(payload), { expirationTtl: Math.max(ttl * 6, 3600) });
}

async function fetchLive(asset: AssetSpec, deps: FetcherDeps): Promise<Candle[]> {
  const size = deps.outputSize ?? 150;
  const interval = deps.interval ?? '4h';
  const fetchFn = deps.fetchImpl ?? fetch;
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', asset.tdSymbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', String(size));
  url.searchParams.set('apikey', deps.apiKey);
  url.searchParams.set('order', 'ASC');
  if (asset.exchange) url.searchParams.set('exchange', asset.exchange);

  const res = await fetchFn(url.toString(), {
    headers: { 'accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Twelve Data HTTP ${res.status} for ${asset.tdSymbol}`);
  }
  const json = (await res.json()) as TwelveDataResponse;
  if (json.status === 'error' || !json.values) {
    throw new Error(`Twelve Data: ${json.message ?? 'no values'} for ${asset.tdSymbol}`);
  }
  // Sanity: Twelve Data sometimes returns DESC despite order=ASC — re-sort.
  const candles: Candle[] = json.values
    .map(parseCandle)
    .filter((c): c is Candle => c !== null)
    .sort((a, b) => a.time - b.time);

  return candles;
}

function parseCandle(v: TwelveDataValue): Candle | null {
  const time = Date.parse(v.datetime);
  const open = Number(v.open);
  const high = Number(v.high);
  const low  = Number(v.low);
  const close = Number(v.close);
  if (!Number.isFinite(time) || !Number.isFinite(open) || !Number.isFinite(high) ||
      !Number.isFinite(low) || !Number.isFinite(close)) return null;
  return {
    time: Math.floor(time / 1000),
    open, high, low, close,
    volume: v.volume ? Number(v.volume) : undefined,
  };
}

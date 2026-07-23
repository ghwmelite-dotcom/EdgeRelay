// Display-scale helpers for indices.
//
// Twelve Data's free tier gates DJI / NDX behind the Grow plan, so we use
// ETF proxies (DIA → DJI, QQQ → NDX). The proxies track the underlying
// indices closely (DIA ≈ DJI/100, QQQ ≈ NDX/40) but quote at the ETF's
// share-price scale, NOT the index point scale that MT5 brokers display.
//
// To stop confusing users (and to make levels copy-pasteable into an MT5
// order ticket), we scale prices at every public-facing boundary:
//   • API responses (bias + orb routes)
//   • Telegram alert text
//   • Web Push payloads
//   • Inbox row reads
//
// Internal storage (orb_history, bias_history, candles cache) stays in
// proxy units — outcome resolution, RR math, ATR computations, etc. all
// run on the raw feed. Scaling is a presentation concern.
//
// Tracking-error caveat: the proxy → index ratio drifts ~0.5% over time
// (DIA holdings rebalance, ETF distributions, tracking error). Scaled
// prices are accurate enough for orientation and for "drop to 15M/5M
// for execution" workflows, NOT for direct order placement off the
// scaled level. Surfaces should show ≈ when isScaled() is true.

const SCALES: Record<string, number> = {
  US30:   100,  // DIA × 100 ≈ DJI
  NAS100:  40,  // QQQ × 40 ≈ NDX (less precise than DIA→DJI; ratio is ~38–42)
};

export function scaleForDisplay(symbol: string): number {
  if (!symbol) return 1;
  return SCALES[symbol.toUpperCase()] ?? 1;
}

export function isScaled(symbol: string): boolean {
  return scaleForDisplay(symbol) !== 1;
}

/** Scale a single price value (no-op for non-index symbols). */
export function scalePrice<T extends number | null | undefined>(price: T, symbol: string): T {
  if (price === null || price === undefined) return price;
  const s = scaleForDisplay(symbol);
  return (s === 1 ? price : (price as number) * s) as T;
}

/** Scale every numeric field whose name suggests it is a price.
 *  Uses heuristic field-name matching so we don't have to enumerate
 *  every payload schema. Pct/ratio fields are explicitly skipped. */
const PRICE_FIELD_NAMES = new Set([
  'entry', 'stopLoss', 'takeProfit1', 'takeProfit2',
  'signalPrice', 'high', 'low', 'open', 'close',
  'rangeHigh', 'rangeLow', 'price', 'breakHigh', 'breakLow',
  'currentPrice', 'lastPrice', 'fibHigh', 'fibLow',
]);

const SKIP_FIELD_NAMES = new Set([
  'slDistancePct', 'tp1DistancePct', 'tp2DistancePct',
  'rangePct', 'rMultiple', 'r_multiple', 'atr', 'rangeAtr',
  'time', 'timestamp', 'volume', 'metCount', 'totalCount',
]);

export function scaleObject<T>(obj: T, symbol: string): T {
  if (!isScaled(symbol)) return obj;
  return scaleObjectRecursive(obj, scaleForDisplay(symbol)) as T;
}

function scaleObjectRecursive(value: unknown, factor: number): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => scaleObjectRecursive(v, factor));
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SKIP_FIELD_NAMES.has(k)) {
      out[k] = v;
    } else if (typeof v === 'number' && PRICE_FIELD_NAMES.has(k)) {
      out[k] = v * factor;
    } else if (typeof v === 'object' && v !== null) {
      out[k] = scaleObjectRecursive(v, factor);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Format a price for display, with `≈` prefix on scaled symbols. */
export function formatScaledPrice(price: number, symbol: string, dp = 2): string {
  const scaled = scalePrice(price, symbol);
  const rounded = Math.round(scaled * 10 ** dp) / 10 ** dp;
  return isScaled(symbol) ? `≈${rounded}` : `${rounded}`;
}

// Runs the full bias pipeline (fetch → analyze → compose) for every tracked
// asset. Shared by the HTTP route (/v1/bias) and the scheduled() cron
// handler so they can't drift.

import type { AssetBias, BiasResponse, BiasSentiment } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS, loadCandlesForAsset, type AssetSpec } from './fetcher.js';
import { analyzeAsset, analyzeAssetMultiTF, ICC_WEIGHTS } from './composite.js';
import { hydrateNarratives } from './narrative.js';

export interface RunBiasOptions {
  /** KV cache TTL, seconds. Defaults to 15 min for cron cadence. */
  ttlSeconds?: number;
  /** Candle count per asset. */
  outputSize?: number;
  /** Also fetch 1H candles and emit dual-TF confluence. Default true. */
  includeOneHour?: boolean;
}

export async function runBiasEngine(
  env: Env,
  options: RunBiasOptions = {},
): Promise<BiasResponse> {
  const apiKey = env.TWELVE_DATA_KEY;
  if (!apiKey) throw new Error('TWELVE_DATA_KEY not configured');

  const assets = await Promise.all(
    ASSETS.map((spec) =>
      analyzeOne(spec, env, apiKey, options).catch((e) => errorAsset(spec, e)),
    ),
  );

  // Attach the cron-cached AI narratives where available
  await hydrateNarratives(env, assets);

  return {
    timestamp: new Date().toISOString(),
    timeframe: '4H',
    engine: 'icc-bias-v1',
    method: 'Indication-Correction-Continuation',
    weights: ICC_WEIGHTS,
    sentiment: computeSentiment(assets),
    assets,
  };
}

export async function runBiasForSymbol(
  symbol: string,
  env: Env,
  options: RunBiasOptions = {},
): Promise<AssetBias | null> {
  const spec = ASSETS.find((a) => a.key === symbol.toUpperCase());
  if (!spec) return null;
  if (!env.TWELVE_DATA_KEY) throw new Error('TWELVE_DATA_KEY not configured');
  try {
    const asset = await analyzeOne(spec, env, env.TWELVE_DATA_KEY, options);
    await hydrateNarratives(env, [asset]);
    return asset;
  } catch (err) {
    return errorAsset(spec, err);
  }
}

async function analyzeOne(
  spec: AssetSpec,
  env: Env,
  apiKey: string,
  options: RunBiasOptions,
): Promise<AssetBias> {
  const includeOneHour = options.includeOneHour !== false;

  const load4h = loadCandlesForAsset(spec, {
    apiKey,
    kv: env.BOT_STATE,
    ttlSeconds: options.ttlSeconds ?? 900,
    outputSize: options.outputSize ?? 150,
    interval: '4h',
  });

  if (!includeOneHour) {
    const { candles } = await load4h;
    return analyzeAsset({ symbol: spec.key, label: spec.label, category: spec.category, candles });
  }

  // 1H: match the 4H cache TTL to stay inside Twelve Data's 800/day free
  // cap (10 reqs/cycle × 15-min cron = 960/day would be too close). 200
  // candles = ~8 days which is plenty for the 1H analyzer to find swings.
  const load1h = loadCandlesForAsset(spec, {
    apiKey,
    kv: env.BOT_STATE,
    ttlSeconds: options.ttlSeconds ?? 900,
    outputSize: 200,
    interval: '1h',
  }).catch(() => null); // 1H is a nice-to-have; 4H must work

  const [{ candles: candles4h }, result1h] = await Promise.all([load4h, load1h]);

  if (!result1h) {
    return analyzeAsset({ symbol: spec.key, label: spec.label, category: spec.category, candles: candles4h });
  }

  return analyzeAssetMultiTF(
    { symbol: spec.key, label: spec.label, category: spec.category, candles: candles4h },
    result1h.candles,
  );
}

function errorAsset(spec: AssetSpec, err: unknown): AssetBias {
  const message = err instanceof Error ? err.message : 'Unknown error';
  return {
    symbol: spec.key,
    label: spec.label,
    category: spec.category,
    price: 0,
    change24h: 0,
    bias: 'NEUTRAL',
    score: 0,
    confidence: 0,
    tradeable: false,
    sparkData: [],
    error: message,
    icc: {
      marketState: { score: 0, state: 'CONSOLIDATION', swingSequence: 'unavailable', tradeable: false },
      phase:       { score: 0, current: 'NO_SETUP', detail: `Data unavailable: ${message}`, indicationLevel: null, correctionDepth: null, entryReady: false },
      structure:   { score: 0, keyLevels: { lastSwingHigh: null, lastSwingLow: null, previousSwingHigh: null, previousSwingLow: null }, recentBreaks: [] },
      correction:  { score: 0, impulseRange: null, currentDepth: null, inOptimalZone: false, zone: 'N/A', retracementLevels: null },
      session:     { score: 0, active: 'Off-Hours', momentum: 'Indecisive', relevance: 'Low', recentCandleProfile: '' },
    },
  };
}

function computeSentiment(assets: AssetBias[]): BiasSentiment {
  const bullish = assets.filter((a) => a.bias === 'BULLISH').length;
  const bearish = assets.filter((a) => a.bias === 'BEARISH').length;
  const neutral = assets.filter((a) => a.bias === 'NEUTRAL').length;

  let overall: BiasSentiment['overall'];
  if (bullish >= 3 && bullish > bearish) overall = 'RISK-ON';
  else if (bearish >= 3 && bearish > bullish) overall = 'RISK-OFF';
  else overall = 'MIXED';

  return { bullish, bearish, neutral, overall };
}

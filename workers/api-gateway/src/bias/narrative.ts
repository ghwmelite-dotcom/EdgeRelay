// Workers-AI–generated one-sentence plain-English read per asset.
//
// Generated inside the 15-min cron so the HTTP route just reads from KV —
// zero AI cost on user request. Gracefully degrades: if the AI call fails
// or times out, we fall back to a deterministic template.

import type { AssetBias } from '@edgerelay/shared';
import type { Env } from '../types.js';

const KV_TTL_SECONDS = 60 * 30; // 30 min — survives one missed cron tick
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function narrativeKey(symbol: string): string {
  return `bias:narrative:${symbol}`;
}

/** Reads whatever the cron last cached for this symbol. Non-blocking. */
export async function readNarrative(env: Env, symbol: string): Promise<string | null> {
  return env.BOT_STATE.get(narrativeKey(symbol));
}

/** Generates + caches a narrative. Safe to call — always resolves. */
export async function generateNarrative(env: Env, asset: AssetBias): Promise<string> {
  const fallback = deterministicNarrative(asset);

  if (!env.AI) {
    await env.BOT_STATE.put(narrativeKey(asset.symbol), fallback, { expirationTtl: KV_TTL_SECONDS });
    return fallback;
  }

  const prompt = buildPrompt(asset);

  try {
    const aiResponse = await env.AI.run(
      MODEL as Parameters<typeof env.AI.run>[0],
      {
        messages: [
          {
            role: 'system',
            content:
              'You are an ICC (Indication-Correction-Continuation) trading analyst. Reply with ONE sentence (max 30 words), plain English, calm and factual. No emojis. No hedging ("might", "could"). No financial advice. Describe the current 4H state using the exact data given. Never invent numbers. If the asset is consolidating or has no setup, say that clearly.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 120,
        temperature: 0.4,
      },
    );

    const raw = (aiResponse as { response?: string })?.response ?? '';
    const clean = sanitize(raw);

    if (clean.length < 15 || clean.length > 300) {
      await env.BOT_STATE.put(narrativeKey(asset.symbol), fallback, { expirationTtl: KV_TTL_SECONDS });
      return fallback;
    }

    await env.BOT_STATE.put(narrativeKey(asset.symbol), clean, { expirationTtl: KV_TTL_SECONDS });
    return clean;
  } catch (err) {
    console.error(`[bias-narrative] AI failed for ${asset.symbol}:`, err);
    await env.BOT_STATE.put(narrativeKey(asset.symbol), fallback, { expirationTtl: KV_TTL_SECONDS });
    return fallback;
  }
}

/** Hydrates an array of assets with their cached narratives (best-effort). */
export async function hydrateNarratives<T extends { symbol: string; narrative?: string }>(
  env: Env,
  assets: T[],
): Promise<T[]> {
  await Promise.all(
    assets.map(async (a) => {
      const cached = await readNarrative(env, a.symbol);
      if (cached) a.narrative = cached;
    }),
  );
  return assets;
}

// ── helpers ────────────────────────────────────────────────────

function buildPrompt(a: AssetBias): string {
  const lines: string[] = [];
  lines.push(`Asset: ${a.symbol} (${a.label}, ${a.category})`);
  lines.push(`Current price: ${a.price}`);
  lines.push(`4H bias: ${a.bias} (score ${a.score}, confidence ${a.confidence}%)`);
  lines.push(`4H market state: ${a.icc.marketState.state}`);
  lines.push(`4H phase: ${a.icc.phase.current}`);
  if (a.icc.phase.indicationLevel !== null) lines.push(`Indication level: ${a.icc.phase.indicationLevel}`);
  if (a.icc.correction.currentDepth !== null) lines.push(`Correction depth: ${a.icc.correction.currentDepth}% (${a.icc.correction.zone})`);
  if (a.bias1H) lines.push(`1H bias: ${a.bias1H} (score ${a.score1H})`);
  if (a.confluence?.aligned) lines.push(`4H + 1H CONFLUENCE: yes (A+ setup)`);
  lines.push(`Session: ${a.icc.session.active}, momentum ${a.icc.session.momentum}`);
  lines.push('');
  lines.push('Write ONE sentence describing this state for a trader scanning the page.');
  return lines.join('\n');
}

function deterministicNarrative(a: AssetBias): string {
  if (a.icc.marketState.state === 'CONSOLIDATION') {
    return `${a.symbol} is consolidating on 4H with no clean structure — ICC says wait for a break before looking for entries.`;
  }
  if (a.icc.phase.current === 'NO_SETUP') {
    return `${a.symbol} shows a ${a.icc.marketState.state.toLowerCase()} on 4H but no active ICC setup yet.`;
  }
  const trendWord = a.bias === 'BULLISH' ? 'upside' : a.bias === 'BEARISH' ? 'downside' : 'mixed';
  if (a.icc.phase.current === 'INDICATION') {
    return `${a.symbol} just printed a ${a.bias.toLowerCase()} Indication on 4H — wait for the correction to finish before entering.`;
  }
  if (a.icc.phase.current === 'CORRECTION') {
    const depth = a.icc.correction.currentDepth;
    return `${a.symbol} is in a 4H correction (${depth ?? '?'}% retraced) within the ${trendWord} impulse — let the pullback complete.`;
  }
  // CONTINUATION
  const conf = a.confluence?.aligned ? ' with full 4H+1H confluence' : '';
  return `${a.symbol} 4H is in continuation${conf} — the entry window toward ${trendWord} is live.`;
}

function sanitize(s: string): string {
  return s
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)[0]!  // first sentence only
    .slice(0, 300);
}

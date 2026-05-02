import type { Env } from './types.js';
import { ICC_WATCHLIST, buildPromptInputs } from './inputs.js';
import { dayKey, getAnchor, putAnchor } from './cache.js';
import { buildAnchorMessages } from './prompt.js';
import { buildDeltaMessages } from './deltaPrompt.js';
import { callSageStream } from './llm.js';
import { parseSageResponse } from './intentParser.js';
import { computeInputsHash, isMaterialChange } from './materiality.js';
import { generateDelta } from './deltaHandler.js';

const WAKE_HOUR = 6;
const WAKE_MIN = 30;
const WAKE_WINDOW_SEC = 150; // ±2.5 min

export function isWakeTimeNow(timezone: string, nowUnix: number): boolean {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(nowUnix * 1000));
  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const mm = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  const nowSec = hh * 3600 + mm * 60;
  const wakeSec = WAKE_HOUR * 3600 + WAKE_MIN * 60;
  let diff = Math.abs(nowSec - wakeSec);
  if (diff > 43200) diff = 86400 - diff;
  return diff <= WAKE_WINDOW_SEC;
}

interface UserRow {
  id: string;
  timezone: string | null;
}

/**
 * Scans active users (those with at least one account); for each user whose
 * local time is currently inside the wake-time window, pre-generates the anchor
 * brief in the background. Idempotent — getAnchor short-circuits if already cached.
 */
export async function runWakeTimeScan(env: Env, now: number, ctx: ExecutionContext): Promise<void> {
  const users = await loadActiveUsers(env);
  for (const u of users) {
    const tz = u.timezone ?? 'UTC';
    if (!isWakeTimeNow(tz, now)) continue;
    ctx.waitUntil(
      pregenerateAnchor(env, u.id, now).catch((e) =>
        console.error('anchor pregen failed', u.id, (e as Error).message),
      ),
    );
  }
}

/**
 * Materiality runner. Diffs current bias-engine state against the last snapshot
 * stored in KV. For each user whose watchlist intersects flipped symbols, gates
 * via generateDelta and (when greenlit) does the actual LLM call + cache write.
 */
export async function runDeltaScan(env: Env, now: number, ctx: ExecutionContext): Promise<void> {
  const placeholders = ICC_WATCHLIST.map(() => '?').join(',');
  const currentRows =
    (
      await env.DB.prepare(
        `SELECT h.symbol, (h.bias || '_' || h.phase) AS phase
         FROM bias_history h
         JOIN (
           SELECT symbol, MAX(captured_unix) AS max_ts
           FROM bias_history
           WHERE symbol IN (${placeholders}) AND interval = '4h'
           GROUP BY symbol
         ) latest ON h.symbol = latest.symbol AND h.captured_unix = latest.max_ts`,
      )
        .bind(...ICC_WATCHLIST)
        .all<{ symbol: string; phase: string }>()
    ).results ?? [];

  const currentPhases: Record<string, string> = Object.fromEntries(
    currentRows.map((r) => [r.symbol, r.phase]),
  );

  const prevRaw = await env.BIAS_SAGE.get('phases:last_scan');
  const previousPhases: Record<string, string> = prevRaw ? safeParse(prevRaw) : {};
  await env.BIAS_SAGE.put('phases:last_scan', JSON.stringify(currentPhases));

  const flipped = Object.keys(currentPhases).filter(
    (s) => previousPhases[s] && previousPhases[s] !== currentPhases[s],
  );
  if (flipped.length === 0) return;

  const users = await loadActiveUsers(env);
  for (const u of users) {
    const r = isMaterialChange({
      watchlist: [...ICC_WATCHLIST],
      previousPhases,
      currentPhases,
      anyAlertFiredForUser: false,
      regimeFlipped: false,
    });
    if (!r.material) continue;
    const hash = computeInputsHash({
      phases: currentPhases,
      openPositions: [],
      lastBriefId: null,
    });
    ctx.waitUntil(
      (async () => {
        const decision = await generateDelta(env, u.id, r.triggers, hash, now);
        if (decision.generated) {
          await runDeltaGeneration(env, u.id, r.triggers, hash, now);
        }
      })().catch((e) => console.error('delta gen failed', u.id, (e as Error).message)),
    );
  }
}

async function loadActiveUsers(env: Env): Promise<UserRow[]> {
  const rows =
    (
      await env.DB.prepare(
        `SELECT u.id, p.timezone
         FROM users u
         LEFT JOIN notification_preferences p ON p.user_id = u.id
         WHERE EXISTS (SELECT 1 FROM accounts WHERE user_id = u.id)`,
      ).all<UserRow>()
    ).results ?? [];
  return rows;
}

async function pregenerateAnchor(env: Env, userId: string, now: number): Promise<void> {
  const day = dayKey(now);
  if (await getAnchor(env, userId, day)) return;

  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildAnchorMessages(inputs);
  let full = '';
  for await (const chunk of callSageStream(messages, {
    ai: env.AI,
    model: env.SAGE_MODEL,
  })) {
    if (chunk.type === 'text' && chunk.text) full += chunk.text;
  }
  const parsed = parseSageResponse(full);
  if (parsed.kind !== 'ok') return;
  await putAnchor(env, userId, day, {
    briefMd: parsed.briefMd,
    intentJson: JSON.stringify(parsed.intent),
    level: inputs.level,
    generatedAt: now,
  });
}

async function runDeltaGeneration(
  env: Env,
  userId: string,
  triggers: string[],
  inputsHash: string,
  now: number,
): Promise<void> {
  const day = dayKey(now);
  const anchor = await getAnchor(env, userId, day);
  if (!anchor) return; // no anchor → no delta context

  const inputs = await buildPromptInputs(env, userId, now);
  const messages = buildDeltaMessages({
    ...inputs,
    anchorBriefMd: anchor.briefMd,
    triggers,
  });
  let full = '';
  for await (const chunk of callSageStream(messages, {
    ai: env.AI,
    model: env.SAGE_MODEL,
    maxTokens: 250,
  })) {
    if (chunk.type === 'text' && chunk.text) full += chunk.text;
  }
  // Reuse the anchor parser by retagging delta → brief
  const parsed = parseSageResponse(
    full.replace('<delta>', '<brief>').replace('</delta>', '</brief>'),
  );
  if (parsed.kind !== 'ok') return;

  const countKey = `delta:count:${userId}:${day}`;
  const countRaw = await env.BIAS_SAGE.get(countKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  await env.BIAS_SAGE.put(
    `delta:${userId}:${day}`,
    JSON.stringify({
      briefMd: parsed.briefMd,
      intentJson: JSON.stringify(parsed.intent),
      generatedAt: now,
      inputsHash,
    }),
    { expirationTtl: 24 * 60 * 60 },
  );
  await env.BIAS_SAGE.put(countKey, String(count + 1), { expirationTtl: 36 * 60 * 60 });
}

function safeParse(raw: string): Record<string, string> {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, string>;
  } catch {
    // fall through
  }
  return {};
}

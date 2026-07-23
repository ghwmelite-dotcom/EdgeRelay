// Scheduled runner that fires every 15 minutes.
//
// Per cron tick:
//   1. Run the dual-TF bias engine (4H + 1H analysis in one pass).
//   2. Detect phase transitions independently on 4H and 1H by comparing to
//      the most recent row of the same interval in bias_history.
//   3. Persist fresh snapshots for BOTH intervals to bias_history.
//   4. Fire Telegram alerts to opted-in users for each transition.
//      Message is tagged with the timeframe so the user knows which window
//      flipped. A+ flag shown when both timeframes align on the same phase
//      direction.
//   5. Broadcast any A+ SETUP (4H+1H confluence) to the public TG channel
//      if PUBLIC_ALERT_CHAT_ID is configured — builds public audience.

import { sendTelegramMessage, computeAlertQuality } from '@edgerelay/shared';
import type { AssetBias, ICCPhaseKind, ICCBreakdown } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { runBiasEngine } from './runner.js';
import { generateNarrative } from './narrative.js';
import { sendWebPush, type PushSubscription } from './webpush.js';
import { scalePrice, isScaled } from '../lib/displayScale.js';

type Interval = '4h' | '1h';

interface PriorRow {
  symbol: string;
  interval: Interval;
  phase: string;
  bias: string;
  captured_unix: number;
}

interface AlertPrefRow {
  user_id: string;
  alert_on_indication: number;
  alert_on_correction: number;
  alert_on_continuation: number;
  alert_on_consolidation: number;
}

interface TelegramLink {
  user_id: string;
  chat_id: string;
}

interface Transition {
  asset: AssetBias;
  interval: Interval;
  previousPhase: ICCPhaseKind;
  currentPhase: ICCPhaseKind;
  icc: ICCBreakdown;
}

export async function runBiasCron(env: Env, ctx: ExecutionContext): Promise<void> {
  if (!env.TWELVE_DATA_KEY) {
    console.warn('[bias-cron] TWELVE_DATA_KEY not set — skipping');
    return;
  }

  const start = Date.now();
  const response = await runBiasEngine(env);
  const assets = response.assets;

  // Prior snapshots (one per symbol × interval)
  const prior = await loadPriorRows(env, assets.map((a) => a.symbol));

  // Collect transitions on both timeframes.
  const transitions: Transition[] = [];
  for (const asset of assets) {
    if (asset.error) continue;

    const prior4h = prior.get(key(asset.symbol, '4h'));
    if (prior4h && prior4h.phase !== asset.icc.phase.current) {
      transitions.push({
        asset,
        interval: '4h',
        previousPhase: prior4h.phase as ICCPhaseKind,
        currentPhase: asset.icc.phase.current,
        icc: asset.icc,
      });
    }

    if (asset.icc1H) {
      const prior1h = prior.get(key(asset.symbol, '1h'));
      if (prior1h && prior1h.phase !== asset.icc1H.phase.current) {
        transitions.push({
          asset,
          interval: '1h',
          previousPhase: prior1h.phase as ICCPhaseKind,
          currentPhase: asset.icc1H.phase.current,
          icc: asset.icc1H,
        });
      }
    }
  }

  ctx.waitUntil(persistSnapshots(env, assets));
  ctx.waitUntil(regenerateNarratives(env, assets));

  if (transitions.length > 0) {
    ctx.waitUntil(dispatchAlerts(env, transitions));
  }
  ctx.waitUntil(broadcastAPlusSetups(env, assets));

  console.log(
    `[bias-cron] ${assets.length} assets · ${transitions.length} transitions in ${Date.now() - start}ms`,
  );
}

// ── prior-row lookup (both intervals in one query) ────────────

function key(symbol: string, interval: Interval): string {
  return `${symbol}:${interval}`;
}

async function loadPriorRows(env: Env, symbols: string[]): Promise<Map<string, PriorRow>> {
  const out = new Map<string, PriorRow>();
  if (symbols.length === 0) return out;

  const placeholders = symbols.map(() => '?').join(',');
  const sql = `
    SELECT symbol, interval, phase, bias, captured_unix
    FROM (
      SELECT symbol, interval, phase, bias, captured_unix,
             ROW_NUMBER() OVER (PARTITION BY symbol, interval ORDER BY captured_unix DESC) AS rn
      FROM bias_history
      WHERE symbol IN (${placeholders})
    )
    WHERE rn = 1
  `;
  const { results } = await env.DB.prepare(sql).bind(...symbols).all<PriorRow>();
  for (const r of results ?? []) {
    out.set(key(r.symbol, r.interval as Interval), r);
  }
  return out;
}

// ── AI narrative regeneration ──────────────────────────────────

async function regenerateNarratives(env: Env, assets: AssetBias[]): Promise<void> {
  await Promise.all(
    assets
      .filter((a) => !a.error)
      .map((a) => generateNarrative(env, a).catch(() => { /* logged inside */ })),
  );
}

// ── persistence ───────────────────────────────────────────────

async function persistSnapshots(env: Env, assets: AssetBias[]): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const insert = env.DB.prepare(`
    INSERT INTO bias_history (
      symbol, interval, captured_unix,
      price, score, bias, confidence, tradeable,
      market_state, phase, indication_level, correction_depth,
      snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch: D1PreparedStatement[] = [];

  for (const a of assets) {
    if (a.error) continue;

    // 4H row — always written as long as we have a valid 4H read.
    batch.push(
      insert.bind(
        a.symbol, '4h', now,
        a.price, a.score, a.bias, a.confidence, a.tradeable ? 1 : 0,
        a.icc.marketState.state, a.icc.phase.current,
        a.icc.phase.indicationLevel, a.icc.phase.correctionDepth,
        JSON.stringify(a),
      ),
    );

    // 1H row — written only when the engine returned a 1H analysis.
    if (a.icc1H && a.bias1H !== undefined && a.score1H !== undefined) {
      batch.push(
        insert.bind(
          a.symbol, '1h', now,
          a.price, a.score1H, a.bias1H, a.confidence /* reuse — interval-specific confidence isn't separately surfaced yet */, 0,
          a.icc1H.marketState.state, a.icc1H.phase.current,
          a.icc1H.phase.indicationLevel, a.icc1H.phase.correctionDepth,
          // Keep snapshot_json as the full AssetBias — it already contains both TFs
          JSON.stringify(a),
        ),
      );
    }
  }

  if (batch.length === 0) return;
  await env.DB.batch(batch);
}

// ── alerts ────────────────────────────────────────────────────

async function dispatchAlerts(env: Env, transitions: Transition[]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('[bias-cron] TELEGRAM_BOT_TOKEN not set — skipping alerts');
    return;
  }

  for (const tr of transitions) {
    const alertKey = alertPrefColumn(tr.currentPhase);
    if (!alertKey) continue;

    // Dedup per symbol × interval × phase × minute
    const dedupKey = `bias-alert:${tr.asset.symbol}:${tr.interval}:${tr.currentPhase}:${Math.floor(Date.now() / 60000)}`;
    const already = await env.BOT_STATE.get(dedupKey);
    if (already) continue;
    await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 600 });

    const prefs = await loadOptedInUsers(env, tr.asset.symbol, alertKey);
    if (prefs.length === 0) continue;

    const userIds = prefs.map((p) => p.user_id);
    const chatIds = await loadChatIds(env, userIds);
    const pushSubs = await loadPushSubs(env, userIds);
    const text = formatAlert(tr);

    // Persist inbox rows — one per recipient user. Quality is computed
    // from the asset snapshot at the moment of transition so the inbox
    // can show "A+" vs "B" grading without recomputing later. Fire in
    // parallel with the Telegram/push sends; DB writes don't block
    // notification delivery.
    const inboxWrites = writeAlertHistory(env, tr, userIds);

    // Telegram sends (awaited so waitUntil covers network round-trip)
    const telegramSends = chatIds.map((link) =>
      sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, link.chat_id, text).catch((e) => {
        console.error(`[bias-cron] Telegram send failed for user ${link.user_id}:`, e);
      }),
    );

    // Web push sends — same transition fires a native browser notification
    // for each subscribed device. Non-blocking between channels so a slow
    // Telegram doesn't delay push delivery or vice versa.
    const pushSends = pushSubs.length > 0 && env.VAPID_PRIVATE_KEY
      ? dispatchPushForTransition(env, tr, pushSubs)
      : [];

    await Promise.all([...telegramSends, ...pushSends, inboxWrites]);
  }
}

// Insert one inbox row per recipient user on a transition.
async function writeAlertHistory(
  env: Env,
  tr: Transition,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const q = computeAlertQuality(tr.asset, tr.interval);
  const tradePlan = tr.interval === '4h' ? tr.asset.tradePlan : tr.asset.tradePlan1H;
  const criteriaJson = JSON.stringify(q.criteria);
  const planJson = tradePlan ? JSON.stringify(tradePlan) : null;
  const firedAtUnix = Math.floor(Date.now() / 1000);

  const insert = env.DB.prepare(`
    INSERT INTO bias_alert_history (
      user_id, fired_at_unix, symbol, interval, phase, bias, previous_phase,
      quality, criteria_met, criteria_total, criteria_json, trade_plan_json, narrative
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = userIds.map((uid) =>
    insert.bind(
      uid,
      firedAtUnix,
      tr.asset.symbol,
      tr.interval,
      tr.currentPhase,
      tr.asset.bias,
      tr.previousPhase,
      q.quality,
      q.metCount,
      q.totalCount,
      criteriaJson,
      planJson,
      tr.asset.narrative ?? null,
    ),
  );
  await env.DB.batch(batch);
}

// Fan out a single transition to all opted-in push subscriptions. Prunes
// dead subscriptions (404/410) inline.
function dispatchPushForTransition(
  env: Env,
  tr: Transition,
  subs: Array<PushSubscription & { user_id: string }>,
): Array<Promise<unknown>> {
  if (!env.VAPID_PRIVATE_KEY) return [];

  const plan = tr.interval === '4h' ? tr.asset.tradePlan : tr.asset.tradePlan1H;
  const isAPlus = !!tr.asset.confluence?.aligned;
  const bodyLines: string[] = [];
  bodyLines.push(tr.icc.phase.detail);
  if (plan && tr.currentPhase === 'CONTINUATION') {
    const sym = tr.asset.symbol;
    const px = (p: number) => scalePrice(p, sym);
    const a = isScaled(sym) ? '≈' : '';
    bodyLines.push(`📍 Entry ${a}${px(plan.entry)} · SL ${a}${px(plan.stopLoss)} · TP ${a}${px(plan.takeProfit1)}`);
  }

  // Pass the current cron-tick unix timestamp so the asset page can fetch
  // the exact bias_history snapshot that fired this alert. Cron persists
  // snapshots with Math.floor(Date.now()/1000), so using the same basis
  // here lines the URL param up with the stored row within the ±120s
  // window that /v1/bias/snapshot/:symbol/:unix tolerates.
  const alertUnix = Math.floor(Date.now() / 1000);
  const symbolLower = tr.asset.symbol.toLowerCase();
  const url = `https://trademetricspro.com/bias/${symbolLower}?alert=${alertUnix}&tf=${tr.interval}`;

  const payload = JSON.stringify({
    title: `${isAPlus ? '⚡ A+ · ' : ''}${tr.asset.symbol} · ${tr.currentPhase} on ${tr.interval.toUpperCase()}`,
    body: bodyLines.join('\n'),
    tag: `bias-${tr.asset.symbol}-${tr.interval}-${tr.currentPhase}`,
    url,
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
  });

  const vapid = {
    publicKeyB64: env.VAPID_PUBLIC_KEY,
    privateKeyB64: env.VAPID_PRIVATE_KEY!,
    subject: env.VAPID_SUBJECT,
  };

  return subs.map(async (sub) => {
    const res = await sendWebPush(sub, payload, vapid);
    if (res.gone) {
      await env.DB
        .prepare(`DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`)
        .bind(sub.user_id, sub.endpoint)
        .run()
        .catch(() => { /* ignore */ });
    } else if (!res.ok) {
      await env.DB
        .prepare(`UPDATE push_subscriptions SET failure_count = failure_count + 1 WHERE user_id = ? AND endpoint = ?`)
        .bind(sub.user_id, sub.endpoint)
        .run()
        .catch(() => { /* ignore */ });
      console.error(`[bias-cron] push failed for ${sub.user_id}: ${res.error}`);
    } else {
      await env.DB
        .prepare(`UPDATE push_subscriptions SET last_used_at = datetime('now'), failure_count = 0 WHERE user_id = ? AND endpoint = ?`)
        .bind(sub.user_id, sub.endpoint)
        .run()
        .catch(() => { /* ignore */ });
    }
  });
}

async function loadPushSubs(
  env: Env,
  userIds: string[],
): Promise<Array<PushSubscription & { user_id: string }>> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const { results } = await env.DB
    .prepare(`SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions
              WHERE user_id IN (${placeholders}) AND failure_count < 5`)
    .bind(...userIds)
    .all<PushSubscription & { user_id: string }>();
  return results ?? [];
}

function alertPrefColumn(phase: ICCPhaseKind): keyof AlertPrefRow | null {
  switch (phase) {
    case 'INDICATION':   return 'alert_on_indication';
    case 'CORRECTION':   return 'alert_on_correction';
    case 'CONTINUATION': return 'alert_on_continuation';
    case 'NO_SETUP':     return null;
  }
}

async function loadOptedInUsers(
  env: Env, symbol: string, column: keyof AlertPrefRow,
): Promise<AlertPrefRow[]> {
  const { results } = await env.DB
    .prepare(`SELECT * FROM bias_alert_prefs WHERE symbol = ? AND ${column} = 1`)
    .bind(symbol)
    .all<AlertPrefRow>();
  return results ?? [];
}

async function loadChatIds(env: Env, userIds: string[]): Promise<TelegramLink[]> {
  const links: TelegramLink[] = [];
  await Promise.all(
    userIds.map(async (user_id) => {
      const raw = await env.BOT_STATE.get(`user:${user_id}:tg`);
      if (!raw) return;
      let chat_id: string;
      try {
        chat_id = String((JSON.parse(raw) as { chatId?: unknown }).chatId ?? raw);
      } catch {
        chat_id = raw;
      }
      if (chat_id && chat_id !== 'undefined') links.push({ user_id, chat_id });
    }),
  );
  return links;
}

function formatAlert(tr: Transition): string {
  const { asset, interval, previousPhase, currentPhase, icc } = tr;
  const arrow = currentPhase === 'CONTINUATION' ? '⚡' : currentPhase === 'INDICATION' ? '🔔' : '📍';
  const tfLabel = interval === '4h' ? '4H' : '1H';
  const confluenceFlag = asset.confluence?.aligned ? ' · ⚡ A+ CONFLUENCE' : '';

  const lines: string[] = [];
  lines.push(`${arrow} <b>${asset.symbol} · ${currentPhase} on ${tfLabel}${confluenceFlag}</b>`);
  lines.push(`<i>Phase changed: ${previousPhase} → ${currentPhase}</i>`);
  lines.push('');
  lines.push(icc.phase.detail);
  lines.push('');

  // Show the interval-specific bias + score
  if (interval === '4h') {
    lines.push(`Bias: <b>${asset.bias}</b> (${asset.score > 0 ? '+' : ''}${asset.score})`);
  } else if (asset.bias1H !== undefined && asset.score1H !== undefined) {
    lines.push(`1H bias: <b>${asset.bias1H}</b> (${asset.score1H > 0 ? '+' : ''}${asset.score1H}) · 4H: ${asset.bias} (${asset.score > 0 ? '+' : ''}${asset.score})`);
  }
  lines.push(`Session: ${asset.icc.session.active}`);
  if (icc.correction.currentDepth !== null) {
    lines.push(`Correction depth: ${icc.correction.currentDepth}% · ${icc.correction.zone}`);
  }

  // Trade plan — only attached on CONTINUATION transitions for the
  // matching timeframe, and only if the engine computed clean levels.
  const plan = interval === '4h' ? asset.tradePlan : asset.tradePlan1H;
  if (plan && currentPhase === 'CONTINUATION') {
    const sym = asset.symbol;
    const px = (p: number) => scalePrice(p, sym);
    const a = isScaled(sym) ? '≈' : '';
    lines.push('');
    lines.push(`📍 <b>Trade plan (reference)</b>`);
    lines.push(`  Entry: <code>${a}${px(plan.entry)}</code>`);
    lines.push(`  Stop:  <code>${a}${px(plan.stopLoss)}</code> (${plan.slDistancePct}%)`);
    lines.push(`  TP1:   <code>${a}${px(plan.takeProfit1)}</code> (1:2R · ${plan.tp1DistancePct}%)`);
    lines.push(`  TP2:   <code>${a}${px(plan.takeProfit2)}</code> (1:3R · ${plan.tp2DistancePct}%)`);
    lines.push(`<i>${plan.rationaleSl}</i>`);
    if (isScaled(sym)) lines.push('<i>≈ scaled from ETF proxy; tracks index within ~0.5%. Use broker chart for exact entry.</i>');
    lines.push('');
    lines.push('<i>⚠ Drop to 15M/5M for your entry trigger. Reference only — not financial advice.</i>');
  } else {
    lines.push('');
  }

  // Deep-link includes the alert timestamp so the landing page can replay
  // the exact snapshot instead of just showing live state.
  const alertUnix = Math.floor(Date.now() / 1000);
  lines.push(
    `Open the full engine: https://trademetricspro.com/bias/${asset.symbol.toLowerCase()}?alert=${alertUnix}&tf=${interval}`,
  );
  return lines.join('\n');
}

// ── public A+ SETUP broadcast ─────────────────────────────────

async function broadcastAPlusSetups(env: Env, assets: AssetBias[]): Promise<void> {
  const chatId = env.PUBLIC_ALERT_CHAT_ID;
  if (!chatId || !env.TELEGRAM_BOT_TOKEN) {
    console.log(`[bias-cron] public broadcast skipped (chat_id=${!!chatId}, token=${!!env.TELEGRAM_BOT_TOKEN})`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const sends: Promise<unknown>[] = [];

  for (const asset of assets) {
    if (!asset.confluence?.aligned) continue;

    const dedupKey = `bias-public-aplus:${asset.symbol}:${today}`;
    const already = await env.BOT_STATE.get(dedupKey);
    if (already) {
      console.log(`[bias-cron] public A+ deduped for ${asset.symbol}`);
      continue;
    }
    await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 * 2 });

    const msg = formatPublicAPlus(asset);
    // Await the sends by collecting promises and awaiting at end. This keeps
    // the outer waitUntil budget covering the Telegram network call.
    sends.push(
      sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg).then((ok) => {
        console.log(`[bias-cron] public A+ ${asset.symbol} send ok=${ok}`);
      }).catch((e) => {
        console.error(`[bias-cron] public A+ broadcast failed for ${asset.symbol}:`, e);
      }),
    );
  }

  await Promise.all(sends);
}

function formatPublicAPlus(a: AssetBias): string {
  const lines: string[] = [];
  lines.push(`⚡ <b>A+ SETUP · ${a.symbol}</b>`);
  lines.push(`<i>4H + 1H both ${a.bias} · full confluence</i>`);
  lines.push('');
  if (a.narrative) lines.push(a.narrative);
  lines.push('');
  lines.push(`4H score: ${a.score > 0 ? '+' : ''}${a.score} (${a.bias})`);
  if (a.score1H !== undefined) lines.push(`1H score: ${a.score1H > 0 ? '+' : ''}${a.score1H} (${a.bias1H})`);
  lines.push(`Phase: ${a.icc.phase.current}${a.icc1H ? ` · 1H: ${a.icc1H.phase.current}` : ''}`);

  // Prefer the 4H plan since that's the confluence-anchoring timeframe; fall back to 1H.
  const plan = a.tradePlan ?? a.tradePlan1H;
  if (plan) {
    const sym = a.symbol;
    const px = (p: number) => scalePrice(p, sym);
    const apx = isScaled(sym) ? '≈' : '';
    lines.push('');
    lines.push(`📍 <b>Trade plan (reference)</b>`);
    lines.push(`  Entry: <code>${apx}${px(plan.entry)}</code> (${plan.direction.toUpperCase()})`);
    lines.push(`  Stop:  <code>${apx}${px(plan.stopLoss)}</code> (${plan.slDistancePct}%)`);
    lines.push(`  TP1:   <code>${apx}${px(plan.takeProfit1)}</code> (1:2R)`);
    lines.push(`  TP2:   <code>${apx}${px(plan.takeProfit2)}</code> (1:3R)`);
    if (isScaled(sym)) lines.push(`<i>≈ scaled from ETF proxy; tracks within ~0.5%.</i>`);
  }

  lines.push('');
  const alertUnix = Math.floor(Date.now() / 1000);
  lines.push(`📊 Full engine: https://trademetricspro.com/bias/${a.symbol.toLowerCase()}?alert=${alertUnix}&tf=4h`);
  lines.push('');
  lines.push('<i>Educational only. Drop to 15M/5M for actual entry. Not financial advice.</i>');
  return lines.join('\n');
}

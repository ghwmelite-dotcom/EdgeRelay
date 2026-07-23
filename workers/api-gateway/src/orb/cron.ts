// ORB cron — same 15-min schedule as the ICC cron, reusing the
// scheduled() handler in index.ts. Only does real work when an ORB
// session window is currently open.
//
// Per tick:
//   1. Skip entirely if no session is in its tracking window
//   2. For every asset, recompute today's London + NY state
//   3. Upsert to orb_history
//   4. For each row whose signalType transitioned null → long|short,
//      dispatch Telegram + Web Push + public broadcast (same three
//      channels as ICC) and persist an inbox row tagged strategy='ORB'

import { sendTelegramMessage } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS } from '../bias/fetcher.js';
import { sendWebPush, type PushSubscription } from '../bias/webpush.js';
import { recomputeAssetToday, persistOrbState, type OrbRecompute } from './runner.js';
import { isCronWindow } from './sessionWindow.js';
import { scalePrice, isScaled } from '../lib/displayScale.js';

interface AlertPrefRow {
  user_id: string;
  alert_on_indication: number;
  alert_on_correction: number;
  alert_on_continuation: number;
  alert_on_consolidation: number;
}

export async function runOrbCron(env: Env, ctx: ExecutionContext): Promise<void> {
  if (!env.TWELVE_DATA_KEY) return;
  const nowUnix = Math.floor(Date.now() / 1000);
  if (!isCronWindow(nowUnix)) {
    console.log('[orb-cron] outside active session windows — skipping');
    return;
  }

  const start = Date.now();
  const newSignals: OrbRecompute[] = [];

  for (const spec of ASSETS) {
    try {
      const states = await recomputeAssetToday(env, spec, nowUnix);
      for (const st of states) {
        const fresh = await persistOrbState(env, st);
        if (fresh) newSignals.push({ ...st, justFiredBreakout: true });
      }
    } catch (e) {
      console.error(`[orb-cron] recompute failed for ${spec.key}:`, e);
    }
  }

  if (newSignals.length > 0) {
    ctx.waitUntil(dispatchOrbAlerts(env, newSignals));
    ctx.waitUntil(broadcastPublicOrb(env, newSignals));
  }

  console.log(`[orb-cron] ${ASSETS.length} assets · ${newSignals.length} new signals in ${Date.now() - start}ms`);
}

async function dispatchOrbAlerts(env: Env, signals: OrbRecompute[]): Promise<void> {
  for (const s of signals) {
    if (!s.signal || !s.signal.signalType || !s.signal.tradePlan) continue;

    // Load users who want Continuation alerts (the natural ORB analogue
    // since a breakout IS a continuation-style signal). Reusing the
    // existing pref schema keeps the UX unified — users don't need a
    // separate "ORB alerts" toggle.
    const { results: prefs } = await env.DB.prepare(
      `SELECT * FROM bias_alert_prefs WHERE symbol = ? AND alert_on_continuation = 1`,
    ).bind(s.spec.key).all<AlertPrefRow>();
    const optedIn = prefs ?? [];
    if (optedIn.length === 0) continue;

    const userIds = optedIn.map((p) => p.user_id);

    // Dedup per symbol × session × date × signal_type
    const dedupKey = `orb-alert:${s.signal.symbol}:${s.session}:${s.signal.date}:${s.signal.signalType}`;
    const already = await env.BOT_STATE.get(dedupKey);
    if (already) continue;
    await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 });

    // Write inbox rows (strategy='ORB')
    const criteriaJson = JSON.stringify(s.signal.criteria);
    const planJson = JSON.stringify(s.signal.tradePlan);
    const firedAt = s.signal.signalAtUnix ?? Math.floor(Date.now() / 1000);
    const insertInbox = env.DB.prepare(`
      INSERT INTO bias_alert_history (
        user_id, fired_at_unix, symbol, interval, phase, bias, previous_phase,
        quality, criteria_met, criteria_total, criteria_json, trade_plan_json,
        narrative, strategy
      ) VALUES (?, ?, ?, '15min', ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'ORB')
    `);
    const bias = s.signal.signalType === 'long' ? 'BULLISH' : 'BEARISH';
    const phaseLabel = `${s.session.toUpperCase()} ${s.signal.signalType?.toUpperCase()}`;
    const inboxBatch = userIds.map((uid) =>
      insertInbox.bind(
        uid, firedAt, s.spec.key, phaseLabel, bias,
        s.signal!.quality, s.signal!.metCount, s.signal!.totalCount,
        criteriaJson, planJson, null,
      ),
    );
    await env.DB.batch(inboxBatch);

    // Telegram + push dispatch
    const text = formatOrbAlert(s);
    const chatIds = await loadChatIds(env, userIds);
    const pushSubs = await loadPushSubs(env, userIds);

    const telegramSends = chatIds.map((link) =>
      sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, link.chat_id, text).catch((e) => {
        console.error(`[orb-cron] Telegram send failed for user ${link.user_id}:`, e);
      }),
    );

    const pushSends = pushSubs.length > 0 && env.VAPID_PRIVATE_KEY
      ? dispatchPushForOrb(env, s, pushSubs)
      : [];

    await Promise.all([...telegramSends, ...pushSends]);
  }
}

function formatOrbAlert(s: OrbRecompute): string {
  const sig = s.signal!;
  const plan = sig.tradePlan!;
  const arrow = sig.signalType === 'long' ? '▲' : '▼';
  const sess = s.session === 'london' ? 'London' : 'NY';
  const sym = sig.symbol;
  // Scaled prices for indices (DIA→DJI, QQQ→NDX) so MT5 users can copy
  // levels directly. Pct fields stay invariant under scaling.
  const px = (p: number) => round(scalePrice(p, sym));
  const approx = isScaled(sym) ? '≈' : '';
  const lines: string[] = [];
  lines.push(`${arrow} <b>${sig.symbol} · ORB ${sig.signalType?.toUpperCase()} · ${sess} open</b>`);
  if (sig.quality === 'A_PLUS') lines.push(`⚡ <b>A+ quality</b> — all filters passed`);
  else lines.push(`<i>Quality ${sig.quality} · ${sig.metCount}/${sig.totalCount} criteria met</i>`);
  lines.push('');
  lines.push(`Range: ${approx}${px(sig.range.low)} – ${approx}${px(sig.range.high)}  (${round(sig.range.rangePct, 2)}%)`);
  lines.push(`Break candle close: ${approx}${px(sig.signalPrice ?? 0)}`);
  lines.push('');
  lines.push(`📍 <b>Trade plan</b>`);
  lines.push(`  Entry: <code>${approx}${px(plan.entry)}</code>`);
  lines.push(`  SL:    <code>${approx}${px(plan.stopLoss)}</code> (${plan.slDistancePct}%)`);
  lines.push(`  TP1:   <code>${approx}${px(plan.takeProfit1)}</code> (1:2R · ${plan.tp1DistancePct}%)`);
  lines.push(`  TP2:   <code>${approx}${px(plan.takeProfit2)}</code> (1:3R · ${plan.tp2DistancePct}%)`);
  lines.push(`<i>${plan.rationaleSl}</i>`);
  if (isScaled(sym)) lines.push('<i>≈ scaled from ETF proxy; tracks index within ~0.5%. Use broker chart for exact entry.</i>');
  lines.push('');
  lines.push('<i>⚠ Day-trade setup — consider flat before session close. Not financial advice.</i>');
  lines.push(`Open: https://trademetricspro.com/bias/${sig.symbol.toLowerCase()}?alert=${sig.signalAtUnix}&tf=15min&strategy=orb`);
  return lines.join('\n');
}

function round(n: number, dp = 5): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ── Push dispatch helpers (same pattern as ICC) ──────────────

function dispatchPushForOrb(
  env: Env,
  s: OrbRecompute,
  subs: Array<PushSubscription & { user_id: string }>,
): Array<Promise<unknown>> {
  const sig = s.signal!;
  const plan = sig.tradePlan!;
  const tag = `orb-${sig.symbol}-${s.session}-${sig.date}`;
  const titleEmoji = sig.quality === 'A_PLUS' ? '⚡ ' : '';
  const sym = sig.symbol;
  const px = (p: number) => round(scalePrice(p, sym));
  const approx = isScaled(sym) ? '≈' : '';
  const payload = JSON.stringify({
    title: `${titleEmoji}ORB ${sig.signalType?.toUpperCase()} · ${sig.symbol} · ${s.session === 'london' ? 'London' : 'NY'}`,
    body: `Entry ${approx}${px(plan.entry)} · SL ${approx}${px(plan.stopLoss)} · TP ${approx}${px(plan.takeProfit1)}\nQuality ${sig.quality} · ${sig.metCount}/${sig.totalCount} criteria`,
    tag,
    url: `https://trademetricspro.com/bias/${sig.symbol.toLowerCase()}?alert=${sig.signalAtUnix}&tf=15min&strategy=orb`,
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
        .run().catch(() => { /* ignore */ });
    } else if (!res.ok) {
      console.error(`[orb-cron] push failed for ${sub.user_id}: ${res.error}`);
    }
  });
}

async function loadChatIds(env: Env, userIds: string[]): Promise<Array<{ user_id: string; chat_id: string }>> {
  const out: Array<{ user_id: string; chat_id: string }> = [];
  await Promise.all(
    userIds.map(async (user_id) => {
      const raw = await env.BOT_STATE.get(`user:${user_id}:tg`);
      if (!raw) return;
      let chat_id: string;
      try { chat_id = String((JSON.parse(raw) as { chatId?: unknown }).chatId ?? raw); }
      catch { chat_id = raw; }
      if (chat_id && chat_id !== 'undefined') out.push({ user_id, chat_id });
    }),
  );
  return out;
}

async function loadPushSubs(env: Env, userIds: string[]): Promise<Array<PushSubscription & { user_id: string }>> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const { results } = await env.DB
    .prepare(`SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions
              WHERE user_id IN (${placeholders}) AND failure_count < 5`)
    .bind(...userIds)
    .all<PushSubscription & { user_id: string }>();
  return results ?? [];
}

async function broadcastPublicOrb(env: Env, signals: OrbRecompute[]): Promise<void> {
  const chatId = env.PUBLIC_ALERT_CHAT_ID;
  if (!chatId || !env.TELEGRAM_BOT_TOKEN) return;
  // Only broadcast A+ quality ORB signals publicly to keep the channel
  // high-signal-to-noise for followers.
  for (const s of signals) {
    if (!s.signal || s.signal.quality !== 'A_PLUS') continue;
    const dedupKey = `orb-public-aplus:${s.signal.symbol}:${s.session}:${s.signal.date}`;
    const already = await env.BOT_STATE.get(dedupKey);
    if (already) continue;
    await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 * 2 });

    const msg = formatOrbAlert(s);
    sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg).catch((e) => {
      console.error(`[orb-cron] public A+ broadcast failed for ${s.signal!.symbol}:`, e);
    });
  }
}

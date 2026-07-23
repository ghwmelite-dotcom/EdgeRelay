// Daily ICC Brief — sent to opted-in users at 07:00 UTC via Telegram.
//
// One compact Telegram message covering all 5 tracked assets, featuring
// each asset's AI narrative, bias, phase, and an A+ SETUP callout when
// the 4H + 1H align. Links back to the full engine.

import { sendTelegramMessage } from '@edgerelay/shared';
import type { AssetBias } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { runBiasEngine } from './runner.js';

interface BriefUser {
  user_id: string;
}

export async function runDailyBrief(env: Env, ctx: ExecutionContext): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('[bias-brief] TELEGRAM_BOT_TOKEN missing — skipping');
    return;
  }

  // Load opted-in users first — if zero, skip the expensive engine run.
  const { results: userRows } = await env.DB
    .prepare(`SELECT user_id FROM notification_preferences WHERE icc_brief = 1`)
    .all<BriefUser>();

  if (!userRows || userRows.length === 0) {
    console.log('[bias-brief] no opted-in users; skipping');
    return;
  }

  // Use the already-fresh engine data. No need to force a Twelve Data
  // refetch — the 15-min cron should have populated KV moments ago.
  const response = await runBiasEngine(env);
  const message = formatBrief(response.assets);

  let sent = 0;
  for (const user of userRows) {
    const raw = await env.BOT_STATE.get(`user:${user.user_id}:tg`);
    if (!raw) continue;
    let chatId: string;
    try {
      chatId = String((JSON.parse(raw) as { chatId?: unknown }).chatId ?? raw);
    } catch {
      chatId = raw;
    }
    if (!chatId || chatId === 'undefined') continue;

    // Dedup per user per UTC day so re-firing the cron won't double-send
    const dedupKey = `bias-brief:${user.user_id}:${new Date().toISOString().slice(0, 10)}`;
    const already = await env.BOT_STATE.get(dedupKey);
    if (already) continue;
    await env.BOT_STATE.put(dedupKey, '1', { expirationTtl: 86400 * 2 });

    ctx.waitUntil(sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, message));
    sent++;
  }

  console.log(`[bias-brief] sent to ${sent}/${userRows.length} users`);
}

function formatBrief(assets: AssetBias[]): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  lines.push(`<b>📋 ICC Daily Brief · ${date}</b>`);
  lines.push('<i>4H + 1H directional read · 5 tracked assets</i>');
  lines.push('');

  const aPlus = assets.filter((a) => a.confluence?.aligned);
  if (aPlus.length > 0) {
    lines.push(`⚡ <b>${aPlus.length} A+ Setup${aPlus.length === 1 ? '' : 's'}:</b> ${aPlus.map((a) => a.symbol).join(', ')}`);
    lines.push('');
  }

  for (const a of assets) {
    if (a.error) {
      lines.push(`<b>${a.symbol}</b> — data unavailable`);
      continue;
    }
    const arrow = a.bias === 'BULLISH' ? '▲' : a.bias === 'BEARISH' ? '▼' : '◆';
    const aPlusFlag = a.confluence?.aligned ? ' ⚡' : '';
    lines.push(`${arrow} <b>${a.symbol}${aPlusFlag}</b> · ${a.bias} · ${a.icc.phase.current}`);
    if (a.narrative) {
      lines.push(`   ${a.narrative}`);
    } else {
      lines.push(`   Score ${a.score > 0 ? '+' : ''}${a.score} · State ${a.icc.marketState.state}`);
    }
    // If this asset is in a live CONTINUATION, show the reference levels.
    const plan = a.tradePlan ?? a.tradePlan1H;
    if (plan) {
      lines.push(`   📍 Entry ${plan.entry} · SL ${plan.stopLoss} · TP ${plan.takeProfit1} (2R) / ${plan.takeProfit2} (3R)`);
    }
    lines.push('');
  }

  lines.push('📊 Full engine → https://trademetricspro.com/bias');
  lines.push('<i>Educational only. Not financial advice.</i>');
  return lines.join('\n');
}

// Per-user bias-alert preferences. Mounted under the protected /v1/*
// namespace so these routes require a valid session.
//
//   GET /v1/bias-alerts              → list my prefs (one row per asset)
//   PUT /v1/bias-alerts              → upsert a single-asset pref
//   PUT /v1/bias-alerts/bulk         → upsert many at once (settings save)

import { Hono } from 'hono';
import type {
  ApiResponse,
  AlertHistoryItem,
  InboxResponse,
  AlertCriterion,
  AlertQuality,
  TradePlan,
  BiasDirection,
} from '@edgerelay/shared';
import type { Env } from '../types.js';
import { ASSETS } from '../bias/fetcher.js';
import { scaleObject } from '../lib/displayScale.js';

export const biasAlerts = new Hono<{ Bindings: Env }>();

interface PrefRow {
  symbol: string;
  alert_on_indication: number;
  alert_on_correction: number;
  alert_on_continuation: number;
  alert_on_consolidation: number;
}

interface UpsertBody {
  symbol: string;
  alert_on_indication?: boolean;
  alert_on_correction?: boolean;
  alert_on_continuation?: boolean;
  alert_on_consolidation?: boolean;
}

biasAlerts.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB
    .prepare(`SELECT symbol, alert_on_indication, alert_on_correction,
                     alert_on_continuation, alert_on_consolidation
              FROM bias_alert_prefs WHERE user_id = ?`)
    .bind(userId)
    .all<PrefRow>();

  // Return a row per tracked asset, filling in defaults where the user has
  // never saved a pref. This keeps the UI logic trivial.
  const existing = new Map<string, PrefRow>();
  for (const r of results ?? []) existing.set(r.symbol, r);

  const rows = ASSETS.map((a) => existing.get(a.key) ?? {
    symbol: a.key,
    alert_on_indication:   0,
    alert_on_correction:   0,
    alert_on_continuation: 1,
    alert_on_consolidation: 0,
  });

  return c.json<ApiResponse>({ data: { prefs: rows, assets: ASSETS.map((a) => ({ symbol: a.key, label: a.label, category: a.category })) }, error: null });
});

biasAlerts.put('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as UpsertBody | null;
  if (!body || !body.symbol) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_INPUT', message: 'symbol required' } }, 400);
  }
  if (!ASSETS.find((a) => a.key === body.symbol)) {
    return c.json<ApiResponse>({ data: null, error: { code: 'UNKNOWN_SYMBOL', message: `Symbol ${body.symbol} not tracked` } }, 400);
  }
  await upsertPref(c.env, userId, body);
  return c.json<ApiResponse>({ data: { ok: true }, error: null });
});

biasAlerts.put('/bulk', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as { prefs?: UpsertBody[] } | null;
  if (!body?.prefs || !Array.isArray(body.prefs)) {
    return c.json<ApiResponse>({ data: null, error: { code: 'BAD_INPUT', message: 'prefs[] required' } }, 400);
  }
  const valid = body.prefs.filter((p) => p.symbol && ASSETS.find((a) => a.key === p.symbol));
  for (const p of valid) await upsertPref(c.env, userId, p);
  return c.json<ApiResponse>({ data: { ok: true, saved: valid.length }, error: null });
});

async function upsertPref(env: Env, userId: string, p: UpsertBody): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO bias_alert_prefs (
      user_id, symbol,
      alert_on_indication, alert_on_correction,
      alert_on_continuation, alert_on_consolidation,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, symbol) DO UPDATE SET
      alert_on_indication   = excluded.alert_on_indication,
      alert_on_correction   = excluded.alert_on_correction,
      alert_on_continuation = excluded.alert_on_continuation,
      alert_on_consolidation = excluded.alert_on_consolidation,
      updated_at            = datetime('now')
  `).bind(
    userId,
    p.symbol,
    p.alert_on_indication   ? 1 : 0,
    p.alert_on_correction   ? 1 : 0,
    p.alert_on_continuation ? 1 : 0,
    p.alert_on_consolidation ? 1 : 0,
  ).run();
}

// ── Inbox ─────────────────────────────────────────────────────

interface InboxRow {
  id: string;
  fired_at_unix: number;
  symbol: string;
  interval: string;
  phase: string;
  bias: string;
  previous_phase: string | null;
  quality: string;
  criteria_met: number;
  criteria_total: number;
  criteria_json: string | null;
  trade_plan_json: string | null;
  narrative: string | null;
  read_at_unix: number | null;
  strategy: string;
}

biasAlerts.get('/inbox', async (c) => {
  const userId = c.get('userId');
  const { results: rows } = await c.env.DB.prepare(
    `SELECT id, fired_at_unix, symbol, interval, phase, bias, previous_phase,
            quality, criteria_met, criteria_total, criteria_json, trade_plan_json,
            narrative, read_at_unix, strategy
     FROM bias_alert_history
     WHERE user_id = ?
     ORDER BY fired_at_unix DESC
     LIMIT 50`,
  ).bind(userId).all<InboxRow>();

  const alerts: AlertHistoryItem[] = (rows ?? []).map((r) => {
    let criteria: AlertCriterion[] = [];
    try { criteria = r.criteria_json ? JSON.parse(r.criteria_json) : []; } catch { /* leave empty */ }
    let tradePlan: TradePlan | null = null;
    try { tradePlan = r.trade_plan_json ? JSON.parse(r.trade_plan_json) : null; } catch { /* leave null */ }
    // Stored plan is in raw proxy units (DIA/QQQ for indices). Scale on
    // read so the bell inbox shows MT5-scale levels.
    if (tradePlan) tradePlan = scaleObject(tradePlan, r.symbol);
    return {
      id: r.id,
      firedAtUnix: r.fired_at_unix,
      symbol: r.symbol,
      interval: r.interval as '4h' | '1h' | '15min',
      phase: r.phase,
      previousPhase: r.previous_phase,
      bias: r.bias as BiasDirection,
      quality: r.quality as AlertQuality,
      metCount: r.criteria_met,
      totalCount: r.criteria_total,
      criteria,
      tradePlan,
      narrative: r.narrative,
      readAtUnix: r.read_at_unix,
      strategy: (r.strategy as 'ICC' | 'ORB') ?? 'ICC',
    };
  });

  const unreadCount = alerts.filter((a) => a.readAtUnix === null).length;
  const data: InboxResponse = { unreadCount, alerts };
  return c.json<ApiResponse>({ data, error: null });
});

// Mark one, many, or all as read. Body: { ids: string[] } or {} for all.
biasAlerts.post('/inbox/mark-read', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as { ids?: string[] } | null;
  const nowUnix = Math.floor(Date.now() / 1000);

  if (body?.ids && body.ids.length > 0) {
    const placeholders = body.ids.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE bias_alert_history
         SET read_at_unix = ?
       WHERE user_id = ? AND id IN (${placeholders}) AND read_at_unix IS NULL`,
    ).bind(nowUnix, userId, ...body.ids).run();
  } else {
    await c.env.DB.prepare(
      `UPDATE bias_alert_history
         SET read_at_unix = ?
       WHERE user_id = ? AND read_at_unix IS NULL`,
    ).bind(nowUnix, userId).run();
  }
  return c.json<ApiResponse>({ data: { ok: true }, error: null });
});

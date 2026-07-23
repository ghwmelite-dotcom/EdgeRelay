// Per-user web push subscription management (protected routes).
//
//   GET    /v1/push/config            → returns VAPID public key for clients
//   POST   /v1/push/subscribe         → upsert a subscription for the current user
//   DELETE /v1/push/subscribe         → remove a subscription (by endpoint)
//   POST   /v1/push/test              → send a test notification to all of the
//                                       user's subscriptions
//
// The public config endpoint is intentionally open — the VAPID public key
// is safe to ship to anonymous clients, and the flow requires auth *only*
// when actually saving a subscription.

import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { sendWebPush, type PushSubscription } from '../bias/webpush.js';

export const pushConfig = new Hono<{ Bindings: Env }>();
// Mounted publicly at /v1/push-config. Root path returns the VAPID
// config the client needs to subscribe.
pushConfig.get('/', (c) => {
  return c.json<ApiResponse>({
    data: {
      publicKey: c.env.VAPID_PUBLIC_KEY,
      subject: c.env.VAPID_SUBJECT,
    },
    error: null,
  });
});

export const pushSubscriptions = new Hono<{ Bindings: Env }>();

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

pushSubscriptions.post('/subscribe', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as SubscribeBody | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'BAD_INPUT', message: 'endpoint + keys required' } },
      400,
    );
  }

  await c.env.DB.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, ua_hint)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth   = excluded.auth,
      ua_hint = excluded.ua_hint,
      failure_count = 0
  `).bind(
    userId,
    body.endpoint,
    body.keys.p256dh,
    body.keys.auth,
    body.userAgent ?? null,
  ).run();

  return c.json<ApiResponse>({ data: { ok: true }, error: null });
});

pushSubscriptions.post('/unsubscribe', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as { endpoint?: string } | null;
  // If no endpoint supplied, clear all of this user's subscriptions.
  if (body?.endpoint) {
    await c.env.DB
      .prepare(`DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`)
      .bind(userId, body.endpoint)
      .run();
  } else {
    await c.env.DB
      .prepare(`DELETE FROM push_subscriptions WHERE user_id = ?`)
      .bind(userId)
      .run();
  }
  return c.json<ApiResponse>({ data: { ok: true }, error: null });
});

pushSubscriptions.post('/test', async (c) => {
  const userId = c.get('userId');
  if (!c.env.VAPID_PRIVATE_KEY) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NOT_CONFIGURED', message: 'Web push not configured on server' } }, 500);
  }

  const { results } = await c.env.DB
    .prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`)
    .bind(userId)
    .all<PushSubscription>();

  const subs = results ?? [];
  if (subs.length === 0) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NO_SUBSCRIPTIONS', message: 'No active subscriptions' } }, 404);
  }

  const payload = JSON.stringify({
    title: '✅ Bias Alerts enabled',
    body: 'This is a test — you\'ll get pinged here when tracked assets transition phase.',
    url: 'https://trademetricspro.com/bias',
    tag: 'bias-test',
  });

  const vapid = {
    publicKeyB64: c.env.VAPID_PUBLIC_KEY,
    privateKeyB64: c.env.VAPID_PRIVATE_KEY,
    subject: c.env.VAPID_SUBJECT,
  };

  const results2 = await Promise.all(
    subs.map((s) => sendWebPush(s, payload, vapid)),
  );
  const okCount = results2.filter((r) => r.ok).length;

  // Clean up dead subscriptions + log per-endpoint outcome
  const detail: Array<{ endpointPrefix: string; ok: boolean; status?: number; error?: string }> = [];
  for (let i = 0; i < subs.length; i++) {
    const r = results2[i]!;
    detail.push({
      endpointPrefix: subs[i]!.endpoint.slice(0, 50),
      ok: r.ok,
      status: r.status,
      error: r.error,
    });
    console.log(`[push-test] user=${userId} ep=${subs[i]!.endpoint.slice(0, 50)} ok=${r.ok} status=${r.status ?? '-'} err=${r.error ?? '-'}`);
    if (r.gone) {
      await c.env.DB
        .prepare(`DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`)
        .bind(userId, subs[i]!.endpoint)
        .run();
    }
  }

  return c.json<ApiResponse>({
    data: { ok: okCount > 0, sent: okCount, total: subs.length, detail },
    error: null,
  });
});

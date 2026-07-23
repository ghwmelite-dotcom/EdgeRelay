// Client-side helpers for the Web Push subscription dance.
//
//   - register the shared app service worker (sw.js — handles both PWA
//     caching and push events)
//   - fetch the VAPID public key from the API
//   - prompt for Notification permission
//   - subscribe via PushManager and POST the endpoint to our API
//
// All functions throw on unexpected errors so callers can surface a
// precise reason to the user. Browser-only — guarded by feature checks.
//
// Historical note: an earlier version used /sw-bias-push.js as a separate
// SW. That caused scope collision with the existing /sw.js (both at scope
// '/'), so PushManager.subscribe() ended up bound to sw.js — which at
// that time had no push event handler. Pushes were delivered by FCM
// (status 201) but silently dropped at the browser because no SW handled
// them. Fix: consolidated into sw.js, and forced a resubscribe so any
// subscription created against the old/wrong SW is replaced.

import { api } from '@/lib/api';

const SW_PATH = '/sw.js';

export interface PushConfig {
  publicKey: string;
  subject: string;
}

export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function currentPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getConfig(): Promise<PushConfig> {
  const res = await api.get<PushConfig>('/push-config');
  if (!res.data?.publicKey) throw new Error('Server is not serving a VAPID public key');
  return res.data;
}

export async function registerWorker(): Promise<ServiceWorkerRegistration> {
  if (!isSupported()) throw new Error('Push notifications not supported in this browser');

  // Register — idempotent; if sw.js is already installed, the browser
  // checks byte equality with the cached copy and updates if it changed.
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });

  // Wait for the SW to reach "activated" state before anyone asks it to
  // handle a push subscription. Without this, subscribe() can race against
  // install and silently fail.
  if (reg.active) return reg;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Service worker activation timed out after 8s')),
      8000,
    );
    const sw = reg.installing || reg.waiting;
    if (!sw) { clearTimeout(timer); resolve(); return; }
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') { clearTimeout(timer); resolve(); }
    });
  });
  return reg;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** End-to-end: ensure worker, request permission, subscribe, POST to API. */
export async function enablePush(): Promise<PushSubscription> {
  if (!isSupported()) throw new Error('Push notifications not supported in this browser');

  // 0. Clean up the deprecated /sw-bias-push.js registration from an
  // earlier version — that SW is gone from the server, but browsers hold
  // it until explicitly unregistered. Leaving it causes scope competition
  // that can bind the subscription to the wrong worker.
  const all = await navigator.serviceWorker.getRegistrations();
  for (const r of all) {
    const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
    if (url.endsWith('/sw-bias-push.js')) {
      try { await r.unregister(); } catch { /* ignore */ }
    }
  }

  // 1. Permission prompt
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notification permission denied');

  // 2. Register worker + fetch VAPID key
  const [reg, cfg] = await Promise.all([registerWorker(), getConfig()]);

  // 3. Force a fresh subscription. An earlier build created a subscription
  // bound to a SW without push handlers, so pushes silently vanished even
  // though FCM accepted them. Unsubscribing here and re-subscribing on the
  // now-correct sw.js guarantees future pushes land on a handler.
  const existingSub = await reg.pushManager.getSubscription();
  if (existingSub) {
    try { await existingSub.unsubscribe(); } catch { /* ignore */ }
  }
  const key = urlBase64ToUint8Array(cfg.publicKey);
  const keyBuf = new ArrayBuffer(key.byteLength);
  new Uint8Array(keyBuf).set(key);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBuf,
  });

  // 4. Persist to our backend
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Subscription returned without required keys');
  }
  const saveRes = await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
  if (saveRes.error) throw new Error(saveRes.error.message);
  return sub;
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) {
    // No local subscription — still tell the server to purge any leftover rows.
    await api.post('/push/unsubscribe');
    return;
  }
  const json = sub.toJSON() as { endpoint?: string };
  await api.post('/push/unsubscribe', { endpoint: json.endpoint });
  try { await sub.unsubscribe(); } catch { /* ignore */ }
}

export interface PushTestResult {
  ok: boolean;
  sent: number;
  total: number;
  detail?: Array<{ endpointPrefix: string; ok: boolean; status?: number; error?: string }>;
}

export async function sendTestPush(): Promise<PushTestResult> {
  const res = await api.post<PushTestResult>('/push/test');
  if (res.error) throw new Error(res.error.message);
  return res.data!;
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

import { Hono } from 'hono';
import { PositionSnapshot } from '@edgerelay/shared';
import type { Env } from './types.js';

export const positions = new Hono<{ Bindings: Env }>();
const MAX_BODY_BYTES = 128 * 1024;

positions.post('/v1/journal/positions', async (c) => {
  c.header('Cache-Control', 'no-store');
  if (Number(c.req.header('Content-Length')) > MAX_BODY_BYTES) return c.json({ data: null, error: { code: 'TOO_LARGE', message: 'Snapshot too large' } }, 413);
  const raw = await c.req.text();
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length > MAX_BODY_BYTES) return c.json({ data: null, error: { code: 'TOO_LARGE', message: 'Snapshot too large' } }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return c.json({ data: null, error: { code: 'BAD_JSON', message: 'Invalid snapshot' } }, 400); }
  const parsed = PositionSnapshot.safeParse(body);
  if (!parsed.success) return c.json({ data: null, error: { code: 'INVALID_SNAPSHOT', message: 'Invalid snapshot' } }, 400);
  const snapshot = parsed.data;
  const now = Date.now();
  if (Math.abs(now / 1000 - snapshot.captured_at) > 120) return c.json({ data: null, error: { code: 'CLOCK_SKEW', message: 'Terminal UTC clock must be within two minutes' } }, 400);
  const account = await c.env.DB.prepare('SELECT api_secret, api_key FROM accounts WHERE id = ? AND is_active = 1')
    .bind(snapshot.account_id).first<{ api_secret: string; api_key: string }>();
  const signature = c.req.header('X-Snapshot-Signature') ?? '';
  if (!account || c.req.header('X-API-Key') !== account.api_key || !/^[a-f0-9]{64}$/.test(signature)) {
    return c.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, 401);
  }
  // Sign exact UTF-8 bytes, covering every price, balance and position field.
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(account.api_secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signatureBytes = Uint8Array.from(signature.match(/../g)!, (byte) => parseInt(byte, 16));
  if (!await crypto.subtle.verify('HMAC', key, signatureBytes, bytes)) return c.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } }, 401);
  const rateKey = `positions:${snapshot.account_id}:${Math.floor(now / 60_000)}`;
  const count = Number(await c.env.RATE_LIMIT.get(rateKey) ?? 0);
  if (count >= 12) return c.json({ data: null, error: { code: 'RATE_LIMITED', message: 'Too many snapshots' } }, 429);
  await c.env.RATE_LIMIT.put(rateKey, String(count + 1), { expirationTtl: 120 });
  const result = await c.env.DB.prepare(`INSERT INTO live_position_snapshots (account_id, captured_at, received_at, snapshot_json)
    VALUES (?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET
      captured_at = excluded.captured_at, received_at = excluded.received_at, snapshot_json = excluded.snapshot_json
    WHERE excluded.captured_at > live_position_snapshots.captured_at`)
    .bind(snapshot.account_id, snapshot.captured_at, now, JSON.stringify(snapshot)).run();
  if (result.meta.changes === 0) return c.json({ data: null, error: { code: 'OLD_SNAPSHOT', message: 'A newer snapshot is already stored' } }, 409);
  return c.json({ data: { received: true }, error: null });
});

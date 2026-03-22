import { Hono } from 'hono';
import {
  SignalPayload,
  Heartbeat,
  RATE_LIMIT_PER_MINUTE,
  type ApiResponse,
} from '@edgerelay/shared';
import type { Env } from './types.js';
import { verifyHmacSignature } from './validation.js';
import { isDuplicate } from './deduplication.js';

const app = new Hono<{ Bindings: Env }>();

// ── Helpers ───────────────────────────────────────────────────────

function jsonResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { data, error: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiResponse<null> = {
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Health ────────────────────────────────────────────────────────

app.get('/v1/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Signal Ingestion ─────────────────────────────────────────────

app.post('/v1/ingest', async (c) => {
  try {
    // 1. Parse & validate body
    const rawBody: unknown = await c.req.json();
    const parsed = SignalPayload.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid signal payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const signal = parsed.data;

    // 2. Look up account by account_id, get api_secret
    const account = await c.env.DB.prepare(
      'SELECT id, api_secret, role FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(signal.account_id)
      .first<{ id: string; api_secret: string; role: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    if (account.role !== 'master') {
      return errorResponse('INVALID_ROLE', 'Only master accounts can send signals', 403);
    }

    // 3. Verify HMAC signature
    const isValid = await verifyHmacSignature(
      rawBody as Record<string, unknown>,
      account.api_secret,
    );

    if (!isValid) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    // 4. Rate limit via KV
    const minuteBucket = Math.floor(Date.now() / 60000);
    const rateLimitKey = `rate:${signal.account_id}:${minuteBucket}`;
    const currentCount = parseInt((await c.env.RATE_LIMIT.get(rateLimitKey)) ?? '0', 10);

    if (currentCount >= RATE_LIMIT_PER_MINUTE) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded (60/min)', 429);
    }

    await c.env.RATE_LIMIT.put(rateLimitKey, String(currentCount + 1), {
      expirationTtl: 120, // 2 minutes TTL to auto-cleanup
    });

    // 5. Deduplication check
    const duplicate = await isDuplicate(c.env.DB, signal.account_id, signal.sequence_num);

    if (duplicate) {
      return errorResponse('DUPLICATE_SIGNAL', 'Signal with this sequence_num already exists', 409);
    }

    // 6. Route signal to AccountRelay Durable Object
    const doId = c.env.ACCOUNT_RELAY.idFromName(signal.account_id);
    const stub = c.env.ACCOUNT_RELAY.get(doId);

    await stub.fetch(new Request('https://do/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    }));

    // 7. Store signal in D1
    await c.env.DB.prepare(
      `INSERT INTO signals (
        id, master_account_id, sequence_num, action, order_type, symbol,
        volume, price, sl, tp, magic_number, ticket, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        signal.signal_id,
        signal.account_id,
        signal.sequence_num,
        signal.action,
        signal.order_type ?? null,
        signal.symbol,
        signal.volume ?? null,
        signal.price ?? null,
        signal.sl ?? null,
        signal.tp ?? null,
        signal.magic_number ?? null,
        signal.ticket ?? null,
        signal.comment ?? null,
      )
      .run();

    // 8. Return success
    return jsonResponse({ received: true, signal_id: signal.signal_id }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Ingest error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

// ── Heartbeat ────────────────────────────────────────────────────

app.post('/v1/heartbeat', async (c) => {
  try {
    // 1. Parse & validate body
    const rawBody: unknown = await c.req.json();
    const parsed = Heartbeat.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid heartbeat payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const heartbeat = parsed.data;

    // 2. Look up account to get api_secret
    const account = await c.env.DB.prepare(
      'SELECT id, api_secret FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(heartbeat.account_id)
      .first<{ id: string; api_secret: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    // 3. Verify HMAC signature
    const isValid = await verifyHmacSignature(
      rawBody as Record<string, unknown>,
      account.api_secret,
    );

    if (!isValid) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    // 4. Update last_heartbeat in D1
    await c.env.DB.prepare(
      'UPDATE accounts SET last_heartbeat = ? WHERE id = ?',
    )
      .bind(heartbeat.timestamp, heartbeat.account_id)
      .run();

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Heartbeat error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

// ── Default export for Cloudflare Workers ────────────────────────

export default app;

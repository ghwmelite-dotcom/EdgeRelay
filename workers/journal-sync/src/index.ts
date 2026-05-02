import { Hono } from 'hono';
import {
  JournalSyncPayload,
  Heartbeat,
  JournalTrade,
  JOURNAL_RATE_LIMIT_PER_MINUTE,
  type ApiResponse,
} from '@edgerelay/shared';
import type { Env } from './types.js';
import { verifyJournalHmac } from './validation.js';
import { computeUserBiasStats } from './biasStatsAggregator.js';

async function materializeUserBiasStats(
  env: Env,
  accountId: string,
  now: number,
): Promise<void> {
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

  const userRow = await env.DB.prepare(
    `SELECT user_id FROM accounts WHERE id = ?`,
  ).bind(accountId).first<{ user_id: string }>();
  if (!userRow) return;
  const userId = userRow.user_id;

  const tradesRes = await env.DB.prepare(
    `SELECT a.user_id, t.symbol, t.time, COALESCE(t.profit, 0) AS profit, COALESCE(t.risk_reward_ratio, 0) AS risk_reward_ratio
     FROM journal_trades t JOIN accounts a ON a.id = t.account_id
     WHERE a.user_id = ? AND t.deal_entry IN ('out','inout') AND t.time >= ?`,
  ).bind(userId, ninetyDaysAgo).all<{
    user_id: string; symbol: string; time: number; profit: number; risk_reward_ratio: number;
  }>();
  const trades = tradesRes.results ?? [];
  if (trades.length === 0) return;

  const symbols = [...new Set(trades.map((t) => t.symbol))];
  const placeholders = symbols.map(() => '?').join(',');
  const phasesRes = await env.DB.prepare(
    `SELECT symbol, captured_unix AS ts, (bias || '_' || phase) AS phase FROM bias_history
     WHERE symbol IN (${placeholders}) AND captured_unix >= ?`,
  ).bind(...symbols, ninetyDaysAgo).all<{ symbol: string; ts: number; phase: string }>();
  const phases = phasesRes.results ?? [];

  const stats = computeUserBiasStats(trades, phases, now);
  if (stats.length === 0) return;

  // Replace this user's stats atomically
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM user_bias_stats WHERE user_id = ?`).bind(userId),
    ...stats.map((s) => env.DB.prepare(
      `INSERT INTO user_bias_stats (user_id, symbol, icc_phase, n_trades, n_wins, total_r, last_trade_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(s.user_id, s.symbol, s.icc_phase, s.n_trades, s.n_wins, s.total_r, s.last_trade_at, s.updated_at)),
  ];
  await env.DB.batch(stmts);
}

const app = new Hono<{ Bindings: Env }>();

// ── Helpers ───────────────────────────────────────────────────

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

// ── Health ────────────────────────────────────────────────────

// Health check — both paths for compatibility with IsServerReachable()
app.get('/v1/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

app.get('/v1/journal/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Journal Sync ─────────────────────────────────────────────

app.post('/v1/journal/sync', async (c) => {
  try {
    // 1. Parse & validate
    const rawBody: unknown = await c.req.json();
    const parsed = JournalSyncPayload.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid journal sync payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const payload = parsed.data;

    // 2. Look up account
    const account = await c.env.DB.prepare(
      'SELECT id, api_secret, role FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(payload.account_id)
      .first<{ id: string; api_secret: string; role: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    if (account.role !== 'master' && account.role !== 'follower' && account.role !== 'journal') {
      return errorResponse('INVALID_ROLE', 'Account role cannot sync journal trades', 403);
    }

    // 3. Verify HMAC
    const dealTickets = payload.trades.map((t) => t.deal_ticket);
    const isValid = await verifyJournalHmac(
      payload.account_id,
      payload.timestamp,
      dealTickets,
      payload.hmac_signature,
      account.api_secret,
    );

    if (!isValid) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    // 4. Rate limit
    const minuteBucket = Math.floor(Date.now() / 60000);
    const rateLimitKey = `journal:${payload.account_id}:${minuteBucket}`;
    const currentCount = parseInt((await c.env.RATE_LIMIT.get(rateLimitKey)) ?? '0', 10);

    if (currentCount >= JOURNAL_RATE_LIMIT_PER_MINUTE) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded (120/min)', 429);
    }

    await c.env.RATE_LIMIT.put(rateLimitKey, String(currentCount + 1), {
      expirationTtl: 120,
    });

    // 5. Validate and insert each trade
    let synced = 0;
    let duplicates = 0;
    let invalid = 0;
    const now = Date.now();

    for (const trade of payload.trades) {
      // Validate individual trade
      const tradeResult = JournalTrade.safeParse(trade);
      if (!tradeResult.success) {
        invalid++;
        continue;
      }

      const t = tradeResult.data;
      const id = crypto.randomUUID();

      try {
        const runResult = await c.env.DB.prepare(
          `INSERT OR IGNORE INTO journal_trades (
            id, account_id, deal_ticket, order_ticket, position_id,
            symbol, direction, deal_entry, volume, price,
            sl, tp, time, profit, commission, swap,
            magic_number, comment, balance_at_trade, equity_at_trade,
            spread_at_entry, atr_at_entry, session_tag,
            duration_seconds, pips, risk_reward_ratio, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            payload.account_id,
            t.deal_ticket,
            t.order_ticket ?? null,
            t.position_id ?? null,
            t.symbol,
            t.direction,
            t.deal_entry,
            t.volume,
            t.price ?? null,
            t.sl ?? null,
            t.tp ?? null,
            t.time,
            t.profit ?? null,
            t.commission ?? null,
            t.swap ?? null,
            t.magic_number ?? null,
            t.comment ?? null,
            t.balance_at_trade ?? null,
            t.equity_at_trade ?? null,
            t.spread_at_entry ?? null,
            t.atr_at_entry ?? null,
            t.session_tag ?? null,
            t.duration_seconds ?? null,
            t.pips ?? null,
            t.risk_reward_ratio ?? null,
            now,
          )
          .run();

        // .run() meta.changes = 0 for INSERT OR IGNORE duplicates
        if (runResult.meta.changes > 0) {
          synced++;
        } else {
          duplicates++;
        }
      } catch {
        duplicates++;
      }
    }

    // Materialize per-user bias stats in background — only if any new trades synced.
    if (synced > 0) {
      c.executionCtx.waitUntil(
        materializeUserBiasStats(c.env, payload.account_id, Math.floor(Date.now() / 1000))
          .catch((e) => console.error('user_bias_stats materialization failed', (e as Error).message)),
      );
    }

    return jsonResponse({ synced, duplicates, invalid }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Journal sync error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

// ── Heartbeat ────────────────────────────────────────────────

app.post('/v1/journal/heartbeat', async (c) => {
  try {
    const rawBody: unknown = await c.req.json();
    const parsed = Heartbeat.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid heartbeat payload', 400, {
        issues: parsed.error.issues,
      });
    }

    const heartbeat = parsed.data;

    const account = await c.env.DB.prepare(
      'SELECT id, api_secret FROM accounts WHERE id = ? LIMIT 1',
    )
      .bind(heartbeat.account_id)
      .first<{ id: string; api_secret: string }>();

    if (!account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    // Reuse the existing heartbeat HMAC pattern (sorted object, not array)
    const payload = rawBody as Record<string, unknown>;
    const sortedObj = Object.keys(payload)
      .filter((key) => key !== 'hmac_signature')
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});
    const canonical = JSON.stringify(sortedObj);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(account.api_secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(canonical));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const hmacSignature = String(payload.hmac_signature ?? '');
    if (computed.length !== hmacSignature.length) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ hmacSignature.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return errorResponse('INVALID_SIGNATURE', 'HMAC signature verification failed', 401);
    }

    await c.env.DB.prepare(
      'UPDATE accounts SET last_heartbeat = ? WHERE id = ?',
    )
      .bind(heartbeat.timestamp, heartbeat.account_id)
      .run();

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Journal heartbeat error:', message);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
});

export default app;

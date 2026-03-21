/**
 * AccountRelay Durable Object
 *
 * Manages per-master-account state: follower configs, open positions,
 * signal fan-out, and long-poll delivery to follower EAs.
 */

import { Hono } from 'hono';
import {
  type SignalPayload,
  type FollowerSignal,
  type PollResponse,
  type ExecutionResult,
  type LotMode,
  validateSignalPayload,
  validateExecutionResult,
  LONG_POLL_TIMEOUT_S,
} from '@edgerelay/shared';
import { checkEquityGuard, type EquityGuardConfig } from './equityGuard.js';
import { calculateLot, type LotSizingConfig } from './lotSizing.js';
import { mapSymbol, type SymbolMapperConfig } from './symbolMapper.js';

// ── Types ────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
}

interface FollowerConfig {
  follower_account_id: string;
  lot_mode: LotMode;
  lot_value: number;
  symbol_suffix: string;
  max_daily_loss_percent: number | null;
  current_daily_loss_percent: number;
  symbol_mappings: Map<string, string>;
  enabled: boolean;
}

interface OpenPosition {
  ticket: number;
  symbol: string;
  volume: number;
  order_type: string;
  open_price: number;
  sl: number;
  tp: number;
  open_time: number;
}

// ── Stale follower cleanup interval (24 hours) ──────────────────
const STALE_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;

// ── Durable Object ──────────────────────────────────────────────

export class AccountRelay implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  private readonly app: Hono;

  /** Follower configs keyed by follower_account_id */
  private followers: Map<string, FollowerConfig> = new Map();

  /** Master's open positions keyed by ticket */
  private openPositions: Map<number, OpenPosition> = new Map();

  /** Signals queued for offline followers */
  private pendingSignals: Map<string, FollowerSignal[]> = new Map();

  /** Last processed sequence number */
  private lastSequenceNum = -1;

  /** Whether follower configs have been loaded from D1 */
  private initialized = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.app = this.buildRouter();

    // Restore in-memory state from DO storage on wake
    void this.state.blockConcurrencyWhile(async () => {
      await this.hydrateFromStorage();
    });
  }

  // ── DurableObject interface ─────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }

  async alarm(): Promise<void> {
    // Stale follower cleanup: remove pending signals for followers
    // that haven't polled in over 24 hours.
    const now = Date.now();
    const staleKeys: string[] = [];

    for (const [followerId, signals] of this.pendingSignals) {
      if (signals.length === 0) {
        staleKeys.push(followerId);
        continue;
      }
      const oldest = signals[0];
      if (oldest && now - oldest.master_timestamp > STALE_CLEANUP_INTERVAL_MS) {
        staleKeys.push(followerId);
      }
    }

    for (const key of staleKeys) {
      this.pendingSignals.delete(key);
    }

    await this.persistToStorage();

    // Reschedule alarm
    await this.state.storage.setAlarm(Date.now() + STALE_CLEANUP_INTERVAL_MS);
  }

  // ── Router ──────────────────────────────────────────────────

  private buildRouter(): Hono {
    const app = new Hono();

    app.post('/signal', async (c) => {
      await this.ensureInitialized();

      const body = await c.req.json<unknown>();
      const parsed = validateSignalPayload(body);

      if (!parsed.success) {
        return c.json({ error: 'Invalid signal payload', details: parsed.error.flatten() }, 400);
      }

      const signal = parsed.data;

      // Reject stale / duplicate sequence numbers
      if (signal.sequence_num <= this.lastSequenceNum) {
        return c.json(
          { error: 'Stale signal', expected_gt: this.lastSequenceNum, received: signal.sequence_num },
          409,
        );
      }

      this.lastSequenceNum = signal.sequence_num;

      // Update open positions map
      this.updateOpenPositions(signal);

      // Fan out to followers
      let followerCount = 0;

      for (const [, follower] of this.followers) {
        if (!follower.enabled) continue;

        // 1. Equity guard
        const equityConfig: EquityGuardConfig = {
          max_daily_loss_percent: follower.max_daily_loss_percent,
          current_daily_loss_percent: follower.current_daily_loss_percent,
        };
        const guard = checkEquityGuard(equityConfig, signal.action);
        if (!guard.allowed) continue;

        // 2. Lot sizing
        const lotConfig: LotSizingConfig = {
          lot_mode: follower.lot_mode,
          lot_value: follower.lot_value,
        };
        const volume = signal.volume != null
          ? calculateLot(lotConfig, signal.volume)
          : undefined;

        // 3. Symbol mapping
        const symbolConfig: SymbolMapperConfig = {
          symbol_suffix: follower.symbol_suffix,
        };
        const mappedSymbol = mapSymbol(signal.symbol, symbolConfig, follower.symbol_mappings);

        // Build follower signal
        const followerSignal: FollowerSignal = {
          signal_id: signal.signal_id,
          action: signal.action,
          order_type: signal.order_type,
          symbol: mappedSymbol,
          volume,
          price: signal.price,
          sl: signal.sl,
          tp: signal.tp,
          magic_number: signal.magic_number,
          ticket: signal.ticket,
          comment: signal.comment,
          master_timestamp: signal.timestamp,
        };

        // Queue for follower
        const queue = this.pendingSignals.get(follower.follower_account_id) ?? [];
        queue.push(followerSignal);
        this.pendingSignals.set(follower.follower_account_id, queue);
        followerCount++;
      }

      await this.persistToStorage();

      return c.json({ processed: true, follower_count: followerCount });
    });

    app.get('/poll/:followerAccountId', async (c) => {
      await this.ensureInitialized();

      const followerAccountId = c.req.param('followerAccountId');

      // Immediate check
      const immediate = this.drainSignals(followerAccountId);
      if (immediate.length > 0) {
        await this.persistToStorage();
        const response: PollResponse = {
          signals: immediate,
          server_time: Date.now(),
        };
        return c.json(response);
      }

      // Long-poll: wait up to LONG_POLL_TIMEOUT_S, checking every 500ms
      const deadline = Date.now() + LONG_POLL_TIMEOUT_S * 1_000;
      const POLL_INTERVAL_MS = 500;

      while (Date.now() < deadline) {
        await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));

        const signals = this.drainSignals(followerAccountId);
        if (signals.length > 0) {
          await this.persistToStorage();
          const response: PollResponse = {
            signals,
            server_time: Date.now(),
          };
          return c.json(response);
        }
      }

      // Timeout — return empty
      const response: PollResponse = {
        signals: [],
        server_time: Date.now(),
      };
      return c.json(response);
    });

    app.post('/execution', async (c) => {
      const body = await c.req.json<unknown>();
      const parsed = validateExecutionResult(body);

      if (!parsed.success) {
        return c.json({ error: 'Invalid execution result', details: parsed.error.flatten() }, 400);
      }

      const result = parsed.data;

      await this.storeExecution(result);

      return c.json({ recorded: true });
    });

    app.post('/config/reload', async (c) => {
      await this.loadFollowersFromD1();
      return c.json({ reloaded: true, follower_count: this.followers.size });
    });

    return app;
  }

  // ── Helpers ─────────────────────────────────────────────────

  private updateOpenPositions(signal: SignalPayload): void {
    const ticket = signal.ticket;
    if (ticket == null) return;

    switch (signal.action) {
      case 'open':
      case 'pending':
        this.openPositions.set(ticket, {
          ticket,
          symbol: signal.symbol,
          volume: signal.volume ?? 0,
          order_type: signal.order_type ?? 'buy',
          open_price: signal.price ?? 0,
          sl: signal.sl ?? 0,
          tp: signal.tp ?? 0,
          open_time: signal.timestamp,
        });
        break;

      case 'close':
      case 'cancel_pending':
        this.openPositions.delete(ticket);
        break;

      case 'modify': {
        const existing = this.openPositions.get(ticket);
        if (existing) {
          existing.sl = signal.sl ?? existing.sl;
          existing.tp = signal.tp ?? existing.tp;
          existing.volume = signal.volume ?? existing.volume;
        }
        break;
      }

      case 'partial_close': {
        const pos = this.openPositions.get(ticket);
        if (pos && signal.volume != null) {
          pos.volume = Math.max(0, pos.volume - signal.volume);
          if (pos.volume <= 0) {
            this.openPositions.delete(ticket);
          }
        }
        break;
      }
    }
  }

  /**
   * Drain all queued signals for a follower, returning them and clearing the queue.
   */
  private drainSignals(followerAccountId: string): FollowerSignal[] {
    const queue = this.pendingSignals.get(followerAccountId);
    if (!queue || queue.length === 0) return [];

    const signals = [...queue];
    this.pendingSignals.set(followerAccountId, []);
    return signals;
  }

  /**
   * Store an execution result in D1.
   */
  private async storeExecution(result: ExecutionResult): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO executions (
        signal_id, follower_account_id, status, block_reason,
        executed_volume, executed_price, slippage_points,
        execution_time_ms, mt5_ticket, error_code, error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        result.signal_id,
        result.follower_account_id,
        result.status,
        result.block_reason ?? null,
        result.executed_volume ?? null,
        result.executed_price ?? null,
        result.slippage_points ?? null,
        result.execution_time_ms ?? null,
        result.mt5_ticket ?? null,
        result.error_code ?? null,
        result.error_message ?? null,
        Date.now(),
      )
      .run();
  }

  // ── Initialization & Persistence ────────────────────────────

  /**
   * Ensure follower configs are loaded. Called on first access
   * or after DO eviction / restart.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.loadFollowersFromD1();
    this.initialized = true;

    // Schedule stale-signal cleanup alarm if not already set
    const existing = await this.state.storage.getAlarm();
    if (existing === null) {
      await this.state.storage.setAlarm(Date.now() + STALE_CLEANUP_INTERVAL_MS);
    }
  }

  /**
   * Load follower configs from D1.
   * The DO id is the master_account_id.
   */
  private async loadFollowersFromD1(): Promise<void> {
    const masterAccountId = this.state.id.toString();

    const rows = await this.env.DB.prepare(
      `SELECT
        f.follower_account_id,
        f.lot_mode,
        f.lot_value,
        f.symbol_suffix,
        f.max_daily_loss_percent,
        f.enabled
      FROM followers f
      WHERE f.master_account_id = ? AND f.enabled = 1`,
    )
      .bind(masterAccountId)
      .all<{
        follower_account_id: string;
        lot_mode: LotMode;
        lot_value: number;
        symbol_suffix: string;
        max_daily_loss_percent: number | null;
        enabled: number;
      }>();

    this.followers.clear();

    for (const row of rows.results) {
      // Load explicit symbol mappings for this follower
      const mappingRows = await this.env.DB.prepare(
        `SELECT source_symbol, target_symbol
         FROM symbol_mappings
         WHERE follower_account_id = ?`,
      )
        .bind(row.follower_account_id)
        .all<{ source_symbol: string; target_symbol: string }>();

      const symbolMappings = new Map<string, string>();
      for (const m of mappingRows.results) {
        symbolMappings.set(m.source_symbol, m.target_symbol);
      }

      this.followers.set(row.follower_account_id, {
        follower_account_id: row.follower_account_id,
        lot_mode: row.lot_mode,
        lot_value: row.lot_value,
        symbol_suffix: row.symbol_suffix ?? '',
        max_daily_loss_percent: row.max_daily_loss_percent,
        current_daily_loss_percent: 0, // MVP: reset on load
        symbol_mappings: symbolMappings,
        enabled: row.enabled === 1,
      });
    }
  }

  /**
   * Hydrate ephemeral state from Durable Object transactional storage.
   */
  private async hydrateFromStorage(): Promise<void> {
    const stored = await this.state.storage.get<{
      lastSequenceNum: number;
      openPositions: Array<[number, OpenPosition]>;
      pendingSignals: Array<[string, FollowerSignal[]]>;
    }>('relay_state');

    if (stored) {
      this.lastSequenceNum = stored.lastSequenceNum;
      this.openPositions = new Map(stored.openPositions);
      this.pendingSignals = new Map(stored.pendingSignals);
    }
  }

  /**
   * Persist critical state to Durable Object transactional storage
   * so it survives eviction.
   */
  private async persistToStorage(): Promise<void> {
    await this.state.storage.put('relay_state', {
      lastSequenceNum: this.lastSequenceNum,
      openPositions: Array.from(this.openPositions.entries()),
      pendingSignals: Array.from(this.pendingSignals.entries()),
    });
  }
}

import { z } from 'zod';

// ── Signal Actions ──────────────────────────────────────────────
export const SignalAction = z.enum([
  'open',
  'modify',
  'partial_close',
  'close',
  'pending',
  'cancel_pending',
]);
export type SignalAction = z.infer<typeof SignalAction>;

export const OrderType = z.enum([
  'buy',
  'sell',
  'buy_limit',
  'buy_stop',
  'sell_limit',
  'sell_stop',
]);
export type OrderType = z.infer<typeof OrderType>;

// ── Signal Payload (EA → Worker) ────────────────────────────────
export const SignalPayload = z.object({
  signal_id: z.string().min(1),
  account_id: z.string().min(1),
  sequence_num: z.number().int().nonnegative(),
  action: SignalAction,
  order_type: OrderType.optional(),
  symbol: z.string().min(1),
  volume: z.number().positive().optional(),
  price: z.number().positive().optional(),
  sl: z.number().nonnegative().optional(),
  tp: z.number().nonnegative().optional(),
  magic_number: z.number().int().optional(),
  ticket: z.number().int().optional(),
  comment: z.string().max(256).optional(),
  timestamp: z.number().int().positive(),
  hmac_signature: z.string().min(1),
});
export type SignalPayload = z.infer<typeof SignalPayload>;

// ── Execution Result (Follower EA → Worker) ─────────────────────
export const ExecutionStatus = z.enum([
  'executed',
  'failed',
  'blocked',
  'skipped',
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatus>;

export const ExecutionResult = z.object({
  signal_id: z.string().min(1),
  follower_account_id: z.string().min(1),
  status: ExecutionStatus,
  block_reason: z.string().optional(),
  executed_volume: z.number().optional(),
  executed_price: z.number().optional(),
  slippage_points: z.number().optional(),
  execution_time_ms: z.number().int().optional(),
  mt5_ticket: z.number().int().optional(),
  error_code: z.number().int().optional(),
  error_message: z.string().optional(),
});
export type ExecutionResult = z.infer<typeof ExecutionResult>;

// ── Heartbeat ───────────────────────────────────────────────────
export const Heartbeat = z.object({
  account_id: z.string().min(1),
  timestamp: z.number().int().positive(),
  hmac_signature: z.string().min(1),
});
export type Heartbeat = z.infer<typeof Heartbeat>;

// ── Account Types ───────────────────────────────────────────────
export const AccountRole = z.enum(['master', 'follower']);
export type AccountRole = z.infer<typeof AccountRole>;

export const LotMode = z.enum(['mirror', 'fixed', 'multiplier', 'risk_percent']);
export type LotMode = z.infer<typeof LotMode>;

export const PlanTier = z.enum(['free', 'starter', 'pro', 'unlimited', 'provider']);
export type PlanTier = z.infer<typeof PlanTier>;

// ── API Response Envelope ───────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Poll Response (Worker → Follower EA) ────────────────────────
export interface PollResponse {
  signals: FollowerSignal[];
  server_time: number;
}

export interface FollowerSignal {
  signal_id: string;
  action: SignalAction;
  order_type?: OrderType;
  symbol: string;
  volume?: number;
  price?: number;
  sl?: number;
  tp?: number;
  magic_number?: number;
  ticket?: number;
  comment?: string;
  master_timestamp: number;
}

// ── Plan Limits ─────────────────────────────────────────────────
export const PLAN_LIMITS: Record<PlanTier, { masters: number; followers: number }> = {
  free: { masters: 1, followers: 1 },
  starter: { masters: 1, followers: 3 },
  pro: { masters: 1, followers: 10 },
  unlimited: { masters: 5, followers: 999 },
  provider: { masters: 10, followers: 999 },
};

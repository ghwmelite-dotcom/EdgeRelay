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
  'buy_stop_limit',
  'sell_stop_limit',
]);
export type OrderType = z.infer<typeof OrderType>;

export const SourcePlatform = z.enum(['mt5', 'ctrader', 'dxtrade', 'tradelocker']);
export type SourcePlatform = z.infer<typeof SourcePlatform>;

export const NormalizedOrderType = z.enum([
  'market_buy', 'market_sell',
  'limit_buy', 'limit_sell',
  'stop_buy', 'stop_sell',
  'stop_limit_buy', 'stop_limit_sell',
]);
export type NormalizedOrderType = z.infer<typeof NormalizedOrderType>;

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
  source_platform: SourcePlatform.optional(),
  normalized_order_type: NormalizedOrderType.optional(),
  platform_specific: z.record(z.unknown()).optional(),
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
  normalized_order_type?: string;
}

// ── Plan Limits ─────────────────────────────────────────────────
export const PLAN_LIMITS: Record<PlanTier, { masters: number; followers: number }> = {
  free: { masters: 1, followers: 1 },
  starter: { masters: 1, followers: 3 },
  pro: { masters: 1, followers: 10 },
  unlimited: { masters: 5, followers: 999 },
  provider: { masters: 10, followers: 999 },
};

// ── PropGuard Types ─────────────────────────────────────────────

export const DrawdownType = z.enum(['static', 'trailing', 'eod_trailing']);
export type DrawdownType = z.infer<typeof DrawdownType>;

export const DailyLossCalculation = z.enum([
  'balance_start_of_day',
  'equity_high_of_day',
  'previous_day_balance',
  'higher_of_both',
]);
export type DailyLossCalculation = z.infer<typeof DailyLossCalculation>;

export const PropGuardStatus = z.enum([
  'protected',
  'warning',
  'critical',
  'locked',
  'disconnected',
]);
export type PropGuardStatus = z.infer<typeof PropGuardStatus>;

export const ChallengePhase = z.enum([
  'evaluation', 'verification', 'funded',
  'evaluation_1', 'evaluation_2', 'express', 'instant',
]);
export type ChallengePhase = z.infer<typeof ChallengePhase>;

// ── PropGuard Rule Set ──────────────────────────────────────────

export const PropRuleSet = z.object({
  preset_name: z.string().optional(),
  challenge_phase: ChallengePhase.default('evaluation'),
  initial_balance: z.number().positive(),
  profit_target_percent: z.number().min(0).default(10),
  max_daily_loss_percent: z.number().min(0).default(5),
  daily_loss_calculation: DailyLossCalculation.default('balance_start_of_day'),
  max_total_drawdown_percent: z.number().min(0).default(10),
  drawdown_type: DrawdownType.default('static'),
  trailing_drawdown_lock_at_breakeven: z.boolean().default(false),
  max_lot_size: z.number().positive().default(100),
  max_open_positions: z.number().int().min(0).default(50),
  max_daily_trades: z.number().int().min(0).default(0),
  min_trading_days: z.number().int().min(0).default(0),
  consistency_rule_enabled: z.boolean().default(false),
  max_profit_from_single_day_percent: z.number().min(0).default(30),
  allowed_trading_start: z.string().default('00:00'),
  allowed_trading_end: z.string().default('23:59'),
  block_weekend_holding: z.boolean().default(false),
  block_during_news: z.boolean().default(false),
  news_block_minutes_before: z.number().int().min(0).default(5),
  news_block_minutes_after: z.number().int().min(0).default(5),
  allowed_symbols: z.array(z.string()).default([]),
  blocked_symbols: z.array(z.string()).default([]),
  warning_threshold_percent: z.number().min(0).max(100).default(80),
  critical_threshold_percent: z.number().min(0).max(100).default(95),
  auto_close_at_critical: z.boolean().default(true),
  challenge_start_date: z.string().optional(),
  challenge_end_date: z.string().optional(),
});
export type PropRuleSet = z.infer<typeof PropRuleSet>;

export const validatePropRuleSet = (data: unknown) => PropRuleSet.safeParse(data);

// ── Equity State (EA → Cloud sync) ─────────────────────────────

export const EquitySnapshot = z.object({
  balance: z.number(),
  equity: z.number(),
  floating_pnl: z.number(),
  daily_pnl: z.number(),
  daily_pnl_percent: z.number(),
  high_water_mark: z.number(),
  total_drawdown_percent: z.number(),
  balance_start_of_day: z.number(),
  equity_high_of_day: z.number(),
  trades_today: z.number().int(),
  positions_open: z.number().int(),
});
export type EquitySnapshot = z.infer<typeof EquitySnapshot>;

export const validateEquitySnapshot = (data: unknown) => EquitySnapshot.safeParse(data);

// ── Blocked Trade ───────────────────────────────────────────────

export const BlockedTradeReport = z.object({
  rule_violated: z.string(),
  rule_details: z.string(),
  attempted_action: z.string(),
  attempted_symbol: z.string(),
  attempted_volume: z.number(),
  attempted_price: z.number().optional(),
  current_daily_loss_percent: z.number().optional(),
  current_total_drawdown_percent: z.number().optional(),
  current_equity: z.number().optional(),
});
export type BlockedTradeReport = z.infer<typeof BlockedTradeReport>;

export const validateBlockedTradeReport = (data: unknown) => BlockedTradeReport.safeParse(data);

// ── Emergency Close ─────────────────────────────────────────────

export const EmergencyCloseReport = z.object({
  reason: z.string(),
  equity_at_close: z.number(),
  positions_closed: z.number().int(),
});
export type EmergencyCloseReport = z.infer<typeof EmergencyCloseReport>;

export const validateEmergencyCloseReport = (data: unknown) => EmergencyCloseReport.safeParse(data);

// ── News Event ──────────────────────────────────────────────────

export const NewsImpact = z.enum(['low', 'medium', 'high']);
export type NewsImpact = z.infer<typeof NewsImpact>;

export interface NewsEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: NewsImpact;
  event_time: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

// ── PropGuard Verdict (server-side evaluation) ──────────────────

export interface PropGuardVerdict {
  allowed: boolean;
  blocked_rule?: string;
  blocked_reason?: string;
  current_daily_loss_pct: number;
  current_drawdown_pct: number;
  projected_daily_loss_pct: number;
  projected_drawdown_pct: number;
}

// ── Daily Stats ─────────────────────────────────────────────────

export interface DailyStat {
  id: string;
  account_id: string;
  date: string;
  balance_start_of_day: number;
  equity_high_of_day: number;
  equity_low_of_day: number;
  balance_end_of_day: number;
  daily_pnl: number;
  daily_pnl_percent: number;
  high_water_mark: number;
  total_drawdown_percent: number;
  trades_taken: number;
  trades_blocked: number;
  consistency_score: number;
  warnings_triggered: number;
  critical_events: number;
}

// ── Prop Firm Presets ───────────────────────────────────────────

export const PROP_FIRM_PRESETS: Record<string, Partial<PropRuleSet>> = {
  FTMO_Evaluation: {
    preset_name: 'FTMO_Evaluation',
    profit_target_percent: 10,
    max_daily_loss_percent: 5,
    daily_loss_calculation: 'equity_high_of_day',
    max_total_drawdown_percent: 10,
    drawdown_type: 'static',
    min_trading_days: 4,
    consistency_rule_enabled: false,
    block_during_news: false,
    block_weekend_holding: false,
  },
  FTMO_Verification: {
    preset_name: 'FTMO_Verification',
    profit_target_percent: 5,
    max_daily_loss_percent: 5,
    daily_loss_calculation: 'equity_high_of_day',
    max_total_drawdown_percent: 10,
    drawdown_type: 'static',
    min_trading_days: 4,
  },
  FundedNext_Evaluation: {
    preset_name: 'FundedNext_Evaluation',
    profit_target_percent: 10,
    max_daily_loss_percent: 5,
    daily_loss_calculation: 'balance_start_of_day',
    max_total_drawdown_percent: 10,
    drawdown_type: 'static',
    consistency_rule_enabled: true,
    max_profit_from_single_day_percent: 30,
    block_during_news: true,
    news_block_minutes_before: 5,
    news_block_minutes_after: 5,
  },
  The5ers_HighStakes: {
    preset_name: 'The5ers_HighStakes',
    profit_target_percent: 8,
    max_daily_loss_percent: 5,
    max_total_drawdown_percent: 6,
    drawdown_type: 'trailing',
    trailing_drawdown_lock_at_breakeven: true,
  },
  Apex_Evaluation: {
    preset_name: 'Apex_Evaluation',
    profit_target_percent: 6,
    max_daily_loss_percent: 2.5,
    max_total_drawdown_percent: 6,
    drawdown_type: 'eod_trailing',
    block_weekend_holding: true,
  },
  MyFundedFutures: {
    preset_name: 'MyFundedFutures',
    profit_target_percent: 9,
    max_daily_loss_percent: 4,
    max_total_drawdown_percent: 6,
    drawdown_type: 'eod_trailing',
    consistency_rule_enabled: true,
    max_profit_from_single_day_percent: 35,
  },
  TopStep_Combine: {
    preset_name: 'TopStep_Combine',
    profit_target_percent: 6,
    max_daily_loss_percent: 2,
    max_total_drawdown_percent: 4.5,
    drawdown_type: 'eod_trailing',
  },
};

// ── Journal Sync ────────────────────────────────────────────

export const DealDirection = z.enum(['buy', 'sell']);
export type DealDirection = z.infer<typeof DealDirection>;

export const DealEntry = z.enum(['in', 'out', 'inout']);
export type DealEntry = z.infer<typeof DealEntry>;

export const SessionTag = z.enum(['asian', 'london', 'new_york', 'off_hours']);
export type SessionTag = z.infer<typeof SessionTag>;

export const JournalTrade = z.object({
  deal_ticket: z.number().int().positive(),
  order_ticket: z.number().int().optional(),
  position_id: z.number().int().optional(),
  symbol: z.string().min(1),
  direction: DealDirection,
  deal_entry: DealEntry,
  volume: z.number().positive(),
  price: z.number().optional(),
  sl: z.number().optional(),
  tp: z.number().optional(),
  time: z.number().int().positive(),
  profit: z.number().optional(),
  commission: z.number().optional(),
  swap: z.number().optional(),
  magic_number: z.number().int().optional(),
  comment: z.string().max(256).optional(),
  balance_at_trade: z.number().optional(),
  equity_at_trade: z.number().optional(),
  spread_at_entry: z.number().int().optional(),
  atr_at_entry: z.number().optional(),
  session_tag: SessionTag.optional(),
  duration_seconds: z.number().int().nonnegative().optional().nullable(),
  pips: z.number().optional().nullable(),
  risk_reward_ratio: z.number().optional().nullable(),
});
export type JournalTrade = z.infer<typeof JournalTrade>;

export const JournalSyncPayload = z.object({
  account_id: z.string().min(1),
  timestamp: z.number().int().positive(),
  trades: z.array(JournalTrade).min(1).max(10),
  hmac_signature: z.string().min(1),
});
export type JournalSyncPayload = z.infer<typeof JournalSyncPayload>;

export const JOURNAL_RATE_LIMIT_PER_MINUTE = 120;

export function validateJournalSyncPayload(data: unknown) {
  return JournalSyncPayload.safeParse(data);
}

// ── Firm Templates ──────────────────────────────────────────

export const DailyLossType = z.enum(['balance', 'equity', 'higher_of_both']);
export type DailyLossType = z.infer<typeof DailyLossType>;

export const FirmTemplate = z.object({
  id: z.string(),
  firm_name: z.string(),
  plan_name: z.string(),
  challenge_phase: ChallengePhase,
  initial_balance: z.number(),
  profit_target_percent: z.number().nullable(),
  profit_target_amount: z.number().nullable(),
  daily_loss_percent: z.number(),
  max_drawdown_percent: z.number(),
  max_drawdown_amount: z.number().nullable(),
  daily_loss_type: DailyLossType,
  drawdown_type: z.enum(['static', 'trailing', 'eod_trailing']),
  min_trading_days: z.number().nullable(),
  max_calendar_days: z.number().nullable(),
  news_trading_restricted: z.boolean(),
  news_minutes_before: z.number(),
  news_minutes_after: z.number(),
  weekend_holding_allowed: z.boolean(),
  max_lot_size: z.number().nullable(),
  consistency_rule: z.boolean(),
  max_daily_profit_percent: z.number().nullable(),
  source_url: z.string().nullable(),
  verified: z.boolean(),
  version: z.number(),
});
export type FirmTemplate = z.infer<typeof FirmTemplate>;

export const FirmTemplateSubmission = z.object({
  firm_name: z.string().min(1),
  plan_name: z.string().min(1),
  challenge_phase: ChallengePhase,
  initial_balance: z.number().positive(),
  profit_target_percent: z.number().nullable().optional(),
  profit_target_amount: z.number().nullable().optional(),
  daily_loss_percent: z.number().positive(),
  max_drawdown_percent: z.number().positive(),
  max_drawdown_amount: z.number().nullable().optional(),
  daily_loss_type: DailyLossType,
  drawdown_type: z.enum(['static', 'trailing', 'eod_trailing']),
  min_trading_days: z.number().int().nullable().optional(),
  max_calendar_days: z.number().int().nullable().optional(),
  news_trading_restricted: z.boolean().optional().default(false),
  news_minutes_before: z.number().int().optional().default(2),
  news_minutes_after: z.number().int().optional().default(2),
  weekend_holding_allowed: z.boolean().optional().default(true),
  max_lot_size: z.number().nullable().optional(),
  consistency_rule: z.boolean().optional().default(false),
  max_daily_profit_percent: z.number().nullable().optional(),
  source_url: z.string().url(),
});
export type FirmTemplateSubmission = z.infer<typeof FirmTemplateSubmission>;

export interface AccountHealth {
  status: 'safe' | 'caution' | 'danger';
  score: number;
  daily_loss: {
    current_percent: number;
    limit_percent: number;
    used_percent: number;
    status: 'safe' | 'caution' | 'danger';
  } | null;
  drawdown: {
    current_percent: number;
    limit_percent: number;
    used_percent: number;
    status: 'safe' | 'caution' | 'danger';
  };
  profit_target: {
    current_percent: number;
    target_percent: number;
    progress_percent: number;
  } | null;
  time: {
    days_used: number;
    days_remaining: number | null;
    min_days_met: boolean;
  } | null;
  warnings: string[];
}

import type { AccountHealth } from '@edgerelay/shared';

// ── Types ──────────────────────────────────────────────────

export interface HealthInput {
  current_balance: number;
  current_equity: number;
  starting_balance: number;
  daily_pnl: number;
  total_pnl: number;
  high_water_mark: number;
  initial_balance: number;
  daily_loss_percent: number;
  max_drawdown_percent: number;
  max_drawdown_amount: number | null;
  daily_loss_type: string;
  drawdown_type: string;
  profit_target_percent: number | null;
  profit_target_amount: number | null;
  min_trading_days: number | null;
  max_calendar_days: number | null;
  start_date: string | null;
  trading_days_completed: number;
}

type HealthStatus = 'safe' | 'caution' | 'danger';

// ── Helpers ────────────────────────────────────────────────

function toStatus(usedPercent: number): HealthStatus {
  if (usedPercent > 80) return 'danger';
  if (usedPercent >= 60) return 'caution';
  return 'safe';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  const rank: Record<HealthStatus, number> = { safe: 0, caution: 1, danger: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function daysBetween(startStr: string, now: Date): number {
  const start = new Date(startStr);
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ── Daily Loss Type Mapping ────────────────────────────────

export function mapDailyLossType(templateType: string): string {
  const MAP: Record<string, string> = {
    'balance': 'balance_start_of_day',
    'equity': 'equity_high_of_day',
    'higher_of_both': 'higher_of_both',
  };
  return MAP[templateType] ?? 'balance_start_of_day';
}

// ── Health Evaluation ──────────────────────────────────────

export function evaluateHealth(input: HealthInput): AccountHealth {
  const warnings: string[] = [];

  // ── Daily Loss ─────────────────────────────────────────
  // Sentinel: daily_loss_percent >= 100 means "no daily loss limit" (e.g. Apex)
  const hasDailyLossLimit = input.daily_loss_percent < 100;

  let dailyLossUsedPercent = 0;
  let dailyLossResult: AccountHealth['daily_loss'] = null;

  if (hasDailyLossLimit) {
    const dailyLossLimit = input.initial_balance * input.daily_loss_percent / 100;
    dailyLossUsedPercent = dailyLossLimit > 0
      ? Math.abs(input.daily_pnl) / dailyLossLimit * 100
      : 0;

    const dailyLossStatus = toStatus(dailyLossUsedPercent);
    const currentDailyLossPercent = input.initial_balance > 0
      ? Math.abs(input.daily_pnl) / input.initial_balance * 100
      : 0;

    dailyLossResult = {
      current_percent: Math.round(currentDailyLossPercent * 100) / 100,
      limit_percent: input.daily_loss_percent,
      used_percent: Math.round(dailyLossUsedPercent * 100) / 100,
      status: dailyLossStatus,
    };

    if (dailyLossStatus === 'danger') {
      warnings.push(
        `Daily loss at ${dailyLossResult.used_percent.toFixed(1)}% of limit — approaching breach threshold`
      );
    } else if (dailyLossStatus === 'caution') {
      warnings.push(
        `Daily loss at ${dailyLossResult.used_percent.toFixed(1)}% of limit — exercise caution`
      );
    }
  }

  // ── Drawdown ───────────────────────────────────────────
  let drawdownUsedPercent = 0;
  let currentDrawdownPercent = 0;

  if (input.drawdown_type === 'static') {
    const drawdownLimit = input.initial_balance * input.max_drawdown_percent / 100;
    const currentDrawdown = input.initial_balance - input.current_equity;
    currentDrawdownPercent = input.initial_balance > 0
      ? currentDrawdown / input.initial_balance * 100
      : 0;
    drawdownUsedPercent = drawdownLimit > 0
      ? currentDrawdown / drawdownLimit * 100
      : 0;
  } else {
    // trailing or eod_trailing
    const drawdownLimit = input.max_drawdown_amount
      ?? (input.initial_balance * input.max_drawdown_percent / 100);
    const currentDrawdown = input.high_water_mark - input.current_equity;
    currentDrawdownPercent = input.high_water_mark > 0
      ? currentDrawdown / input.high_water_mark * 100
      : 0;
    drawdownUsedPercent = drawdownLimit > 0
      ? currentDrawdown / drawdownLimit * 100
      : 0;
  }

  const drawdownStatus = toStatus(drawdownUsedPercent);

  const drawdownResult: AccountHealth['drawdown'] = {
    current_percent: Math.round(currentDrawdownPercent * 100) / 100,
    limit_percent: input.max_drawdown_percent,
    used_percent: Math.round(drawdownUsedPercent * 100) / 100,
    status: drawdownStatus,
  };

  if (drawdownStatus === 'danger') {
    warnings.push(
      `Drawdown at ${drawdownResult.used_percent.toFixed(1)}% of limit — approaching breach threshold`
    );
  } else if (drawdownStatus === 'caution') {
    warnings.push(
      `Drawdown at ${drawdownResult.used_percent.toFixed(1)}% of limit — exercise caution`
    );
  }

  // ── Profit Target ──────────────────────────────────────
  let profitTargetResult: AccountHealth['profit_target'] = null;
  let profitProgressPercent = 0;

  const targetAmount = input.profit_target_amount
    ?? (input.profit_target_percent != null
      ? input.initial_balance * input.profit_target_percent / 100
      : null);

  if (targetAmount != null && targetAmount > 0) {
    profitProgressPercent = input.total_pnl / targetAmount * 100;
    const targetPercent = input.profit_target_percent
      ?? (input.initial_balance > 0 ? targetAmount / input.initial_balance * 100 : 0);
    const currentPercent = input.initial_balance > 0
      ? input.total_pnl / input.initial_balance * 100
      : 0;

    profitTargetResult = {
      current_percent: Math.round(currentPercent * 100) / 100,
      target_percent: Math.round(targetPercent * 100) / 100,
      progress_percent: Math.round(clamp(profitProgressPercent, 0, 100) * 100) / 100,
    };

    if (profitProgressPercent >= 100) {
      warnings.push('Profit target reached — eligible for payout or phase advance');
    }
  }

  // ── Time Metrics ───────────────────────────────────────
  let timeResult: AccountHealth['time'] = null;

  if (input.max_calendar_days != null || input.min_trading_days != null) {
    const daysUsed = input.start_date
      ? daysBetween(input.start_date, new Date())
      : input.trading_days_completed;

    const daysRemaining = input.max_calendar_days != null
      ? Math.max(0, input.max_calendar_days - daysUsed)
      : null;

    const minDaysMet = input.min_trading_days != null
      ? input.trading_days_completed >= input.min_trading_days
      : true;

    timeResult = {
      days_used: daysUsed,
      days_remaining: daysRemaining,
      min_days_met: minDaysMet,
    };

    if (daysRemaining != null && daysRemaining <= 5 && daysRemaining > 0) {
      warnings.push(`Only ${daysRemaining} calendar day${daysRemaining === 1 ? '' : 's'} remaining`);
    } else if (daysRemaining === 0) {
      warnings.push('Calendar time limit has expired');
    }

    if (!minDaysMet && input.min_trading_days != null) {
      const remaining = input.min_trading_days - input.trading_days_completed;
      warnings.push(`${remaining} more trading day${remaining === 1 ? '' : 's'} needed to meet minimum requirement`);
    }
  }

  // ── Overall Status & Score ─────────────────────────────
  let overallStatus: HealthStatus = drawdownStatus;
  if (hasDailyLossLimit && dailyLossResult) {
    overallStatus = worstStatus(dailyLossResult.status, drawdownStatus);
  }

  const dailyLossWeight = hasDailyLossLimit ? dailyLossUsedPercent * 0.4 : 0;
  const drawdownWeight = drawdownUsedPercent * 0.4;
  const profitBonus = clamp(profitProgressPercent, 0, 100) * 0.2;

  const score = clamp(100 - dailyLossWeight - drawdownWeight + profitBonus, 0, 100);

  return {
    status: overallStatus,
    score: Math.round(score * 100) / 100,
    daily_loss: dailyLossResult,
    drawdown: drawdownResult,
    profit_target: profitTargetResult,
    time: timeResult,
    warnings,
  };
}

/**
 * Equity guard — checks whether a follower is allowed to open a new position
 * based on configured risk limits.
 *
 * MVP: simple gate on max_daily_loss_percent config value.
 * Full equity tracking (actual P&L calculation) is deferred to a later phase.
 */

import type { SignalAction } from '@edgerelay/shared';

export interface EquityGuardConfig {
  max_daily_loss_percent: number | null;
  /** Running daily loss percentage (updated externally). */
  current_daily_loss_percent: number;
}

export interface EquityGuardResult {
  allowed: boolean;
  reason?: string;
}

export function checkEquityGuard(
  config: EquityGuardConfig,
  action: SignalAction,
): EquityGuardResult {
  // Only gate on new position opens
  if (action !== 'open' && action !== 'pending') {
    return { allowed: true };
  }

  // If no daily loss limit configured, allow
  if (config.max_daily_loss_percent === null || config.max_daily_loss_percent <= 0) {
    return { allowed: true };
  }

  if (config.current_daily_loss_percent >= config.max_daily_loss_percent) {
    return {
      allowed: false,
      reason: `Daily loss limit reached: ${config.current_daily_loss_percent.toFixed(2)}% >= ${config.max_daily_loss_percent.toFixed(2)}% max`,
    };
  }

  return { allowed: true };
}

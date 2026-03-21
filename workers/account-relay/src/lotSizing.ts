/**
 * Lot sizing — transforms the master's volume into the follower's volume
 * based on the follower's lot mode configuration.
 */

import type { LotMode } from '@edgerelay/shared';

const MIN_LOT = 0.01;
const MAX_LOT = 100.0;

export interface LotSizingConfig {
  lot_mode: LotMode;
  lot_value: number;
}

/**
 * Calculate the follower's lot size from the master's volume.
 *
 * @param config  Follower's lot sizing configuration
 * @param masterVolume  Master account's trade volume
 * @returns  Clamped lot size for the follower (0.01 – 100.0)
 */
export function calculateLot(config: LotSizingConfig, masterVolume: number): number {
  let result: number;

  switch (config.lot_mode) {
    case 'mirror':
      result = masterVolume;
      break;

    case 'fixed':
      result = config.lot_value;
      break;

    case 'multiplier':
      result = masterVolume * config.lot_value;
      break;

    case 'risk_percent':
      // Placeholder — needs account equity from broker connection.
      // For now, use lot_value directly as the lot size.
      result = config.lot_value;
      break;

    default: {
      // Exhaustive check
      const _exhaustive: never = config.lot_mode;
      throw new Error(`Unknown lot mode: ${_exhaustive}`);
    }
  }

  return Math.min(MAX_LOT, Math.max(MIN_LOT, Math.round(result * 100) / 100));
}

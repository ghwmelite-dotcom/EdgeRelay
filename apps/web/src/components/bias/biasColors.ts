// Shared color + decimal helpers for bias components.
import type { BiasDirection, AssetBias } from '@edgerelay/shared';

export const BIAS_COLOR: Record<BiasDirection, string> = {
  BULLISH: '#00ff9d',
  BEARISH: '#ff3d57',
  NEUTRAL: '#a3a3a3',
};

export const BIAS_BADGE_CLASS: Record<BiasDirection, string> = {
  BULLISH: 'bg-neon-green/10 text-neon-green border-neon-green/30',
  BEARISH: 'bg-neon-red/10 text-neon-red border-neon-red/30',
  NEUTRAL: 'bg-terminal-border/40 text-terminal-muted border-terminal-border',
};

export const CATEGORY_ICON: Record<AssetBias['category'], string> = {
  Metal: '🪙',
  Index: '📊',
  Forex: '💱',
};

export function decimalsFor(asset: Pick<AssetBias, 'symbol' | 'category'>): number {
  if (asset.category === 'Forex') return 5;
  return 2;
}

export function fmtPrice(n: number, decimals: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

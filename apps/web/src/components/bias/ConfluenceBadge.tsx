// ⚡ A+ SETUP badge — renders only when 4H and 1H both align on a tradeable
// bias. The single most important glanceable signal on the platform.
import type { AssetBias } from '@edgerelay/shared';

interface ConfluenceBadgeProps {
  asset: AssetBias;
  size?: 'sm' | 'md';
}

export function ConfluenceBadge({ asset, size = 'sm' }: ConfluenceBadgeProps) {
  if (!asset.confluence?.aligned) return null;

  const color = asset.confluence.direction === 'BULLISH' ? '#00ff9d' : '#ff3d57';
  const compact = size === 'sm';

  return (
    <span
      className={
        compact
          ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.18em] animate-pulse'
          : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-[0.2em] animate-pulse'
      }
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}50`,
        boxShadow: `0 0 12px ${color}40, inset 0 0 12px ${color}10`,
      }}
      title={asset.confluence.reason}
    >
      <span style={{ fontSize: compact ? 10 : 13, lineHeight: 1 }}>⚡</span>
      A+ Setup
    </span>
  );
}

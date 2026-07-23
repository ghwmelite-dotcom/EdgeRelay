// Compact chip for the dashboard strip. One horizontal row across all 5
// assets, high information density, designed not to steal vertical real
// estate from the existing dashboard layout.
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { AssetBias } from '@edgerelay/shared';
import { Sparkline } from './Sparkline';
import { PhasePip } from './ICCPhaseIndicator';
import { ConfluenceBadge } from './ConfluenceBadge';
import { BIAS_COLOR, decimalsFor, fmtPrice } from './biasColors';

interface AssetBiasChipProps {
  asset: AssetBias;
  delay?: number;
}

export function AssetBiasChip({ asset, delay = 0 }: AssetBiasChipProps) {
  const dec = decimalsFor(asset);
  const biasColor = BIAS_COLOR[asset.bias];
  const isPositive = asset.change24h >= 0;

  return (
    <Link
      to={`/bias/${asset.symbol.toLowerCase()}`}
      className={clsx(
        'group relative flex flex-col gap-2 rounded-xl px-3 py-3 animate-fade-in-up',
        'bg-terminal-surface/40 hover:bg-terminal-surface/60 border transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan',
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderColor: `${biasColor}25`,
        boxShadow: `inset 0 0 18px ${biasColor}04`,
      }}
    >
      {/* Top row: symbol + bias badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-mono-nums text-[13px] font-bold text-slate-100 truncate">
            {asset.symbol}
          </p>
        </div>
        <span
          className="font-mono-nums text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
          style={{
            color: biasColor,
            background: `${biasColor}15`,
            border: `1px solid ${biasColor}30`,
          }}
        >
          {asset.bias === 'BULLISH' ? '▲ BULL' : asset.bias === 'BEARISH' ? '▼ BEAR' : '◆ FLAT'}
        </span>
      </div>

      {/* Middle row: price + sparkline */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono-nums text-[13px] font-bold text-slate-200 leading-none truncate">
            {asset.error ? '—' : fmtPrice(asset.price, dec)}
          </p>
          <p
            className="font-mono-nums text-[10px] mt-0.5"
            style={{ color: isPositive ? '#00ff9d' : '#ff3d57' }}
          >
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
          </p>
        </div>
        <Sparkline data={asset.sparkData} width={52} height={18} />
      </div>

      {/* Bottom row: phase pip + score, or A+ SETUP takeover when aligned */}
      {asset.confluence?.aligned ? (
        <div className="flex items-center justify-between gap-1">
          <ConfluenceBadge asset={asset} size="sm" />
          <span
            className="font-mono-nums text-[10px] font-bold"
            style={{ color: biasColor }}
          >
            {asset.score > 0 ? '+' : ''}{asset.score}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <PhasePip phase={asset.icc.phase.current} marketState={asset.icc.marketState.state} />
          <span
            className="font-mono-nums text-[10px] font-bold"
            style={{ color: biasColor }}
          >
            {asset.score > 0 ? '+' : ''}{asset.score}
          </span>
        </div>
      )}
    </Link>
  );
}

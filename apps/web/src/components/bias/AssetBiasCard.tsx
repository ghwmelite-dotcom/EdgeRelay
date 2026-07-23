// Full-size card for the /bias page grid. Tap to expand the detail panel.
import { clsx } from 'clsx';
import type { AssetBias, AccuracyBreakdown } from '@edgerelay/shared';
import { Sparkline } from './Sparkline';
import { PhasePip } from './ICCPhaseIndicator';
import { ConfluenceBadge } from './ConfluenceBadge';
import { AccuracyStat } from './AccuracyStat';
import { BIAS_COLOR, BIAS_BADGE_CLASS, decimalsFor, fmtPrice } from './biasColors';

interface AssetBiasCardProps {
  asset: AssetBias;
  selected?: boolean;
  onSelect?: (symbol: string) => void;
  accuracy?: AccuracyBreakdown;
  delay?: number;
}

export function AssetBiasCard({ asset, selected, onSelect, accuracy, delay = 0 }: AssetBiasCardProps) {
  const dec = decimalsFor(asset);
  const biasColor = BIAS_COLOR[asset.bias];
  const isPositive = asset.change24h >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(asset.symbol)}
      className={clsx(
        'glass-premium card-hover-premium rounded-2xl p-5 text-left w-full animate-fade-in-up relative overflow-hidden',
        'transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan',
        selected && 'ring-2 ring-neon-cyan/60',
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderLeft: `3px solid ${biasColor}`,
      }}
      aria-pressed={selected}
    >
      {/* Subtle accent wash */}
      <div
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${biasColor}10 0%, transparent 70%)` }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono-nums text-sm font-bold text-slate-100 tracking-wide">
              {asset.symbol}
            </p>
            <span className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">
              {asset.category}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{asset.label}</p>
        </div>

        <span
          className={clsx(
            'chip border',
            BIAS_BADGE_CLASS[asset.bias],
          )}
          style={{ boxShadow: `0 0 10px ${biasColor}15` }}
        >
          {asset.bias}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-mono-nums text-2xl font-black text-slate-100 leading-none">
            {asset.error ? '—' : fmtPrice(asset.price, dec)}
          </p>
          <p
            className="font-mono-nums text-[11px] mt-1"
            style={{ color: isPositive ? '#00ff9d' : '#ff3d57' }}
          >
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}% 24h
          </p>
        </div>

        <Sparkline data={asset.sparkData} width={72} height={24} />
      </div>

      {/* Phase pip + score */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <PhasePip phase={asset.icc.phase.current} marketState={asset.icc.marketState.state} />

        <span
          className="font-mono-nums text-[10px] font-bold"
          style={{ color: biasColor }}
        >
          {asset.score > 0 ? '+' : ''}{asset.score}
          <span className="text-terminal-muted/60 ml-1">pts</span>
        </span>
      </div>

      {/* Confluence badge — only renders when 4H + 1H aligned */}
      {asset.confluence?.aligned && (
        <div className="mb-2">
          <ConfluenceBadge asset={asset} size="md" />
        </div>
      )}

      {/* AI narrative — one-sentence plain-English read */}
      {asset.narrative && (
        <p className="text-[11px] text-slate-400 leading-snug mb-3 line-clamp-3">
          {asset.narrative}
        </p>
      )}

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
            Confidence
          </span>
          <span className="font-mono-nums text-[10px] text-terminal-muted font-bold">
            {asset.confidence}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-terminal-border/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${asset.confidence}%`,
              background: `linear-gradient(to right, ${biasColor}70, ${biasColor})`,
              boxShadow: `0 0 4px ${biasColor}60`,
            }}
          />
        </div>
      </div>

      {/* Tradeable indicator + accuracy */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {asset.tradeable ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green" style={{ boxShadow: '0 0 5px #00ff9d' }} />
              <span className="text-[10px] text-neon-green font-semibold uppercase tracking-[0.12em]">
                Tradeable
              </span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-terminal-muted" />
              <span className="text-[10px] text-terminal-muted font-semibold uppercase tracking-[0.12em]">
                Stay Flat
              </span>
            </>
          )}
        </div>
        <AccuracyStat breakdown={accuracy} compact />
      </div>

      {asset.error && (
        <p className="mt-2 text-[10px] text-neon-red">
          Data issue: {asset.error}
        </p>
      )}
    </button>
  );
}

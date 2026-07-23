// Compact dashboard widget — one horizontal row of the 5 tracked assets.
// Designed to slot into the existing dashboard grid without stealing
// vertical real estate. The "Full bias engine" link routes to /bias.
import { Link } from 'react-router-dom';
import { Radar, ArrowUpRight, Compass, GraduationCap } from 'lucide-react';
import { useBiasData } from '@/hooks/useBiasData';
import { AssetBiasChip } from '@/components/bias/AssetBiasChip';

export function MarketBiasStrip() {
  const { data, isLoading, isStale, error, lastUpdated } = useBiasData();

  const assets = data?.assets ?? [];
  const sentiment = data?.sentiment;
  const aPlusCount = assets.filter((a) => a.confluence?.aligned).length;

  return (
    <section
      className="animate-fade-in-up glass-premium rounded-2xl p-5"
      style={{ animationDelay: '240ms' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-cyan/25 bg-neon-cyan/10">
            <Compass size={13} className="text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Market Bias · 4H + 1H ICC
            </h2>
            <p className="text-[10px] text-terminal-muted/70 mt-0.5">
              Indication · Correction · Continuation
            </p>
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />

        {aPlusCount > 0 && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.18em] animate-pulse"
            style={{
              color: '#00ff9d',
              background: '#00ff9d18',
              border: '1px solid #00ff9d50',
              boxShadow: '0 0 10px #00ff9d30',
            }}
          >
            ⚡ {aPlusCount} A+ Setup{aPlusCount === 1 ? '' : 's'}
          </span>
        )}

        {sentiment && (
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-nums">
            <span className="text-neon-green">{sentiment.bullish} ▲</span>
            <span className="text-neon-red">{sentiment.bearish} ▼</span>
            <span className="text-terminal-muted">{sentiment.neutral} ◆</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{
                color:
                  sentiment.overall === 'RISK-ON'  ? '#00ff9d' :
                  sentiment.overall === 'RISK-OFF' ? '#ff3d57' :
                  '#a3a3a3',
                background:
                  sentiment.overall === 'RISK-ON'  ? '#00ff9d12' :
                  sentiment.overall === 'RISK-OFF' ? '#ff3d5712' :
                  '#262626',
                border: `1px solid ${
                  sentiment.overall === 'RISK-ON'  ? '#00ff9d30' :
                  sentiment.overall === 'RISK-OFF' ? '#ff3d5730' :
                  '#404040'
                }`,
              }}
            >
              {sentiment.overall}
            </span>
          </div>
        )}

        <Link
          to="/icc-studio"
          className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-neon-amber hover:underline underline-offset-4"
          title="Practice ICC patterns on historical scenarios"
        >
          <GraduationCap size={11} />
          Practice
        </Link>
        <Link
          to="/bias"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-neon-cyan hover:underline underline-offset-4 glow-text-cyan"
        >
          Open engine
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Chip grid */}
      {error && !data ? (
        <div className="rounded-xl border border-neon-red/20 bg-neon-red/[0.04] p-4 flex items-center gap-2">
          <Radar size={14} className="text-neon-red" />
          <p className="text-[11px] text-neon-red">
            Bias engine offline — {error}. Retrying in the background.
          </p>
        </div>
      ) : isLoading && assets.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-terminal-border bg-terminal-surface/30 h-[112px] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {assets.map((a, i) => (
            <AssetBiasChip key={a.symbol} asset={a} delay={i * 50} />
          ))}
        </div>
      )}

      {/* Footer line */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono-nums text-terminal-muted/70">
        <span>
          {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-US', { hour12: false })}` : 'Loading…'}
          {isStale && <span className="ml-2 text-neon-amber">· stale</span>}
        </span>
        <span>Not financial advice · For educational use</span>
      </div>
    </section>
  );
}

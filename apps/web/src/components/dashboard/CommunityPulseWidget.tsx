import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Minus } from 'lucide-react';
import { getBenchmarkSentiment, type PairSentiment } from '@/data/community-pulse-benchmarks';

const VOLUME_ICONS: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  surging: { icon: TrendingUp, color: '#00ff9d', label: 'Surging' },
  rising: { icon: TrendingUp, color: '#00e5ff', label: 'Rising' },
  stable: { icon: Minus, color: '#6b7f95', label: 'Stable' },
  declining: { icon: TrendingDown, color: '#ff3d57', label: 'Declining' },
};

export function CommunityPulseWidget() {
  const [data, setData] = useState(() => getBenchmarkSentiment());

  // Refresh every 60s to pick up hourly drift
  useEffect(() => {
    const interval = setInterval(() => setData(getBenchmarkSentiment()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-premium rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-purple/20 bg-neon-purple/10">
            <Users size={14} className="text-neon-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Community Trading Pulse</h3>
            <p className="font-mono-nums text-[9px] text-terminal-muted">
              {data.source === 'community'
                ? `${data.activeTraders} active traders`
                : 'Market benchmark — grows with community'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-neon-green/20 bg-neon-green/10 px-2.5 py-0.5 font-mono-nums text-[10px] text-neon-green">
            Win Rate: {data.winRate}%
          </div>
          <div className="flex h-[5px] w-[5px]">
            <span className="relative inline-flex h-full w-full rounded-full bg-neon-green shadow-[0_0_6px_rgba(0,255,157,0.6)]" />
          </div>
        </div>
      </div>

      {/* Sentiment Bars */}
      <div className="p-4 space-y-2.5">
        {data.pairs.map((pair) => (
          <SentimentRow key={pair.symbol} pair={pair} />
        ))}
      </div>
    </div>
  );
}

function SentimentRow({ pair }: { pair: PairSentiment }) {
  const vol = VOLUME_ICONS[pair.volumeTrend] || VOLUME_ICONS.stable;
  const VolIcon = vol.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Symbol */}
      <span className="w-16 font-mono-nums text-[12px] font-semibold text-white">{pair.symbol}</span>

      {/* Bar */}
      <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-terminal-border/20">
        {/* Long side */}
        <div
          className="flex items-center justify-end pr-2 rounded-l-full transition-all duration-700"
          style={{ width: `${pair.longPct}%`, background: 'linear-gradient(90deg, #00ff9d15, #00ff9d30)' }}
        >
          <span className="font-mono-nums text-[10px] font-bold text-neon-green">{pair.longPct}%</span>
        </div>
        {/* Short side */}
        <div
          className="flex items-center pl-2 rounded-r-full transition-all duration-700"
          style={{ width: `${pair.shortPct}%`, background: 'linear-gradient(90deg, #ff3d5730, #ff3d5715)' }}
        >
          <span className="font-mono-nums text-[10px] font-bold text-neon-red">{pair.shortPct}%</span>
        </div>
      </div>

      {/* Volume trend */}
      <div className="flex items-center gap-1 w-16">
        <VolIcon size={10} style={{ color: vol.color }} />
        <span className="font-mono-nums text-[9px]" style={{ color: vol.color }}>{vol.label}</span>
      </div>

      {/* Crowded alert */}
      <div className="w-4">
        {pair.crowdedAlert && (
          <AlertTriangle size={12} className="text-neon-amber animate-pulse" />
        )}
      </div>
    </div>
  );
}

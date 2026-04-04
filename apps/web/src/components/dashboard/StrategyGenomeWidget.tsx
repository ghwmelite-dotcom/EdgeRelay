import { useMemo } from 'react';
import { Dna, TrendingUp, Clock, Target, BarChart3, Repeat } from 'lucide-react';
import { useJournalStore, type JournalTrade } from '@/stores/journal';

interface GenomeTrait {
  label: string;
  value: number; // 0-100
  displayValue: string;
  color: string;
  icon: typeof TrendingUp;
}

function computeGenome(trades: JournalTrade[]): GenomeTrait[] | null {
  const closed = trades.filter((t) => t.deal_entry === 'out');
  if (closed.length < 10) return null;

  // Session distribution
  const sessionCounts: Record<string, number> = {};
  for (const t of closed) {
    sessionCounts[t.session_tag || 'off_hours'] = (sessionCounts[t.session_tag || 'off_hours'] || 0) + 1;
  }
  const dominantSession = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0];
  const sessionConcentration = (dominantSession[1] / closed.length) * 100;

  // Direction bias
  const buys = closed.filter((t) => t.direction === 'buy').length;
  const dirBias = Math.abs((buys / closed.length) * 100 - 50) * 2; // 0 = perfectly balanced, 100 = all one direction

  // Symbol concentration (Herfindahl)
  const symbolCounts: Record<string, number> = {};
  for (const t of closed) { symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1; }
  const hhi = Object.values(symbolCounts).reduce((sum, c) => sum + Math.pow(c / closed.length, 2), 0) * 100;
  const symbolFocus = Math.min(100, hhi * 2); // Normalize: 50 HHI = 100% focused

  // Hold time profile
  const avgHold = closed.reduce((s, t) => s + (t.duration_seconds || 0), 0) / closed.length / 60; // minutes
  const holdScore = avgHold < 5 ? 10 : avgHold < 60 ? 40 : avgHold < 240 ? 70 : 95;

  // Risk appetite
  const rrValues = closed.filter((t) => t.risk_reward_ratio && t.risk_reward_ratio > 0).map((t) => t.risk_reward_ratio!);
  const avgRR = rrValues.length > 0 ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 1;
  const rrScore = Math.min(100, (avgRR / 3) * 100);

  // Consistency (inverse of daily P&L std dev)
  const dayPnl: Record<string, number> = {};
  for (const t of closed) {
    const day = new Date(t.time * 1000).toISOString().slice(0, 10);
    dayPnl[day] = (dayPnl[day] || 0) + t.profit;
  }
  const pnlValues = Object.values(dayPnl);
  const mean = pnlValues.reduce((s, v) => s + v, 0) / pnlValues.length;
  const stdDev = Math.sqrt(pnlValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / pnlValues.length);
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : 5;
  const consistencyScore = Math.min(100, Math.max(0, 100 - cv * 20));

  // Win rate
  const wins = closed.filter((t) => t.profit > 0).length;
  const winRate = (wins / closed.length) * 100;

  const SESSION_LABELS: Record<string, string> = { london: 'London', new_york: 'New York', asian: 'Asian', off_hours: 'Off Hours' };

  return [
    { label: 'Session Focus', value: sessionConcentration, displayValue: `${SESSION_LABELS[dominantSession[0]] || dominantSession[0]} ${sessionConcentration.toFixed(0)}%`, color: '#00e5ff', icon: Clock },
    { label: 'Win Rate', value: winRate, displayValue: `${winRate.toFixed(1)}%`, color: '#00ff9d', icon: Target },
    { label: 'Risk-Reward', value: rrScore, displayValue: `${avgRR.toFixed(2)}R`, color: '#ffb800', icon: TrendingUp },
    { label: 'Symbol Focus', value: symbolFocus, displayValue: `${Object.keys(symbolCounts).length} pairs`, color: '#b18cff', icon: BarChart3 },
    { label: 'Hold Style', value: holdScore, displayValue: avgHold < 5 ? 'Scalper' : avgHold < 60 ? 'Day Trader' : avgHold < 240 ? 'Intraday' : 'Swing', color: '#00e5ff', icon: Clock },
    { label: 'Consistency', value: consistencyScore, displayValue: `${consistencyScore.toFixed(0)}/100`, color: consistencyScore >= 60 ? '#00ff9d' : '#ffb800', icon: Repeat },
    { label: 'Direction Bias', value: 100 - dirBias, displayValue: dirBias < 20 ? 'Balanced' : buys > closed.length / 2 ? 'Long Bias' : 'Short Bias', color: dirBias < 30 ? '#00ff9d' : '#ffb800', icon: TrendingUp },
  ];
}

export function StrategyGenomeWidget() {
  const { trades } = useJournalStore();
  const genome = useMemo(() => computeGenome(trades), [trades]);

  if (!genome) {
    return (
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Dna size={16} className="text-neon-purple" />
          <h3 className="text-sm font-semibold text-white">Strategy DNA</h3>
        </div>
        <p className="text-[12px] text-terminal-muted">Complete at least 10 trades to generate your trading DNA fingerprint.</p>
      </div>
    );
  }

  return (
    <div className="glass-premium rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-terminal-border/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-purple/20 bg-neon-purple/10">
            <Dna size={14} className="text-neon-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Strategy DNA Fingerprint</h3>
            <p className="font-mono-nums text-[9px] text-terminal-muted">Your unique trading identity</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {genome.map((trait) => {
          const Icon = trait.icon;
          return (
            <div key={trait.label} className="flex items-center gap-3">
              <Icon size={13} style={{ color: trait.color }} className="shrink-0" />
              <span className="w-24 text-[12px] text-terminal-muted">{trait.label}</span>
              {/* Bar */}
              <div className="flex-1 h-2 rounded-full bg-terminal-border/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${trait.value}%`, backgroundColor: `${trait.color}80`, boxShadow: `0 0 8px ${trait.color}30` }}
                />
              </div>
              <span className="w-20 text-right font-mono-nums text-[11px] font-semibold" style={{ color: trait.color }}>
                {trait.displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

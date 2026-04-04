import { useMemo } from 'react';
import { Trophy, ArrowRight, CheckCircle2, AlertTriangle, Target } from 'lucide-react';
import { useJournalStore } from '@/stores/journal';
import { FUNDED_TRADER_BENCHMARKS, computeSimilarityScore } from '@/data/funded-trader-benchmarks';

function computeUserMetrics(trades: ReturnType<typeof useJournalStore.getState>['trades']): Record<string, number> | null {
  const closed = trades.filter((t) => t.deal_entry === 'out');
  if (closed.length < 10) return null;

  const wins = closed.filter((t) => t.profit > 0).length;
  const winRate = (wins / closed.length) * 100;

  // Trades per day
  const days = new Set(closed.map((t) => new Date(t.time * 1000).toISOString().slice(0, 10)));
  const tradesPerDay = closed.length / Math.max(1, days.size);

  // Avg hold time in minutes
  const holdMinutes = closed.reduce((s, t) => s + (t.duration_seconds || 0), 0) / closed.length / 60;

  // Avg R:R
  const rrValues = closed.filter((t) => t.risk_reward_ratio && t.risk_reward_ratio > 0).map((t) => t.risk_reward_ratio!);
  const avgRR = rrValues.length > 0 ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  // Profit factor
  const grossProfit = closed.filter((t) => t.profit > 0).reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(closed.filter((t) => t.profit < 0).reduce((s, t) => s + t.profit, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;

  // Risk per trade (approximate from P&L as % of balance)
  const riskPerTrade = closed.length > 0
    ? closed.reduce((s, t) => s + (t.balance_at_trade > 0 ? (Math.abs(t.profit) / t.balance_at_trade) * 100 : 0), 0) / closed.length
    : 0;

  // Daily loss discipline (avg daily loss as % of max possible)
  const dayPnl: Record<string, number> = {};
  for (const t of closed) {
    const day = new Date(t.time * 1000).toISOString().slice(0, 10);
    dayPnl[day] = (dayPnl[day] || 0) + t.profit;
  }
  const losingDays = Object.values(dayPnl).filter((v) => v < 0);
  const avgDailyLoss = losingDays.length > 0 ? Math.abs(losingDays.reduce((s, v) => s + v, 0) / losingDays.length) : 0;
  const avgBalance = closed.reduce((s, t) => s + t.balance_at_trade, 0) / closed.length;
  const dailyLossUsage = avgBalance > 0 ? (avgDailyLoss / (avgBalance * 0.05)) * 100 : 50; // As % of typical 5% daily limit

  // Consistency
  const pnlValues = Object.values(dayPnl);
  const mean = pnlValues.reduce((s, v) => s + v, 0) / pnlValues.length;
  const stdDev = Math.sqrt(pnlValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / pnlValues.length);
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : 5;
  const consistency = Math.min(100, Math.max(0, 100 - cv * 20));

  return {
    trades_per_day: tradesPerDay,
    risk_per_trade: riskPerTrade,
    win_rate: winRate,
    risk_reward: avgRR,
    hold_minutes: holdMinutes,
    profit_factor: profitFactor,
    daily_loss_usage: dailyLossUsage,
    consistency,
  };
}

export function FundedBlueprintWidget() {
  const { trades } = useJournalStore();
  const userMetrics = useMemo(() => computeUserMetrics(trades), [trades]);

  if (!userMetrics) {
    return (
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <Trophy size={18} className="text-neon-amber" />
          <h3 className="font-display text-base font-semibold text-white">Funded Trader Blueprint</h3>
        </div>
        <p className="text-[12px] text-terminal-muted">Complete at least 10 trades to compare your profile against successfully funded traders.</p>
      </div>
    );
  }

  const { score, gaps } = computeSimilarityScore(userMetrics);
  const scoreColor = score >= 70 ? '#00ff9d' : score >= 45 ? '#ffb800' : '#ff3d57';
  const scoreLabel = score >= 70 ? 'Challenge Ready' : score >= 45 ? 'Getting There' : 'Needs Work';

  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neon-amber/20 bg-neon-amber/10">
            <Trophy size={18} className="text-neon-amber" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">Funded Trader Blueprint</h3>
            <p className="font-mono-nums text-[10px] text-terminal-muted">Your profile vs funded trader archetype</p>
          </div>
        </div>

        {/* Score gauge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono-nums text-2xl font-bold" style={{ color: scoreColor }}>{score}</p>
            <p className="font-mono-nums text-[9px] uppercase tracking-wider" style={{ color: scoreColor }}>{scoreLabel}</p>
          </div>
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-terminal-border)" strokeWidth="3" opacity="0.2" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke={scoreColor} strokeWidth="3"
                strokeDasharray={`${(score / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${scoreColor}50)` }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Dimension comparison */}
      <div className="p-5 space-y-3">
        {FUNDED_TRADER_BENCHMARKS.map((dim) => {
          const userVal = userMetrics[dim.key];
          if (userVal === undefined) return null;
          const inRange = userVal >= dim.range[0] && userVal <= dim.range[1];
          const barPct = Math.min(100, (userVal / (dim.range[1] * 1.2)) * 100);
          const idealPct = Math.min(100, (dim.ideal / (dim.range[1] * 1.2)) * 100);

          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-slate-400">{dim.label}</span>
                <div className="flex items-center gap-2 font-mono-nums text-[11px]">
                  <span className={inRange ? 'text-neon-green' : 'text-neon-amber'}>{userVal.toFixed(1)}{dim.unit}</span>
                  <span className="text-terminal-muted/40">/ {dim.ideal}{dim.unit}</span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-terminal-border/20">
                {/* Ideal marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-neon-green/40"
                  style={{ left: `${idealPct}%` }}
                />
                {/* User bar */}
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: inRange ? '#00ff9d50' : '#ffb80050',
                    boxShadow: inRange ? '0 0 6px #00ff9d20' : '0 0 6px #ffb80020',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Gap recommendations */}
      {gaps.length > 0 && (
        <div className="border-t border-terminal-border/20 px-5 py-4">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-3">Top Improvements</p>
          <div className="space-y-2">
            {gaps.slice(0, 3).map((gap, i) => (
              <div key={gap.dimension.key} className="flex items-start gap-2">
                <AlertTriangle size={12} className="text-neon-amber shrink-0 mt-0.5" />
                <p className="text-[12px] leading-relaxed text-slate-400">{gap.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Radar, ShieldCheck, AlertTriangle, TrendingUp, Clock, Target, ChevronRight } from 'lucide-react';
import { useJournalStore, type JournalTrade } from '@/stores/journal';
import { useAccountsStore } from '@/stores/accounts';
import { usePropGuardStore } from '@/stores/propguard';

interface PairEdge {
  symbol: string;
  trades: number;
  winRate: number;
  avgRR: number;
  totalPnl: number;
}

interface SessionEdge {
  session: string;
  trades: number;
  winRate: number;
  pnl: number;
  label: string;
  color: string;
}

interface DayEdge {
  day: number;
  label: string;
  trades: number;
  winRate: number;
}

const SESSION_META: Record<string, { label: string; color: string }> = {
  london: { label: 'London', color: '#00e5ff' },
  new_york: { label: 'New York', color: '#00ff9d' },
  asian: { label: 'Asian', color: '#b18cff' },
  off_hours: { label: 'Off Hours', color: '#6b7f95' },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeFlightCheck(trades: JournalTrade[]) {
  if (trades.length === 0) return null;

  // Per-pair
  const pairMap = new Map<string, { wins: number; total: number; pnl: number; rrSum: number; rrCount: number }>();
  for (const t of trades) {
    if (t.deal_entry !== 'out') continue;
    const s = pairMap.get(t.symbol) || { wins: 0, total: 0, pnl: 0, rrSum: 0, rrCount: 0 };
    s.total++;
    if (t.profit > 0) s.wins++;
    s.pnl += t.profit;
    if (t.risk_reward_ratio && t.risk_reward_ratio > 0) { s.rrSum += t.risk_reward_ratio; s.rrCount++; }
    pairMap.set(t.symbol, s);
  }
  const pairEdges: PairEdge[] = Array.from(pairMap.entries())
    .map(([symbol, s]) => ({ symbol, trades: s.total, winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0, avgRR: s.rrCount > 0 ? s.rrSum / s.rrCount : 0, totalPnl: s.pnl }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  // Per-session
  const sessMap = new Map<string, { wins: number; total: number; pnl: number }>();
  for (const t of trades) {
    if (t.deal_entry !== 'out' || !t.session_tag) continue;
    const s = sessMap.get(t.session_tag) || { wins: 0, total: 0, pnl: 0 };
    s.total++;
    if (t.profit > 0) s.wins++;
    s.pnl += t.profit;
    sessMap.set(t.session_tag, s);
  }
  const sessionEdges: SessionEdge[] = Array.from(sessMap.entries())
    .map(([session, s]) => ({
      session,
      trades: s.total,
      winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0,
      pnl: s.pnl,
      ...(SESSION_META[session] || { label: session, color: '#6b7f95' }),
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Per day-of-week
  const dayMap = new Map<number, { wins: number; total: number }>();
  for (const t of trades) {
    if (t.deal_entry !== 'out') continue;
    const day = new Date(t.time * 1000).getUTCDay();
    const s = dayMap.get(day) || { wins: 0, total: 0 };
    s.total++;
    if (t.profit > 0) s.wins++;
    dayMap.set(day, s);
  }
  const dayEdges: DayEdge[] = Array.from(dayMap.entries())
    .map(([day, s]) => ({ day, label: DAY_LABELS[day], trades: s.total, winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0 }))
    .sort((a, b) => a.day - b.day);

  // Today's trade count
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime() / 1000;
  const todayTrades = trades.filter((t) => t.time >= todayTs && t.deal_entry === 'out').length;
  const avgTradesPerDay = trades.filter((t) => t.deal_entry === 'out').length / Math.max(1, dayMap.size);
  const overtradingWarning = todayTrades > avgTradesPerDay * 1.5 && todayTrades >= 4;

  return { pairEdges, sessionEdges, dayEdges, todayTrades, avgTradesPerDay, overtradingWarning };
}

export function FlightCheckWidget() {
  const { trades } = useJournalStore();
  const analysis = useMemo(() => computeFlightCheck(trades), [trades]);

  if (!analysis || analysis.pairEdges.length === 0) {
    return (
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Radar size={16} className="text-neon-cyan" />
          <h3 className="text-sm font-semibold text-white">Pre-Trade Flight Check</h3>
        </div>
        <p className="text-[12px] text-terminal-muted">Trade data needed — journal at least 10 trades to unlock your flight check.</p>
      </div>
    );
  }

  const bestSession = analysis.sessionEdges[0];
  const worstSession = analysis.sessionEdges[analysis.sessionEdges.length - 1];
  const bestPair = analysis.pairEdges[0];

  return (
    <div className="glass-premium rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-cyan/20 bg-neon-cyan/10">
            <Radar size={14} className="text-neon-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Pre-Trade Flight Check</h3>
            <p className="font-mono-nums text-[9px] text-terminal-muted">Your edge by pair, session, and day</p>
          </div>
        </div>
        {analysis.overtradingWarning && (
          <div className="flex items-center gap-1.5 rounded-full border border-neon-amber/30 bg-neon-amber/10 px-2.5 py-1">
            <AlertTriangle size={11} className="text-neon-amber" />
            <span className="font-mono-nums text-[10px] font-semibold text-neon-amber">
              {analysis.todayTrades} trades today (avg {analysis.avgTradesPerDay.toFixed(1)})
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-0 divide-y divide-terminal-border/15 md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* Pair Edge */}
        <div className="p-4">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2.5">Top Pairs</p>
          <div className="space-y-2">
            {analysis.pairEdges.slice(0, 4).map((p) => (
              <div key={p.symbol} className="flex items-center justify-between">
                <span className="font-mono-nums text-[12px] font-semibold text-white">{p.symbol}</span>
                <div className="flex items-center gap-3 font-mono-nums text-[11px]">
                  <span className={p.winRate >= 55 ? 'text-neon-green' : p.winRate >= 45 ? 'text-neon-amber' : 'text-neon-red'}>
                    {p.winRate.toFixed(0)}%
                  </span>
                  <span className={p.totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red'}>
                    {p.totalPnl >= 0 ? '+' : ''}${Math.abs(p.totalPnl).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Edge */}
        <div className="p-4">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2.5">Session Performance</p>
          <div className="space-y-2">
            {analysis.sessionEdges.map((s) => (
              <div key={s.session} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[12px] text-slate-300">{s.label}</span>
                </div>
                <div className="flex items-center gap-3 font-mono-nums text-[11px]">
                  <span className={s.winRate >= 55 ? 'text-neon-green' : s.winRate >= 45 ? 'text-neon-amber' : 'text-neon-red'}>
                    {s.winRate.toFixed(0)}% WR
                  </span>
                  <span className="text-terminal-muted">{s.trades}t</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-Week Edge */}
        <div className="p-4">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2.5">Day of Week</p>
          <div className="flex items-end gap-1.5 h-16">
            {analysis.dayEdges.map((d) => {
              const barH = d.trades > 0 ? Math.max(15, (d.winRate / 100) * 100) : 5;
              const color = d.winRate >= 55 ? '#00ff9d' : d.winRate >= 45 ? '#ffb800' : '#ff3d57';
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{ height: `${barH}%`, backgroundColor: `${color}40`, borderTop: `2px solid ${color}` }}
                  />
                  <span className="font-mono-nums text-[8px] text-terminal-muted">{d.label}</span>
                </div>
              );
            })}
          </div>
          {/* Best/worst callout */}
          <div className="mt-3 space-y-1 font-mono-nums text-[10px]">
            {bestSession && (
              <p className="text-neon-green">Best: {bestSession.label} ({bestSession.winRate.toFixed(0)}% WR)</p>
            )}
            {worstSession && worstSession.session !== bestSession?.session && (
              <p className="text-neon-red">Avoid: {worstSession.label} ({worstSession.winRate.toFixed(0)}% WR)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

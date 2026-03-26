import { useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Activity,
  DollarSign,
  Clock,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useAccountsStore } from '@/stores/accounts';
import { useJournalStore } from '@/stores/journal';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

/* ------------------------------------------------------------------ */
/*  Session color helper                                               */
/* ------------------------------------------------------------------ */

const SESSION_COLORS: Record<string, { bar: string; text: string; dot: string }> = {
  Asian:      { bar: 'bg-neon-amber',  text: 'text-neon-amber',  dot: 'bg-neon-amber' },
  London:     { bar: 'bg-neon-cyan',   text: 'text-neon-cyan',   dot: 'bg-neon-cyan' },
  'New York': { bar: 'bg-neon-green',  text: 'text-neon-green',  dot: 'bg-neon-green' },
  'Off Hours':{ bar: 'bg-terminal-muted', text: 'text-terminal-muted', dot: 'bg-terminal-muted' },
};

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-fade-in-up glass rounded-2xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-3 w-20 mb-3 rounded" />
      <div className="skeleton h-8 w-24 rounded" />
    </div>
  );
}

function SkeletonBar({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-4 w-16 rounded" />
      <div className="skeleton h-6 flex-1 rounded" />
      <div className="skeleton h-4 w-12 rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
  sub?: React.ReactNode;
  delay: number;
}

function StatCard({ label, value, icon, valueClass, sub, delay }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 flex-1 min-w-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5 mb-2">
        <span className="h-1 w-1 rounded-full bg-neon-cyan" />
        {label}
      </p>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-2xl font-mono-nums font-bold ${valueClass ?? 'text-white glow-text-cyan'}`}>{value}</p>
      </div>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="glass rounded-2xl p-6">
        <BarChart3 size={48} className="text-terminal-muted" />
      </div>
      <h2 className="text-xl font-semibold text-white">No analytics data yet</h2>
      <p className="text-sm text-terminal-muted max-w-md">
        Start trading with your connected MT5 account and journal your trades to see analytics here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AnalyticsPage() {
  // Accounts
  const { accounts, fetchAccounts } = useAccountsStore();

  // Journal store
  const {
    stats,
    symbolStats,
    sessionStats,
    dailyPnl,
    isLoading,
    selectedAccountId,
  } = useJournalStore();

  const fetchStats = useJournalStore((s) => s.fetchStats);
  const fetchSymbolStats = useJournalStore((s) => s.fetchSymbolStats);
  const fetchSessionStats = useJournalStore((s) => s.fetchSessionStats);
  const fetchDailyPnl = useJournalStore((s) => s.fetchDailyPnl);

  const setSelectedAccountId = useCallback(
    (id: string) => useJournalStore.setState({ selectedAccountId: id }),
    [],
  );

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  // Fetch analytics data when account changes
  useEffect(() => {
    if (selectedAccountId) {
      void Promise.all([
        fetchStats(selectedAccountId),
        fetchSymbolStats(selectedAccountId),
        fetchSessionStats(selectedAccountId),
        fetchDailyPnl(selectedAccountId),
      ]);
    }
  }, [selectedAccountId, fetchStats, fetchSymbolStats, fetchSessionStats, fetchDailyPnl]);

  const accountOptions = accounts.map((a) => ({
    label: `${a.alias} (${a.role})`,
    value: a.id,
  }));

  // Derived values
  const hasData = stats !== null && stats.total_trades > 0;
  const maxSymbolProfit = symbolStats.length > 0 ? Math.max(...symbolStats.map((s) => Math.abs(s.profit))) : 1;
  const maxSessionProfit = sessionStats.length > 0 ? Math.max(...sessionStats.map((s) => Math.abs(s.profit))) : 1;
  const maxDailyProfit = dailyPnl.length > 0 ? Math.max(...dailyPnl.map((d) => Math.abs(d.profit))) : 1;

  return (
    <div className="space-y-8">
      {/* -- Header -------------------------------------------------- */}
      <div
        className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="text-3xl font-black tracking-tight text-white font-display">Analytics</h1>
        <div className="w-64">
          <Select
            label="Account"
            options={accountOptions}
            value={selectedAccountId ?? ''}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          />
        </div>
      </div>

      {/* -- Loading state ------------------------------------------- */}
      {isLoading && !hasData && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} delay={i * 60} />
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={16} className="text-neon-cyan" />
                Loading...
              </CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBar key={i} delay={i * 40} />
              ))}
            </div>
          </Card>
        </>
      )}

      {/* -- Empty state --------------------------------------------- */}
      {!isLoading && !hasData && <EmptyState />}

      {/* -- Data state ---------------------------------------------- */}
      {hasData && stats && (
        <>
          {/* -- Key Metrics Row 1 ----------------------------------- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Trades"
              icon={<Activity size={18} className="text-neon-cyan" />}
              value={stats.total_trades.toLocaleString()}
              delay={0}
              sub={
                <span className="text-xs text-terminal-muted font-mono-nums">
                  {stats.winning_trades}W / {stats.losing_trades}L
                </span>
              }
            />
            <StatCard
              label="Win Rate"
              icon={<Target size={18} className="text-neon-green" />}
              value={`${stats.win_rate.toFixed(1)}%`}
              valueClass={stats.win_rate >= 50 ? 'text-neon-green glow-text-green' : 'text-neon-red'}
              delay={60}
              sub={
                <span className="inline-flex items-center gap-1 text-xs text-terminal-muted">
                  {stats.win_rate >= 50 ? <TrendingUp size={12} className="text-neon-green" /> : <TrendingDown size={12} className="text-neon-red" />}
                  {stats.winning_trades} winners
                </span>
              }
            />
            <StatCard
              label="Net Profit"
              icon={<DollarSign size={18} className={stats.net_profit >= 0 ? 'text-neon-green' : 'text-neon-red'} />}
              value={formatCurrency(stats.net_profit)}
              valueClass={stats.net_profit >= 0 ? 'text-neon-green glow-text-green' : 'text-neon-red'}
              delay={120}
              sub={
                <span className="text-xs text-terminal-muted font-mono-nums">
                  Fees: ${(Math.abs(stats.total_commission) + Math.abs(stats.total_swap)).toFixed(2)}
                </span>
              }
            />
            <StatCard
              label="Profit Factor"
              icon={<Award size={18} className="text-neon-cyan" />}
              value={stats.profit_factor === Infinity ? '∞' : stats.profit_factor.toFixed(2)}
              valueClass={stats.profit_factor >= 1.5 ? 'text-neon-green glow-text-green' : stats.profit_factor >= 1.0 ? 'text-neon-amber' : 'text-neon-red'}
              delay={180}
              sub={
                <span className="text-xs text-terminal-muted font-mono-nums">
                  {stats.profit_factor >= 1.5 ? 'Strong' : stats.profit_factor >= 1.0 ? 'Marginal' : 'Losing'}
                </span>
              }
            />
          </div>

          {/* -- Key Metrics Row 2 ----------------------------------- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Avg Winner"
              icon={<TrendingUp size={18} className="text-neon-green" />}
              value={formatCurrency(stats.avg_winner)}
              valueClass="text-neon-green"
              delay={240}
            />
            <StatCard
              label="Avg Loser"
              icon={<TrendingDown size={18} className="text-neon-red" />}
              value={formatCurrency(stats.avg_loser)}
              valueClass="text-neon-red"
              delay={300}
            />
            <StatCard
              label="Best Trade"
              icon={<TrendingUp size={18} className="text-neon-green" />}
              value={formatCurrency(stats.best_trade)}
              valueClass="text-neon-green"
              delay={360}
            />
            <StatCard
              label="Worst Trade"
              icon={<AlertTriangle size={18} className="text-neon-red" />}
              value={formatCurrency(stats.worst_trade)}
              valueClass="text-neon-red"
              delay={420}
              sub={
                <span className="text-xs text-terminal-muted font-mono-nums">
                  Avg RR: {stats.avg_rr.toFixed(2)} | Avg Duration: {formatDuration(stats.avg_duration_seconds)}
                </span>
              }
            />
          </div>

          {/* -- Equity Curve (Daily P&L) ----------------------------- */}
          {dailyPnl.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-neon-cyan" />
                    Daily P&L
                  </CardTitle>
                </CardHeader>

                <div className="flex items-end gap-1 justify-between px-2 overflow-x-auto">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between h-48 text-[10px] text-terminal-muted font-mono-nums pr-2 pb-6 shrink-0 uppercase tracking-[0.15em]">
                    <span>{formatCurrency(maxDailyProfit).replace('+', '')}</span>
                    <span>$0</span>
                    <span>-{formatCurrency(maxDailyProfit).replace('+', '').replace('-', '')}</span>
                  </div>

                  {/* Bars */}
                  <div className="flex items-center gap-1 flex-1 justify-around" style={{ height: '192px' }}>
                    {dailyPnl.map((day) => {
                      const barHeight = maxDailyProfit > 0 ? (Math.abs(day.profit) / maxDailyProfit) * 50 : 0;
                      const isPositive = day.profit >= 0;
                      const dateLabel = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <div key={day.date} className="flex flex-col items-center gap-0 relative group" style={{ flex: '1 1 0', minWidth: 0 }}>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            <div className="glass rounded-xl px-3 py-2 text-xs shadow-2xl">
                              <div className="font-mono-nums text-white">{formatCurrency(day.profit)}</div>
                              <div className="text-terminal-muted">{day.trades} trades</div>
                              <div className="text-terminal-muted">Cum: {formatCurrency(day.cumulative_profit)}</div>
                            </div>
                          </div>

                          {/* Positive space */}
                          <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                            {isPositive && (
                              <div
                                className="w-full max-w-[24px] rounded-t-sm bg-neon-green transition-all duration-300 shadow-[0_0_8px_#00ff9d20]"
                                style={{ height: `${barHeight}%` }}
                              />
                            )}
                          </div>

                          {/* Negative space */}
                          <div className="w-full flex items-start justify-center" style={{ height: '80px' }}>
                            {!isPositive && day.profit !== 0 && (
                              <div
                                className="w-full max-w-[24px] rounded-b-sm bg-neon-red transition-all duration-300 shadow-[0_0_8px_#ff3d5720]"
                                style={{ height: `${barHeight}%` }}
                              />
                            )}
                          </div>

                          {/* Date label */}
                          <span className="text-[9px] text-terminal-muted mt-1 font-mono-nums truncate w-full text-center">
                            {dateLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* -- Two-Column: Symbol Breakdown + Session Breakdown ------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* -- Symbol Breakdown ------------------------------------ */}
            {symbolStats.length > 0 && (
              <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart size={16} className="text-neon-cyan" />
                      P&L by Symbol
                    </CardTitle>
                  </CardHeader>

                  <div className="space-y-3">
                    {symbolStats
                      .slice()
                      .sort((a, b) => b.profit - a.profit)
                      .map((sym, i) => {
                        const isPositive = sym.profit >= 0;
                        const barWidth = maxSymbolProfit > 0 ? (Math.abs(sym.profit) / maxSymbolProfit) * 100 : 0;

                        return (
                          <div key={sym.symbol} className="flex items-center gap-3">
                            <span className="text-xs font-mono-nums text-slate-300 w-16 shrink-0">
                              {sym.symbol}
                            </span>
                            <div className="flex-1 h-6 bg-terminal-border/20 rounded-r overflow-hidden">
                              <div
                                className={`h-full rounded-r transition-all duration-500 ${isPositive ? '' : ''}`}
                                style={{
                                  width: `${barWidth}%`,
                                  opacity: 1 - i * 0.06,
                                  background: isPositive
                                    ? 'linear-gradient(90deg, #00ff9d, #00ff9d99)'
                                    : 'linear-gradient(90deg, #ff3d57, #ff3d5799)',
                                  boxShadow: isPositive ? '0 0 8px #00ff9d20' : '0 0 8px #ff3d5720',
                                }}
                              />
                            </div>
                            <span className={`text-xs font-mono-nums w-20 text-right ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                              {formatCurrency(sym.profit)}
                            </span>
                            <span className="text-[10px] font-mono-nums text-terminal-muted w-12 text-right">
                              {sym.win_rate.toFixed(0)}% WR
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </section>
            )}

            {/* -- Session Breakdown ----------------------------------- */}
            {sessionStats.length > 0 && (
              <section className="animate-fade-in-up" style={{ animationDelay: '360ms' }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock size={16} className="text-neon-amber" />
                      P&L by Session
                    </CardTitle>
                  </CardHeader>

                  <div className="space-y-3">
                    {sessionStats
                      .slice()
                      .sort((a, b) => b.profit - a.profit)
                      .map((sess) => {
                        const colors = SESSION_COLORS[sess.session] ?? SESSION_COLORS['Off Hours'];
                        const isPositive = sess.profit >= 0;
                        const barWidth = maxSessionProfit > 0 ? (Math.abs(sess.profit) / maxSessionProfit) * 100 : 0;

                        return (
                          <div key={sess.session} className="relative">
                            <div
                              className={`absolute inset-0 ${colors.dot}/10 rounded-xl transition-all duration-500`}
                              style={{ width: `${barWidth}%` }}
                            />
                            <div className="relative flex items-center gap-3 px-4 py-2.5">
                              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.dot} shadow-[0_0_4px_currentColor]`} />
                              <span className="text-sm text-slate-300 flex-1">{sess.session}</span>
                              <span className="font-mono-nums text-xs text-terminal-muted">
                                {sess.trades} trades
                              </span>
                              <span className={`font-mono-nums text-sm font-semibold ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                                {formatCurrency(sess.profit)}
                              </span>
                              <span className="font-mono-nums text-xs text-terminal-muted w-14 text-right">
                                {sess.win_rate.toFixed(0)}% WR
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </section>
            )}
          </div>

          {/* -- Cumulative Equity Curve -------------------------------- */}
          {dailyPnl.length > 1 && (
            <section className="animate-fade-in-up" style={{ animationDelay: '420ms' }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-neon-green" />
                    Cumulative Equity Curve
                  </CardTitle>
                </CardHeader>

                <div className="h-48 px-2">
                  <svg
                    viewBox={`0 0 ${dailyPnl.length * 20} 200`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    {(() => {
                      const maxCum = Math.max(...dailyPnl.map((d) => Math.abs(d.cumulative_profit)), 1);
                      const midY = 100;
                      const points = dailyPnl.map((d, i) => {
                        const x = (i / Math.max(dailyPnl.length - 1, 1)) * (dailyPnl.length * 20 - 20) + 10;
                        const y = midY - (d.cumulative_profit / maxCum) * 90;
                        return `${x},${y}`;
                      });
                      const areaPoints = [
                        `10,${midY}`,
                        ...points,
                        `${(dailyPnl.length * 20 - 10)},${midY}`,
                      ];
                      const lastPoint = dailyPnl[dailyPnl.length - 1];
                      const isPositive = lastPoint.cumulative_profit >= 0;
                      const color = isPositive ? '#00ff9d' : '#ff3d57';

                      return (
                        <>
                          {/* Zero line */}
                          <line
                            x1="10" y1={midY}
                            x2={dailyPnl.length * 20 - 10} y2={midY}
                            stroke="#334155"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                          {/* Fill area */}
                          <polygon
                            points={areaPoints.join(' ')}
                            fill={color}
                            fillOpacity="0.08"
                          />
                          {/* Line */}
                          <polyline
                            points={points.join(' ')}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex justify-between px-4 pb-2 text-[10px] text-terminal-muted font-mono-nums">
                  <span>{dailyPnl[0]?.date}</span>
                  <span>{dailyPnl[dailyPnl.length - 1]?.date}</span>
                </div>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

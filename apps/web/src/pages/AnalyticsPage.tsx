import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Clock,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

// -- Types ----------------------------------------------------------
// TODO: wire to real API

type TimeRange = '24h' | '7d' | '30d' | 'all';

interface DailyBar {
  day: string;
  executed: number;
  failed: number;
}

interface LatencyBucket {
  label: string;
  percentage: number;
  color: string;
}

interface BlockedReason {
  label: string;
  count: number;
  color: string;
  dotClass: string;
}

interface SymbolActivity {
  symbol: string;
  count: number;
}

interface FollowerRow {
  account: string;
  signalsReceived: number;
  executed: number;
  blocked: number;
  failed: number;
  successRate: number;
  avgLatency: number;
}

// -- Mock Data Generator --------------------------------------------
// TODO: wire to real API -- replace this function with real fetches

function generateMockData(range: TimeRange) {
  const multiplier: Record<TimeRange, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    all: 90,
  };
  const m = multiplier[range];

  const totalSignals = Math.round(178 * m + Math.random() * 20 * m);
  const successCount = Math.round(totalSignals * (0.975 + Math.random() * 0.015));
  const blockedCount = Math.round((totalSignals - successCount) * 0.65);
  const failedCount = totalSignals - successCount - blockedCount;
  const successRate = +((successCount / totalSignals) * 100).toFixed(1);
  const todaySignals = Math.round(120 + Math.random() * 40);
  const avgLatency = Math.round(28 + Math.random() * 15);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyBars: DailyBar[] = days.map((day) => {
    const exec = Math.round(140 + Math.random() * 60);
    const fail = Math.round(1 + Math.random() * 5);
    return { day, executed: exec, failed: fail };
  });

  const latencyBuckets: LatencyBucket[] = [
    { label: '<50ms', percentage: 62, color: 'bg-neon-cyan' },
    { label: '50-100ms', percentage: 24, color: 'bg-neon-cyan/60' },
    { label: '100-200ms', percentage: 9, color: 'bg-neon-amber' },
    { label: '200-500ms', percentage: 4, color: 'bg-neon-amber/60' },
    { label: '>500ms', percentage: 1, color: 'bg-neon-red' },
  ];

  const blockedReasons: BlockedReason[] = [
    { label: 'Equity Guard', count: Math.round(8 * (m / 7)), color: 'text-neon-amber', dotClass: 'bg-neon-amber' },
    { label: 'Max Slippage', count: Math.round(4 * (m / 7)), color: 'text-neon-red', dotClass: 'bg-neon-red' },
    { label: 'News Filter', count: Math.round(3 * (m / 7)), color: 'text-neon-purple', dotClass: 'bg-neon-purple' },
    { label: 'Symbol Not Found', count: Math.round(1 * (m / 7)) || 1, color: 'text-terminal-muted', dotClass: 'bg-terminal-muted' },
  ];
  const totalBlocked = blockedReasons.reduce((s, r) => s + r.count, 0);

  const symbols: SymbolActivity[] = [
    { symbol: 'XAUUSD', count: Math.round(342 * (m / 7)) },
    { symbol: 'EURUSD', count: Math.round(218 * (m / 7)) },
    { symbol: 'GBPUSD', count: Math.round(156 * (m / 7)) },
    { symbol: 'USDJPY', count: Math.round(134 * (m / 7)) },
    { symbol: 'GBPJPY', count: Math.round(98 * (m / 7)) },
    { symbol: 'AUDUSD', count: Math.round(87 * (m / 7)) },
    { symbol: 'USDCAD', count: Math.round(64 * (m / 7)) },
    { symbol: 'NZDUSD', count: Math.round(42 * (m / 7)) },
  ];

  const followers: FollowerRow[] = [
    { account: 'Alpha Fund', signalsReceived: Math.round(1247 * (m / 7)), executed: Math.round(1231 * (m / 7)), blocked: Math.round(12 * (m / 7)), failed: Math.round(4 * (m / 7)), successRate: 98.7, avgLatency: 31 },
    { account: 'Bravo Scalper', signalsReceived: Math.round(1180 * (m / 7)), executed: Math.round(1162 * (m / 7)), blocked: Math.round(14 * (m / 7)), failed: Math.round(4 * (m / 7)), successRate: 98.5, avgLatency: 28 },
    { account: 'Charlie Swing', signalsReceived: Math.round(980 * (m / 7)), executed: Math.round(955 * (m / 7)), blocked: Math.round(18 * (m / 7)), failed: Math.round(7 * (m / 7)), successRate: 97.4, avgLatency: 42 },
    { account: 'Delta Hedge', signalsReceived: Math.round(860 * (m / 7)), executed: Math.round(812 * (m / 7)), blocked: Math.round(36 * (m / 7)), failed: Math.round(12 * (m / 7)), successRate: 94.4, avgLatency: 55 },
    { account: 'Echo Micro', signalsReceived: Math.round(540 * (m / 7)), executed: Math.round(486 * (m / 7)), blocked: Math.round(42 * (m / 7)), failed: Math.round(12 * (m / 7)), successRate: 90.0, avgLatency: 67 },
  ].sort((a, b) => b.successRate - a.successRate);

  return {
    totalSignals,
    successCount,
    successRate,
    blockedCount,
    failedCount,
    todaySignals,
    avgLatency,
    dailyBars,
    latencyBuckets,
    blockedReasons,
    totalBlocked,
    symbols,
    followers,
  };
}

// -- Stat Card ------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  valueClass?: string;
  sub?: React.ReactNode;
  delay: number;
}

function StatCard({ label, value, valueClass, sub, delay }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 flex-1 min-w-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5 mb-2">
        <span className="h-1 w-1 rounded-full bg-neon-cyan" />
        {label}
      </p>
      <p className={`text-2xl font-mono-nums font-bold ${valueClass ?? 'text-white glow-text-cyan'}`}>{value}</p>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  );
}

// -- Tooltip for Bar Chart ------------------------------------------

function BarTooltip({ executed, failed }: { executed: number; failed: number }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
      <div className="glass rounded-xl px-3 py-2 text-xs shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neon-green shadow-[0_0_4px_#00ff9d]" />
          <span className="text-slate-400">Executed:</span>
          <span className="font-mono-nums text-white">{executed}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="h-2 w-2 rounded-full bg-neon-red shadow-[0_0_4px_#ff3d57]" />
          <span className="text-slate-400">Failed:</span>
          <span className="font-mono-nums text-white">{failed}</span>
        </div>
      </div>
      <div className="w-2 h-2 bg-terminal-surface border-b border-r border-terminal-border rotate-45 mx-auto -mt-1" />
    </div>
  );
}

// -- Main Component -------------------------------------------------

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // TODO: wire to real API -- replace mock generator with actual data fetching
  const data = generateMockData(timeRange);

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '24h', label: '24h' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: 'all', label: 'All' },
  ];

  const maxSymbolCount = Math.max(...data.symbols.map((s) => s.count));
  const maxLatency = Math.max(...data.latencyBuckets.map((b) => b.percentage));

  return (
    <div className="space-y-8">
      {/* -- Header -------------------------------------------------- */}
      <div
        className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="text-3xl font-black tracking-tight text-white font-display">Analytics</h1>
        <div className="flex items-center gap-1 glass rounded-2xl p-1">
          {timeRanges.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setTimeRange(tr.key)}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition-all duration-300 focus-ring ${
                timeRange === tr.key
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-terminal-surface border border-transparent'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* -- Stats Summary Row --------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Signals"
          value={data.totalSignals.toLocaleString()}
          delay={0}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green">
              <TrendingUp size={12} />
              +{data.todaySignals} today
            </span>
          }
        />
        <StatCard
          label="Copy Success Rate"
          value={`${data.successRate}%`}
          valueClass="text-neon-green glow-text-green"
          delay={60}
          sub={
            <span className="text-xs text-terminal-muted font-mono-nums">
              {data.successCount.toLocaleString()} / {data.totalSignals.toLocaleString()}
            </span>
          }
        />
        <StatCard
          label="Avg Latency"
          value={`${data.avgLatency}ms`}
          delay={120}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green">
              <TrendingDown size={12} />
              <span className="font-mono-nums">12%</span> improving
            </span>
          }
        />
        <StatCard
          label="Blocked Trades"
          value={String(data.totalBlocked)}
          valueClass="text-neon-amber"
          delay={180}
          sub={
            <span className="text-xs text-terminal-muted font-mono-nums">
              {((data.totalBlocked / data.totalSignals) * 100).toFixed(1)}% of total
            </span>
          }
        />
      </div>

      {/* -- Copy Success Rate Bar Chart ----------------------------- */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '240ms' }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={16} className="text-neon-cyan" />
              Copy Success Rate \u2014 Last 7 Days
            </CardTitle>
          </CardHeader>

          <div className="flex items-end gap-3 justify-between px-2">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-48 text-[10px] text-terminal-muted font-mono-nums pr-2 pb-6 shrink-0 uppercase tracking-[0.15em]">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-3 flex-1 justify-around">
              {data.dailyBars.map((bar) => {
                const total = bar.executed + bar.failed;
                const successPct = (bar.executed / total) * 100;
                const failPct = (bar.failed / total) * 100;

                return (
                  <div key={bar.day} className="flex flex-col items-center gap-1">
                    <div className="relative group flex flex-col items-center">
                      <BarTooltip executed={bar.executed} failed={bar.failed} />
                      <div
                        className="w-10 flex flex-col-reverse rounded-t-sm overflow-hidden"
                        style={{ height: '192px' }}
                      >
                        <div
                          className="bg-neon-green transition-all duration-300 shadow-[0_0_8px_#00ff9d20]"
                          style={{ height: `${successPct}%` }}
                        />
                        <div
                          className="bg-neon-red transition-all duration-300 shadow-[0_0_8px_#ff3d5720]"
                          style={{ height: `${failPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-terminal-muted mt-1 font-mono-nums">{bar.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* -- Two-Column: Latency + Blocked Reasons ------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* -- Latency Distribution ---------------------------------- */}
        <section
          className="animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={16} className="text-neon-cyan" />
                Latency Distribution
              </CardTitle>
            </CardHeader>

            <div className="space-y-3">
              {data.latencyBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0 text-right font-mono-nums">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-8 bg-terminal-border/20 rounded-r overflow-hidden relative">
                    <div
                      className={`h-full rounded-r ${bucket.color} transition-all duration-500`}
                      style={{
                        width: `${(bucket.percentage / maxLatency) * 100}%`,
                        background: bucket.color.includes('cyan')
                          ? 'linear-gradient(90deg, #00e5ff, #00e5ff99)'
                          : bucket.color.includes('amber')
                            ? 'linear-gradient(90deg, #ffb800, #ffb80099)'
                            : undefined,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono-nums text-slate-300 w-10 text-right">
                    {bucket.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* -- Blocked Trade Reasons --------------------------------- */}
        <section
          className="animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart size={16} className="text-neon-amber" />
                Blocked Trade Reasons
              </CardTitle>
            </CardHeader>

            <div className="space-y-3">
              {data.blockedReasons.map((reason) => {
                const pct = data.totalBlocked > 0
                  ? ((reason.count / data.totalBlocked) * 100).toFixed(0)
                  : '0';

                return (
                  <div key={reason.label} className="relative">
                    {/* Background percentage bar */}
                    <div
                      className={`absolute inset-0 ${reason.dotClass}/10 rounded-xl transition-all duration-500`}
                      style={{ width: `${(reason.count / data.totalBlocked) * 100}%` }}
                    />
                    <div className="relative flex items-center gap-3 px-4 py-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${reason.dotClass} shadow-[0_0_4px_currentColor]`} />
                      <span className="text-sm text-slate-300 flex-1">{reason.label}</span>
                      <span className="font-mono-nums text-sm text-white">{reason.count}</span>
                      <span className="font-mono-nums text-xs text-terminal-muted w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>

      {/* -- Most Active Symbols ------------------------------------- */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '420ms' }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={16} className="text-neon-cyan" />
              Most Active Symbols
            </CardTitle>
          </CardHeader>

          <div className="space-y-2.5">
            {data.symbols.map((sym, i) => (
              <div key={sym.symbol} className="flex items-center gap-3">
                <span className="text-xs font-mono-nums text-slate-300 w-16 shrink-0">
                  {sym.symbol}
                </span>
                <div className="flex-1 h-6 bg-terminal-border/20 rounded-r overflow-hidden">
                  <div
                    className="h-full rounded-r transition-all duration-500"
                    style={{
                      width: `${(sym.count / maxSymbolCount) * 100}%`,
                      opacity: 1 - i * 0.08,
                      background: 'linear-gradient(90deg, #00e5ff, #00e5ff99)',
                      boxShadow: '0 0 8px #00e5ff20',
                    }}
                  />
                </div>
                <span className="text-xs font-mono-nums text-slate-300 w-12 text-right">
                  {sym.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* -- Follower Performance Table ------------------------------ */}
      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '480ms' }}
      >
        <Card className="overflow-hidden p-0">
          <div className="px-5 pt-5 pb-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={16} className="text-neon-green" />
                Follower Account Performance
              </CardTitle>
            </CardHeader>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-terminal-border bg-terminal-surface/80 text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
                  <th className="px-5 py-3 text-left font-medium">Account</th>
                  <th className="px-5 py-3 text-right font-medium">Signals</th>
                  <th className="px-5 py-3 text-right font-medium">Executed</th>
                  <th className="px-5 py-3 text-right font-medium">Blocked</th>
                  <th className="px-5 py-3 text-right font-medium">Failed</th>
                  <th className="px-5 py-3 text-right font-medium">Success Rate</th>
                  <th className="px-5 py-3 text-right font-medium">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {data.followers.map((row, i) => {
                  const rateColor =
                    row.successRate >= 95
                      ? 'text-neon-green'
                      : row.successRate >= 80
                        ? 'text-neon-amber'
                        : 'text-neon-red';

                  const rateBg =
                    row.successRate >= 95
                      ? 'bg-neon-green/5'
                      : row.successRate >= 80
                        ? 'bg-neon-amber/5'
                        : 'bg-neon-red/5';

                  return (
                    <tr
                      key={row.account}
                      className="border-b border-terminal-border/50 last:border-0 data-row transition-colors"
                      style={{ animationDelay: `${540 + i * 40}ms` }}
                    >
                      <td className="px-5 py-3 text-slate-200 font-medium">{row.account}</td>
                      <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                        {row.signalsReceived.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-neon-green">
                        {row.executed.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-neon-amber">
                        {row.blocked.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-neon-red">
                        {row.failed.toLocaleString()}
                      </td>
                      <td className={`px-5 py-3 text-right font-mono-nums font-semibold ${rateColor}`}>
                        <span className={`inline-block rounded-lg px-2 py-0.5 ${rateBg}`}>
                          {row.successRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                        {row.avgLatency}ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

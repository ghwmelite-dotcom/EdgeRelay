import { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Signal,
  Clock,
  CheckCircle2,
  Wifi,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

// ── Types ────────────────────────────────────────────────────────
// TODO: wire to real API

interface DailySignal {
  day: string;
  count: number;
}

interface ExecutionStat {
  status: string;
  count: number;
}

interface LatencyData {
  avg_latency: number;
  min_latency: number;
  max_latency: number;
  total_executions: number;
}

interface RateLimitData {
  current_minute_usage: number;
  limit_per_minute: number;
  remaining: number;
}

interface AccountUsageRow {
  id: string;
  alias: string;
  role: 'master' | 'follower';
  signals_today: number;
  rate_current: number;
  rate_limit: number;
  avg_latency: number;
  last_heartbeat: string | null;
}

// ── Mock Data ────────────────────────────────────────────────────
// TODO: wire to real API

const MOCK_ACCOUNTS = [
  { value: 'all', label: 'All Accounts' },
  { value: 'acc_01', label: 'Primary Master' },
  { value: 'acc_02', label: 'Scalper Bot' },
];

const MOCK_RATE_LIMIT: RateLimitData = {
  current_minute_usage: 12,
  limit_per_minute: 60,
  remaining: 48,
};

const MOCK_DAILY_SIGNALS: DailySignal[] = [
  { day: '2026-03-16', count: 142 },
  { day: '2026-03-17', count: 198 },
  { day: '2026-03-18', count: 87 },
  { day: '2026-03-19', count: 231 },
  { day: '2026-03-20', count: 176 },
  { day: '2026-03-21', count: 203 },
  { day: '2026-03-22', count: 154 },
];

const MOCK_EXECUTION_STATS: ExecutionStat[] = [
  { status: 'executed', count: 892 },
  { status: 'blocked', count: 43 },
  { status: 'failed', count: 12 },
  { status: 'skipped', count: 28 },
];

const MOCK_LATENCY: LatencyData = {
  avg_latency: 23.4,
  min_latency: 8,
  max_latency: 142,
  total_executions: 892,
};

const MOCK_ACCOUNT_TABLE: AccountUsageRow[] = [
  { id: 'acc_01', alias: 'Primary Master', role: 'master', signals_today: 154, rate_current: 12, rate_limit: 60, avg_latency: 23.4, last_heartbeat: new Date(Date.now() - 5000).toISOString() },
  { id: 'acc_02', alias: 'Scalper Bot', role: 'master', signals_today: 89, rate_current: 4, rate_limit: 60, avg_latency: 18.7, last_heartbeat: new Date(Date.now() - 12000).toISOString() },
  { id: 'acc_03', alias: 'Swing Follow', role: 'follower', signals_today: 42, rate_current: 1, rate_limit: 60, avg_latency: 31.2, last_heartbeat: new Date(Date.now() - 45000).toISOString() },
  { id: 'acc_04', alias: 'Copy Alpha', role: 'follower', signals_today: 67, rate_current: 3, rate_limit: 60, avg_latency: 27.8, last_heartbeat: new Date(Date.now() - 8000).toISOString() },
];

// ── Helpers ──────────────────────────────────────────────────────

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getHeartbeatStatus(lastHeartbeat: string | null): 'connected' | 'disconnected' | 'idle' {
  if (!lastHeartbeat) return 'idle';
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  if (elapsed < 30_000) return 'connected';
  return 'disconnected';
}

// ── Component ────────────────────────────────────────────────────

export function UsagePage() {
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [rateLimit, setRateLimit] = useState(MOCK_RATE_LIMIT);

  // Calculate seconds remaining in the current minute
  const calcSecondsRemaining = useCallback(() => {
    return 60 - new Date().getSeconds();
  }, []);

  // Countdown timer — updates every second
  useEffect(() => {
    setSecondsRemaining(calcSecondsRemaining());
    const timer = setInterval(() => {
      const remaining = calcSecondsRemaining();
      setSecondsRemaining(remaining);
      // Reset rate when minute rolls over
      if (remaining === 60) {
        setRateLimit((prev) => ({ ...prev, current_minute_usage: 0, remaining: prev.limit_per_minute }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [calcSecondsRemaining]);

  // Auto-refresh data every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // TODO: fetch real data here
      // For now, simulate minor fluctuation
      setRateLimit((prev) => {
        const usage = Math.min(prev.limit_per_minute, prev.current_minute_usage + Math.floor(Math.random() * 3));
        return { ...prev, current_minute_usage: usage, remaining: prev.limit_per_minute - usage };
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Rate limit gauge calculations
  const usagePercent = Math.round((rateLimit.current_minute_usage / rateLimit.limit_per_minute) * 100);
  const gaugeColor =
    usagePercent > 80 ? 'neon-red' : usagePercent > 50 ? 'neon-amber' : 'neon-green';
  const gaugeGlow =
    usagePercent > 80
      ? 'shadow-[0_0_20px_#ff3d5740]'
      : usagePercent > 50
        ? 'shadow-[0_0_20px_#ffb80040]'
        : 'shadow-[0_0_20px_#00ff9d40]';

  // Execution stats
  const totalExecutions = MOCK_EXECUTION_STATS.reduce((s, e) => s + e.count, 0);
  const executedCount = MOCK_EXECUTION_STATS.find((e) => e.status === 'executed')?.count ?? 0;
  const successRate = totalExecutions > 0 ? Math.round((executedCount / totalExecutions) * 100) : 0;

  // Active connections
  const activeConnections = MOCK_ACCOUNT_TABLE.filter(
    (a) => getHeartbeatStatus(a.last_heartbeat) === 'connected',
  ).length;

  // Chart max for bar scaling
  const chartMax = Math.max(...MOCK_DAILY_SIGNALS.map((d) => d.count), 1);
  const today = new Date().toISOString().slice(0, 10);

  // Signals yesterday comparison
  const signalsToday = MOCK_DAILY_SIGNALS.find((d) => d.day === today)?.count ?? 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const signalsYesterday = MOCK_DAILY_SIGNALS.find((d) => d.day === yesterday)?.count ?? 0;
  const signalsDelta = signalsToday - signalsYesterday;

  const executionColors: Record<string, { bg: string; text: string; label: string }> = {
    executed: { bg: 'bg-neon-green', text: 'text-neon-green', label: 'Executed' },
    blocked: { bg: 'bg-neon-amber', text: 'text-neon-amber', label: 'Blocked' },
    failed: { bg: 'bg-neon-red', text: 'text-neon-red', label: 'Failed' },
    skipped: { bg: 'bg-terminal-muted', text: 'text-terminal-muted', label: 'Skipped' },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">
          API Usage
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              options={MOCK_ACCOUNTS}
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            />
          </div>
          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setAutoRefresh((p) => !p)}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : undefined} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
        </div>
      </div>

      {/* Rate Limit Gauge */}
      <Card variant="elevated" className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-neon-cyan" />
              Rate Limit
            </span>
          </CardTitle>
          <span className="font-mono text-xs text-terminal-muted">
            Resets in <span className="font-mono-nums text-slate-300">{secondsRemaining}s</span>
          </span>
        </CardHeader>

        <div className="space-y-4">
          {/* Usage text */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className={`text-4xl font-black font-mono-nums text-${gaugeColor}`}>
                {rateLimit.current_minute_usage}
              </span>
              <span className="text-lg text-terminal-muted font-mono-nums ml-1">
                / {rateLimit.limit_per_minute}
              </span>
              <span className="ml-2 text-sm text-slate-500">requests this minute</span>
            </div>
            <span className={`text-2xl font-black font-mono-nums text-${gaugeColor}`}>
              {usagePercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-terminal-card border border-terminal-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${gaugeGlow} ${
                usagePercent > 80 ? 'bg-neon-red animate-pulse' : usagePercent > 50 ? 'bg-neon-amber' : 'bg-neon-green'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>

          {/* Sub stats */}
          <div className="flex gap-6 text-xs text-terminal-muted">
            <span>
              Remaining: <span className="font-mono-nums text-slate-300">{rateLimit.remaining}</span>
            </span>
            <span>
              Limit: <span className="font-mono-nums text-slate-300">{rateLimit.limit_per_minute}/min</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Signals Today */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Signals Today
              </p>
              <p className="text-2xl font-black font-mono-nums text-white">
                {formatNumber(signalsToday)}
              </p>
            </div>
            <div className="rounded-xl bg-neon-cyan/8 p-2.5">
              <Signal className="h-5 w-5 text-neon-cyan" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {signalsDelta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-neon-green" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-neon-red" />
            )}
            <span className={`font-mono-nums ${signalsDelta >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {signalsDelta >= 0 ? '+' : ''}{signalsDelta}
            </span>
            <span className="text-terminal-muted">vs yesterday</span>
          </div>
        </Card>

        {/* Avg Latency */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Avg Latency
              </p>
              <p className="text-2xl font-black font-mono-nums text-white">
                {MOCK_LATENCY.avg_latency.toFixed(1)}<span className="text-sm text-terminal-muted ml-0.5">ms</span>
              </p>
            </div>
            <div className="rounded-xl bg-neon-amber/8 p-2.5">
              <Clock className="h-5 w-5 text-neon-amber" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            Range: <span className="font-mono-nums text-slate-400">{MOCK_LATENCY.min_latency}</span>
            <span className="mx-1">—</span>
            <span className="font-mono-nums text-slate-400">{MOCK_LATENCY.max_latency}ms</span>
          </div>
        </Card>

        {/* Success Rate */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Success Rate
              </p>
              <p className="text-2xl font-black font-mono-nums text-neon-green">
                {successRate}%
              </p>
            </div>
            <div className="rounded-xl bg-neon-green/8 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-neon-green" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            <span className="font-mono-nums text-slate-400">{formatNumber(executedCount)}</span> of{' '}
            <span className="font-mono-nums text-slate-400">{formatNumber(totalExecutions)}</span> executions
          </div>
        </Card>

        {/* Active Connections */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Active Connections
              </p>
              <p className="text-2xl font-black font-mono-nums text-white">
                {activeConnections}
              </p>
            </div>
            <div className="rounded-xl bg-neon-cyan/8 p-2.5">
              <Wifi className="h-5 w-5 text-neon-cyan" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            <span className="font-mono-nums text-slate-400">{MOCK_ACCOUNT_TABLE.length}</span> total accounts
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Signal Volume Chart */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Signal Volume &mdash; Last 7 Days</CardTitle>
          </CardHeader>
          <div className="flex items-end justify-between gap-2" style={{ height: 180 }}>
            {MOCK_DAILY_SIGNALS.map((d) => {
              const heightPercent = (d.count / chartMax) * 100;
              const isToday = d.day === today;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  {/* Count label */}
                  <span className="text-[10px] font-mono-nums text-slate-500">
                    {d.count}
                  </span>
                  {/* Bar */}
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-neon-cyan shadow-[0_0_16px_#00e5ff50,0_0_32px_#00e5ff20]'
                          : 'bg-neon-cyan/60 shadow-[0_0_8px_#00e5ff20]'
                      }`}
                      style={{ height: `${heightPercent}%`, minHeight: 4 }}
                    />
                  </div>
                  {/* Day label */}
                  <span className={`text-[10px] font-medium ${isToday ? 'text-neon-cyan' : 'text-slate-500'}`}>
                    {getDayLabel(d.day)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Execution Breakdown */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <CardHeader>
            <CardTitle>Execution Results</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {MOCK_EXECUTION_STATS.map((stat) => {
              const pct = totalExecutions > 0 ? Math.round((stat.count / totalExecutions) * 100) : 0;
              const colors = executionColors[stat.status] ?? executionColors['skipped']!;
              return (
                <div key={stat.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${colors.text}`}>{colors.label}</span>
                    <span className="font-mono-nums text-slate-400">
                      {formatNumber(stat.count)} <span className="text-terminal-muted">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-card border border-terminal-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Per-Account Table */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle>Account Usage</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-terminal-border/40">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Account
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Role
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Signals Today
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Rate
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Latency
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACCOUNT_TABLE.map((row) => {
                const status = getHeartbeatStatus(row.last_heartbeat);
                return (
                  <tr key={row.id} className="data-row border-b border-terminal-border/20">
                    <td className="px-5 py-3 text-slate-200 font-medium">{row.alias}</td>
                    <td className="px-5 py-3">
                      <Badge variant={row.role === 'master' ? 'cyan' : 'green'}>
                        {row.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                      {formatNumber(row.signals_today)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                      {row.rate_current}<span className="text-terminal-muted">/{row.rate_limit}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                      {row.avg_latency.toFixed(1)}<span className="text-terminal-muted ml-0.5">ms</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusDot
                        status={status}
                        label={status === 'connected' ? 'Online' : status === 'disconnected' ? 'Offline' : 'Idle'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

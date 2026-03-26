import { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Signal,
  Clock,
  CheckCircle2,
  Wifi,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Button } from '@/components/ui/Button';
import { useAccountsStore } from '@/stores/accounts';

// ── Helpers ──────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getHeartbeatStatus(lastHeartbeat: string | null): 'connected' | 'disconnected' | 'idle' {
  if (!lastHeartbeat) return 'idle';
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  if (elapsed < 60_000) return 'connected';
  return 'disconnected';
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < 0) return 'Just now';
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// ── Component ────────────────────────────────────────────────────

export function UsagePage() {
  const { accounts, isLoading, fetchAccounts } = useAccountsStore();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Initial fetch
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Countdown timer — updates every second (rate limit minute window)
  const calcSecondsRemaining = useCallback(() => {
    return 60 - new Date().getSeconds();
  }, []);

  useEffect(() => {
    setSecondsRemaining(calcSecondsRemaining());
    const timer = setInterval(() => {
      setSecondsRemaining(calcSecondsRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [calcSecondsRemaining]);

  // Auto-refresh accounts every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAccounts();
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAccounts]);

  // Derived data from real accounts
  const activeConnections = accounts.filter(
    (a) => a.is_active && getHeartbeatStatus(a.last_heartbeat) === 'connected',
  ).length;

  const signalsToday = accounts
    .filter((a) => a.role === 'master')
    .reduce((sum, a) => sum + a.signals_today, 0);

  const rateLimitPerMinute = 120;

  // Today's date for chart
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Placeholder constant
  const DASH = '\u2014';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">
          API Usage
        </h1>
        <div className="flex items-center gap-3">
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

      {/* Rate Limit Card */}
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
              <span className="text-4xl font-black font-mono-nums text-terminal-muted">
                {DASH}
              </span>
              <span className="text-lg text-terminal-muted font-mono-nums ml-1">
                / {rateLimitPerMinute}
              </span>
              <span className="ml-2 text-sm text-slate-500">requests this minute</span>
            </div>
            <span className="text-sm text-terminal-muted">
              No real-time rate data
            </span>
          </div>

          {/* Progress bar — empty, no real data */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-terminal-card border border-terminal-border">
            <div
              className="h-full rounded-full bg-terminal-muted/30"
              style={{ width: '0%' }}
            />
          </div>

          {/* Sub stats */}
          <div className="flex gap-6 text-xs text-terminal-muted">
            <span>
              Current usage: <span className="font-mono-nums text-slate-500">{DASH}</span>
            </span>
            <span>
              Limit: <span className="font-mono-nums text-slate-300">{rateLimitPerMinute}/min</span>
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
                {isLoading && accounts.length === 0 ? DASH : formatNumber(signalsToday)}
              </p>
            </div>
            <div className="rounded-xl bg-neon-cyan/8 p-2.5">
              <Signal className="h-5 w-5 text-neon-cyan" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            From {accounts.filter((a) => a.role === 'master').length} master account{accounts.filter((a) => a.role === 'master').length !== 1 ? 's' : ''}
          </div>
        </Card>

        {/* Avg Latency — no data */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Avg Latency
              </p>
              <p className="text-2xl font-black font-mono-nums text-terminal-muted">
                {DASH}
              </p>
            </div>
            <div className="rounded-xl bg-neon-amber/8 p-2.5">
              <Clock className="h-5 w-5 text-neon-amber" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            No latency API available
          </div>
        </Card>

        {/* Success Rate — no data */}
        <Card hover className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                Success Rate
              </p>
              <p className="text-2xl font-black font-mono-nums text-terminal-muted">
                {DASH}
              </p>
            </div>
            <div className="rounded-xl bg-neon-green/8 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-neon-green" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            No execution tracking API
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
                {isLoading && accounts.length === 0 ? DASH : activeConnections}
              </p>
            </div>
            <div className="rounded-xl bg-neon-cyan/8 p-2.5">
              <Wifi className="h-5 w-5 text-neon-cyan" />
            </div>
          </div>
          <div className="mt-3 text-xs text-terminal-muted">
            <span className="font-mono-nums text-slate-400">{accounts.length}</span> total accounts
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Signal Volume — Today only */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Signal Volume</CardTitle>
          </CardHeader>
          <div className="flex items-end justify-center gap-2" style={{ height: 180 }}>
            {isLoading && accounts.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-terminal-muted" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 w-24">
                <span className="text-[10px] font-mono-nums text-slate-500">
                  {signalsToday}
                </span>
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-neon-cyan shadow-[0_0_16px_#00e5ff50,0_0_32px_#00e5ff20] transition-all duration-500"
                    style={{ height: signalsToday > 0 ? '100%' : '4px', minHeight: 4 }}
                  />
                </div>
                <span className="text-[10px] font-medium text-neon-cyan">
                  {todayLabel}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-terminal-muted">
            Historical daily data requires a metrics API
          </p>
        </Card>

        {/* Execution Breakdown — no data */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <CardHeader>
            <CardTitle>Execution Results</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {(['Executed', 'Blocked', 'Failed', 'Skipped'] as const).map((label) => {
              const colorMap: Record<string, { bg: string; text: string }> = {
                Executed: { bg: 'bg-neon-green', text: 'text-neon-green' },
                Blocked: { bg: 'bg-neon-amber', text: 'text-neon-amber' },
                Failed: { bg: 'bg-neon-red', text: 'text-neon-red' },
                Skipped: { bg: 'bg-terminal-muted', text: 'text-terminal-muted' },
              };
              const colors = colorMap[label]!;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${colors.text}`}>{label}</span>
                    <span className="font-mono-nums text-slate-500">{DASH}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-terminal-card border border-terminal-border/50">
                    <div
                      className={`h-full rounded-full ${colors.bg}`}
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-terminal-muted">
            No execution tracking API available
          </p>
        </Card>
      </div>

      {/* Per-Account Table */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle>Account Usage</CardTitle>
        </CardHeader>

        {isLoading && accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-terminal-muted" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center text-sm text-terminal-muted">
            No accounts found. Create an account to get started.
          </div>
        ) : (
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
                    Last Signal
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                    Heartbeat
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-terminal-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const status = getHeartbeatStatus(account.last_heartbeat);
                  return (
                    <tr key={account.id} className="data-row border-b border-terminal-border/20">
                      <td className="px-5 py-3 text-slate-200 font-medium">
                        {account.alias}
                        {account.broker_name && (
                          <span className="ml-1.5 text-xs text-terminal-muted">({account.broker_name})</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={account.role === 'master' ? 'cyan' : 'green'}>
                          {account.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                        {formatNumber(account.signals_today)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-slate-400 text-xs">
                        {timeAgo(account.last_signal_at)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono-nums text-slate-400 text-xs">
                        {timeAgo(account.last_heartbeat)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusDot
                          status={account.is_active ? status : 'idle'}
                          label={
                            !account.is_active
                              ? 'Inactive'
                              : status === 'connected'
                                ? 'Online'
                                : status === 'disconnected'
                                  ? 'Offline'
                                  : 'Idle'
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

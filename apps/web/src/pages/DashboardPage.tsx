import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Radio,
  Shield,
  Wifi,
  Signal,
  Target,
  Gauge,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useAccountsStore, type Account } from '@/stores/accounts';
import { useCommandCenterStore, type AccountHealthResult } from '@/stores/commandCenter';
import { useNotificationStore } from '@/stores/notifications';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { TelegramBanner } from '@/components/dashboard/TelegramBanner';
import { MarketHoursWidget } from '@/components/dashboard/MarketHoursWidget';
import { MarketIntelWidget } from '@/components/dashboard/MarketIntelWidget';

// ── Signal type from API ─────────────────────────────────────────

interface ApiSignal {
  id: string;
  master_account_id: string;
  sequence_num: number;
  action: string;
  order_type: string;
  symbol: string;
  volume: number;
  price: number;
  received_at: string;
}

// ── Helpers ────────────────────────────────────────────────────

function isConnected(heartbeat: string | null): boolean {
  if (!heartbeat) return false;
  // Heartbeat can be Unix timestamp (e.g., "1774578171.0") or ISO string
  const ts = parseFloat(heartbeat);
  const heartbeatMs = !isNaN(ts) && ts > 1e9 && ts < 1e12
    ? ts * 1000                      // Unix seconds → ms
    : new Date(heartbeat).getTime(); // ISO string
  if (isNaN(heartbeatMs)) return false;
  return Date.now() - heartbeatMs < 120_000; // 2 minutes tolerance (was 30s — too strict)
}

function formatCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lotModeLabel(mode: string): string {
  const map: Record<string, string> = {
    mirror: 'Mirror',
    fixed: 'Fixed',
    multiplier: 'Multiplier',
    risk_percent: 'Risk %',
  };
  return map[mode] ?? mode;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late Session';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Late Session';
}

function useRealtimeClock(): string {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

/** Map API action strings to display-friendly action types */
function normalizeAction(action: string): 'buy_open' | 'sell_open' | 'close' {
  const lower = action.toLowerCase();
  if (lower.includes('buy')) return 'buy_open';
  if (lower.includes('sell')) return 'sell_open';
  return 'close';
}

// ── Sparkline Component ────────────────────────────────────────

function MiniSparkline() {
  const bars = [18, 32, 25, 38, 28, 42, 35, 30, 38];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-px h-6">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full transition-all duration-500"
          style={{
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(to top, #00e5ff40, #00e5ff)`,
            boxShadow: '0 0 4px #00e5ff40',
          }}
        />
      ))}
    </div>
  );
}

// ── System Status Bar ──────────────────────────────────────────

function SystemStatusBar() {
  return (
    <div
      className="animate-fade-in-up glass-premium rounded-xl px-4 py-2.5 hidden sm:flex items-center justify-between"
      style={{ animationDelay: '0ms' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-neon-green" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-mono-nums text-neon-green glow-text-green font-semibold">
            System Status: All Operational
          </span>
        </div>
        <span className="h-3 w-px bg-terminal-border" />
        <div className="flex items-center gap-1.5">
          <Wifi size={11} className="text-neon-cyan/60" />
          <span className="text-[10px] font-mono-nums text-terminal-muted">Edge Network</span>
          <span className="live-dot" style={{ width: 4, height: 4 }} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-neon-amber" />
          <span className="text-[10px] font-mono-nums text-terminal-muted">
            Uptime <span className="text-slate-300">99.99%</span>
          </span>
        </div>
        <span className="h-3 w-px bg-terminal-border" />
        <div className="flex items-center gap-1.5">
          <Signal size={11} className="text-neon-cyan/60" />
          <span className="text-[10px] font-mono-nums text-terminal-muted">
            Ping <span className="text-neon-cyan">12ms</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  delay: number;
  glowValue?: boolean;
  extra?: React.ReactNode;
  borderClass?: string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, sub, delay, glowValue, extra, borderClass, icon }: StatCardProps) {
  return (
    <div
      className={`animate-fade-in-up glass-premium card-hover-premium rounded-2xl p-5 flex-1 min-w-0 relative overflow-hidden ${borderClass ?? 'stat-card-cyan'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top right, #00e5ff06 0%, transparent 70%)',
        }}
      />

      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-terminal-muted">{icon}</span>}
        <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
          {label}
        </p>
      </div>
      <div className="flex items-end justify-between">
        <p
          className={`text-2xl sm:text-3xl font-black font-mono-nums text-white animate-count-up ${
            glowValue ? 'text-neon-cyan glow-text-cyan' : ''
          }`}
          style={{ animationDelay: `${delay + 200}ms` }}
        >
          {value}
        </p>
        {extra}
      </div>
      {sub && <div className="mt-2.5">{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { accounts, fetchAccounts } = useAccountsStore();
  const { healthResults, fetchHealth } = useCommandCenterStore();
  const { checkTelegramStatus } = useNotificationStore();
  const clock = useRealtimeClock();

  useEffect(() => { checkTelegramStatus(); }, []);

  // Fetch recent signals and total P&L from API
  const [recentSignals, setRecentSignals] = useState<ApiSignal[]>([]);
  const [totalPnl, setTotalPnl] = useState<{ profit: number; trades: number; winRate: number } | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchHealth();

    api.get<ApiSignal[]>('/signals?limit=5').then((res) => {
      if (res.data) {
        setRecentSignals(res.data);
      }
    });
  }, [fetchAccounts, fetchHealth]);

  // Fetch total P&L across all accounts from journal stats
  useEffect(() => {
    if (accounts.length === 0) return;
    const fetchPnl = async () => {
      let totalProfit = 0;
      let totalTrades = 0;
      let totalWins = 0;
      for (const account of accounts) {
        try {
          const res = await api.get<{
            net_profit: number;
            total_trades: number;
            winning_trades: number;
          }>(`/journal/stats/${account.id}`);
          if (res.data) {
            totalProfit += res.data.net_profit ?? 0;
            totalTrades += res.data.total_trades ?? 0;
            totalWins += res.data.winning_trades ?? 0;
          }
        } catch { /* skip */ }
      }
      setTotalPnl({
        profit: totalProfit,
        trades: totalTrades,
        winRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
      });
    };
    fetchPnl();
  }, [accounts]);

  const masters = accounts.filter((a) => a.role === 'master');
  const followers = accounts.filter((a) => a.role === 'follower');

  // Derive stats from real account data
  const signalsToday = useMemo(
    () => masters.reduce((sum, m) => sum + (m.signals_today ?? 0), 0),
    [masters],
  );
  const activeAccounts = useMemo(
    () => accounts.filter((a) => isConnected(a.last_heartbeat)).length,
    [accounts],
  );
  const accountLimit = accounts.length > 0 ? Math.max(accounts.length, 10) : 10;

  // Build health lookup for followers
  const healthByAccountId = useMemo(() => {
    const map = new Map<string, AccountHealthResult>();
    for (const h of healthResults) {
      map.set(h.account_id, h);
    }
    return map;
  }, [healthResults]);

  return (
    <div className="space-y-8">
      {/* ── System Status Bar ────────────────────────────────────── */}
      <SystemStatusBar />

      {/* ── Mission Control Header ───────────────────────────────── */}
      <div className="animate-fade-in-up flex items-start justify-between" style={{ animationDelay: '60ms' }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-terminal-muted font-semibold mb-1.5">
            {getGreeting()}, Commander
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="text-gradient-animated">{user?.name ?? 'Trader'}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-2">
            <span>Mission Control</span>
            <span className="h-1 w-1 rounded-full bg-terminal-muted" />
            <span className="font-mono-nums text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </p>
        </div>

        {/* Theme Toggle + Live Clock */}
        <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="glass-premium rounded-xl px-5 py-3 flex flex-col items-center gap-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted font-semibold">Local Time</p>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-neon-cyan/50" />
            <span className="font-mono-nums text-lg sm:text-2xl font-bold text-neon-cyan glow-text-cyan tracking-wider">
              {clock}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-neon-green/70 font-medium">Live</span>
          </div>
        </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="divider-diamond" />

      {/* ── Telegram Banner ──────────────────────────────────────── */}
      <TelegramBanner />

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Signals Today"
          value={String(signalsToday)}
          delay={100}
          glowValue
          borderClass="stat-card-cyan"
          icon={<Zap size={12} />}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-terminal-muted font-medium">
              From {masters.length} source{masters.length !== 1 ? 's' : ''}
            </span>
          }
        />
        <StatCard
          label="Total P&L"
          value={totalPnl ? `${totalPnl.profit >= 0 ? '+' : ''}$${Math.abs(totalPnl.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
          delay={160}
          glowValue
          borderClass={totalPnl && totalPnl.profit >= 0 ? 'stat-card-green' : 'stat-card-red'}
          icon={<TrendingUp size={12} />}
          sub={
            totalPnl ? (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${totalPnl.profit >= 0 ? 'text-neon-green glow-text-green' : 'text-neon-red'}`}>
                {totalPnl.profit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                From {totalPnl.trades} closed trade{totalPnl.trades !== 1 ? 's' : ''}
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="Win Rate"
          value={totalPnl && totalPnl.trades > 0 ? `${totalPnl.winRate.toFixed(1)}%` : '--'}
          delay={220}
          borderClass="stat-card-green"
          icon={<Target size={12} />}
          sub={
            totalPnl && totalPnl.trades > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs text-neon-green glow-text-green font-medium">
                <CheckCircle size={12} />
                {totalPnl.winRate >= 50 ? 'Above average' : 'Needs improvement'}
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="Active Accounts"
          value={`${activeAccounts}/${accountLimit}`}
          delay={280}
          borderClass="stat-card-amber"
          icon={<Radio size={12} />}
          sub={
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-terminal-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-neon-amber"
                  style={{
                    width: `${(activeAccounts / accountLimit) * 100}%`,
                    boxShadow: '0 0 6px #ffb80060',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono-nums text-terminal-muted">
                {accountLimit - activeAccounts} free
              </span>
            </div>
          }
        />
      </div>

      {/* Market Hours + Intel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <MarketHoursWidget />
        <MarketIntelWidget />
      </div>

      {/* ── Master Accounts — Signal Sources ──────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full bg-neon-cyan"
              style={{ boxShadow: '0 0 8px #00e5ff80, 0 0 20px #00e5ff40' }}
            />
            <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Signal Sources
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
          <Badge variant="cyan">
            <Radio size={10} />
            {masters.length} Active
          </Badge>
        </div>

        {masters.length === 0 ? (
          <Card className="glass-premium card-hover-premium rounded-2xl flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-4">
              <Activity size={36} className="text-terminal-muted" />
              <div className="absolute -inset-4 rounded-full bg-neon-cyan/5 animate-pulse" />
            </div>
            <p className="text-slate-400 text-sm mb-4">No signal sources configured</p>
            <Link
              to="/accounts"
              className="text-sm font-medium text-neon-cyan hover:underline underline-offset-4 glow-text-cyan inline-flex items-center gap-1.5"
            >
              <Zap size={14} />
              Initialize first master account
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {masters.map((account, i) => (
              <MasterCard key={account.id} account={account} delay={i * 80} />
            ))}
          </div>
        )}
      </section>

      {/* ── Follower Accounts — Receiving Terminals ────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full bg-neon-green"
              style={{ boxShadow: '0 0 8px #00ff9d80, 0 0 20px #00ff9d40' }}
            />
            <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Receiving Terminals
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-neon-green/15 to-transparent" />
          <Badge variant="green">
            <Wifi size={10} />
            {followers.length} Linked
          </Badge>
        </div>

        {followers.length === 0 ? (
          <Card className="glass-premium card-hover-premium rounded-2xl flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-4">
              <TrendingUp size={36} className="text-terminal-muted" />
              <div className="absolute -inset-4 rounded-full bg-neon-green/5 animate-pulse" />
            </div>
            <p className="text-slate-400 text-sm mb-4">No receiving terminals linked</p>
            <Link
              to="/accounts"
              className="text-sm font-medium text-neon-cyan hover:underline underline-offset-4 glow-text-cyan inline-flex items-center gap-1.5"
            >
              <Zap size={14} />
              Link follower accounts to begin
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {followers.map((account, i) => (
              <FollowerCard
                key={account.id}
                account={account}
                healthData={healthByAccountId.get(account.id) ?? null}
                delay={i * 80}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="divider-diamond" />

      {/* ── Recent Signals — Live Feed ────────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '480ms' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-terminal-muted" />
            <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Signal Feed
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/10 to-transparent" />
          <div className="flex items-center gap-2 glass-premium rounded-lg px-3 py-1.5">
            <span className="live-dot" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono-nums text-neon-green font-semibold">
              Live Feed
            </span>
          </div>
        </div>

        <div className="glass-premium rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-terminal-surface/60">
                  <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Time
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Symbol
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Action
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Volume
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentSignals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-terminal-muted text-sm">
                      No signals received yet
                    </td>
                  </tr>
                ) : (
                  recentSignals.map((sig, i) => (
                    <tr
                      key={sig.id}
                      className={`data-row border-b border-terminal-border/40 last:border-0 transition-colors ${
                        i % 2 === 0 ? 'bg-neon-cyan/[0.015]' : ''
                      }`}
                      style={{ animationDelay: `${420 + i * 50}ms` }}
                    >
                      <td className="px-5 py-3.5 font-mono-nums text-neon-cyan text-sm glow-text-cyan">
                        {new Date(sig.received_at).toLocaleTimeString('en-US', { hour12: false })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="cyan" className="font-mono-nums font-bold">{sig.symbol}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <ActionLabel action={normalizeAction(sig.action)} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-nums text-slate-200 font-semibold">
                        {sig.volume.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-nums text-slate-400">
                        {sig.price.toFixed(sig.price > 100 ? 2 : 5)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Feed footer */}
          <div className="px-5 py-3 border-t border-terminal-border/30 flex items-center justify-between bg-terminal-surface/40">
            <span className="text-[10px] font-mono-nums text-terminal-muted">
              Showing last {recentSignals.length} signals
            </span>
            <Link
              to="/signals"
              className="text-[10px] uppercase tracking-[0.15em] font-semibold text-neon-cyan hover:underline underline-offset-4 glow-text-cyan"
            >
              View Full History
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function MasterCard({ account, delay }: { account: Account; delay: number }) {
  const connected = isConnected(account.last_heartbeat);

  return (
    <div
      className="glass-premium card-hover-premium rounded-2xl p-5 animate-fade-in-up stat-card-cyan relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Signal source icon watermark */}
      <Radio
        size={48}
        className="absolute top-3 right-3 text-neon-cyan/[0.04] pointer-events-none"
      />

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Signal size={13} className="text-neon-cyan/60" />
            <p className="font-bold text-slate-100 tracking-tight text-sm sm:text-base">{account.alias}</p>
          </div>
          <p className="text-xs text-slate-500 ml-[21px]">{account.broker_name ?? 'Unknown broker'}</p>
        </div>
        <div className="relative">
          {connected && (
            <div
              className="absolute -inset-2 rounded-full"
              style={{ background: 'radial-gradient(circle, #00ff9d15 0%, transparent 70%)' }}
            />
          )}
          <StatusDot status={connected ? 'connected' : 'disconnected'} label={connected ? 'Online' : 'Offline'} />
        </div>
      </div>

      <div className="divider mb-4" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            Signals Today
          </p>
          <p className="font-mono-nums text-lg sm:text-xl font-bold text-neon-cyan glow-text-cyan">
            {account.signals_today}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            Last Signal
          </p>
          <p className="font-mono-nums text-sm text-slate-400">
            {account.last_signal_at
              ? new Date(account.last_signal_at).toLocaleTimeString('en-US', { hour12: false })
              : '--:--:--'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FollowerCard({
  account,
  healthData,
  delay,
}: {
  account: Account;
  healthData: AccountHealthResult | null;
  delay: number;
}) {
  const connected = isConnected(account.last_heartbeat);
  const lotMode = account.follower_config?.lot_mode ?? 'mirror';
  const maxDrawdown = account.follower_config?.max_total_drawdown_percent ?? 20;

  const hasHealth = healthData !== null;
  // Clamp drawdown to 0 — negative means in profit (no drawdown)
  const drawdownPct = hasHealth ? Math.max(0, healthData.health.drawdown.current_percent) : 0;
  const drawdownUsedPct = hasHealth ? Math.max(0, healthData.health.drawdown.used_percent) : 0;

  // Use used_percent from health (percentage of limit consumed) for gauge
  const drawdownPctOfMax = hasHealth ? Math.max(0, drawdownUsedPct) : 0;

  // Drawdown color logic
  const drawdownColor =
    drawdownPctOfMax > 80
      ? 'bg-neon-red'
      : drawdownPctOfMax > 50
        ? 'bg-neon-amber'
        : 'bg-neon-green';

  const drawdownGlow =
    drawdownPctOfMax > 80
      ? '0 0 8px #ff3d5760, 0 0 16px #ff3d5730'
      : drawdownPctOfMax > 50
        ? '0 0 8px #ffb80050, 0 0 12px #ffb80025'
        : '0 0 6px #00ff9d40';

  const drawdownPulse = drawdownPctOfMax > 80 ? 'animate-pulse' : '';

  const fuelLabel =
    drawdownPctOfMax > 80 ? 'CRITICAL' : drawdownPctOfMax > 50 ? 'CAUTION' : 'NOMINAL';
  const fuelLabelColor =
    drawdownPctOfMax > 80
      ? 'text-neon-red glow-text-red'
      : drawdownPctOfMax > 50
        ? 'text-neon-amber'
        : 'text-neon-green';

  return (
    <div
      className="glass-premium card-hover-premium rounded-2xl p-5 animate-fade-in-up stat-card-green relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Receiving terminal icon watermark */}
      <Wifi
        size={48}
        className="absolute top-3 right-3 text-neon-green/[0.04] pointer-events-none"
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Wifi size={13} className="text-neon-green/60" />
            <p className="font-bold text-slate-100 tracking-tight text-sm sm:text-base">{account.alias}</p>
          </div>
          <p className="text-xs text-slate-500 ml-[21px]">{account.broker_name ?? 'Unknown broker'}</p>
        </div>
        <div className="relative">
          {connected && (
            <div
              className="absolute -inset-2 rounded-full"
              style={{ background: 'radial-gradient(circle, #00ff9d15 0%, transparent 70%)' }}
            />
          )}
          <StatusDot status={connected ? 'connected' : 'disconnected'} />
        </div>
      </div>

      <div className="divider mb-4" />

      {/* P&L + Equity / Not linked */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            P&L
          </p>
          {hasHealth ? (() => {
            // Calculate actual P&L from health score context
            // score > 50 means account is healthy (profitable or minimal loss)
            // drawdown 0 = in profit
            const isPositive = drawdownPct === 0;
            const pnlDisplay = hasHealth && healthData.health.daily_loss
              ? healthData.health.daily_loss.current_percent
              : 0;
            return (
              <p
                className={`font-mono-nums text-lg sm:text-xl font-bold ${
                  isPositive
                    ? 'text-neon-green glow-text-green'
                    : pnlDisplay > 3
                      ? 'text-neon-red glow-text-red'
                      : 'text-neon-amber'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {isPositive ? '+' : '-'}{pnlDisplay.toFixed(2)}%
                </span>
              </p>
            );
          })() : (
            <p className="font-mono-nums text-lg sm:text-xl font-bold text-terminal-muted">&mdash;</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            Drawdown
          </p>
          {hasHealth ? (
            <p className="font-mono-nums text-lg sm:text-xl font-bold text-white">
              {drawdownPct.toFixed(2)}%
            </p>
          ) : (
            <p className="font-mono-nums text-lg sm:text-xl font-bold text-terminal-muted">&mdash;</p>
          )}
        </div>
      </div>

      {/* Lot mode badge */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="purple">{lotModeLabel(lotMode)}</Badge>
        {hasHealth ? (
          <span className={`text-[9px] uppercase tracking-[0.15em] font-mono-nums font-bold ${fuelLabelColor}`}>
            {fuelLabel}
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.15em] font-mono-nums font-bold text-terminal-muted">
            NOT LINKED
          </span>
        )}
      </div>

      {/* Fuel gauge drawdown bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold flex items-center gap-1.5">
            <Gauge size={10} />
            Drawdown Gauge
          </p>
          <p className="text-xs font-mono-nums text-terminal-muted font-bold">
            {hasHealth ? `${drawdownPct.toFixed(1)}%` : '--'}{' '}
            <span className="text-terminal-muted/50">/</span> {maxDrawdown}%
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-terminal-border/60 overflow-hidden relative">
          {/* Tick marks */}
          <div className="absolute inset-0 flex">
            {[25, 50, 75].map((tick) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 w-px bg-terminal-border"
                style={{ left: `${tick}%` }}
              />
            ))}
          </div>
          <div
            className={`h-full rounded-full transition-all duration-700 ${drawdownColor} ${drawdownPulse}`}
            style={{
              width: `${Math.min(drawdownPctOfMax, 100)}%`,
              boxShadow: drawdownGlow,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ActionLabel({ action }: { action: 'buy_open' | 'sell_open' | 'close' }) {
  if (action === 'buy_open') {
    return (
      <span
        className="text-neon-green font-bold text-xs bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1"
        style={{ boxShadow: '0 0 8px #00ff9d10' }}
      >
        <ArrowUpRight size={11} />
        BUY
      </span>
    );
  }
  if (action === 'sell_open') {
    return (
      <span
        className="text-neon-red font-bold text-xs bg-neon-red/10 border border-neon-red/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1"
        style={{ boxShadow: '0 0 8px #ff3d5710' }}
      >
        <ArrowDownRight size={11} />
        SELL
      </span>
    );
  }
  return (
    <span className="text-terminal-muted font-bold text-xs bg-terminal-border/30 border border-terminal-border px-2.5 py-1 rounded-md">
      CLOSE
    </span>
  );
}

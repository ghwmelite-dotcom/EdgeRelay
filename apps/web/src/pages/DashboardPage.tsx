import { useEffect, useState, useCallback } from 'react';
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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';

// ── Mock Data ──────────────────────────────────────────────────
// TODO: wire to real API

const MOCK_STATS = {
  signalsToday: 142,
  signalsChange: 12,
  avgLatency: 38,
  successRate: 99.2,
  activeAccounts: 8,
  accountLimit: 10,
} as const;

const MOCK_PNL: Record<string, { pnl: number; equity: number; drawdownPct: number }> = {};

function getMockPnl(id: string) {
  if (!MOCK_PNL[id]) {
    const pnl = Math.random() > 0.35 ? +(Math.random() * 3000).toFixed(2) : -(Math.random() * 500).toFixed(2);
    MOCK_PNL[id] = {
      pnl,
      equity: +(20000 + Math.random() * 15000).toFixed(2),
      drawdownPct: +(Math.random() * 75).toFixed(1),
    };
  }
  return MOCK_PNL[id];
}

interface MockSignal {
  id: string;
  time: string;
  symbol: string;
  action: 'buy_open' | 'sell_open' | 'close';
  volume: number;
  status: 'executed' | 'blocked' | 'failed';
}

const MOCK_SIGNALS: MockSignal[] = [
  { id: '1', time: '14:32:07', symbol: 'EURUSD', action: 'buy_open', volume: 0.5, status: 'executed' },
  { id: '2', time: '14:31:44', symbol: 'XAUUSD', action: 'sell_open', volume: 1.0, status: 'executed' },
  { id: '3', time: '14:28:19', symbol: 'GBPJPY', action: 'close', volume: 0.3, status: 'executed' },
  { id: '4', time: '14:25:02', symbol: 'USDJPY', action: 'buy_open', volume: 0.2, status: 'blocked' },
  { id: '5', time: '14:22:58', symbol: 'EURUSD', action: 'sell_open', volume: 0.1, status: 'failed' },
];

// ── Helpers ────────────────────────────────────────────────────

function isConnected(heartbeat: string | null): boolean {
  if (!heartbeat) return false;
  return Date.now() - new Date(heartbeat).getTime() < 30_000;
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
      className="animate-fade-in-up glass-premium rounded-xl px-4 py-2.5 flex items-center justify-between"
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
        <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
          {label}
        </p>
      </div>
      <div className="flex items-end justify-between">
        <p
          className={`text-3xl font-black font-mono-nums text-white animate-count-up ${
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
  const clock = useRealtimeClock();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const masters = accounts.filter((a) => a.role === 'master');
  const followers = accounts.filter((a) => a.role === 'follower');

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
          <h1 className="text-3xl font-black tracking-tight">
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

        {/* Live Clock */}
        <div className="glass-premium rounded-xl px-5 py-3 flex flex-col items-center gap-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted font-semibold">Local Time</p>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-neon-cyan/50" />
            <span className="font-mono-nums text-2xl font-bold text-neon-cyan glow-text-cyan tracking-wider">
              {clock}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-neon-green/70 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="divider-diamond" />

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Signals Today"
          value={String(MOCK_STATS.signalsToday)}
          delay={100}
          glowValue
          borderClass="stat-card-cyan"
          icon={<Zap size={12} />}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green glow-text-green font-medium">
              <ArrowUpRight size={12} />
              +{MOCK_STATS.signalsChange}% from yesterday
            </span>
          }
        />
        <StatCard
          label="Avg Copy Latency"
          value={`${MOCK_STATS.avgLatency}ms`}
          delay={160}
          borderClass="stat-card-cyan"
          icon={<Gauge size={12} />}
          extra={<MiniSparkline />}
        />
        <StatCard
          label="Success Rate"
          value={`${MOCK_STATS.successRate}%`}
          delay={220}
          borderClass="stat-card-green"
          icon={<Target size={12} />}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green glow-text-green font-medium">
              <CheckCircle size={12} />
              All Systems Nominal
            </span>
          }
        />
        <StatCard
          label="Active Accounts"
          value={`${MOCK_STATS.activeAccounts}/${MOCK_STATS.accountLimit}`}
          delay={280}
          borderClass="stat-card-amber"
          icon={<Radio size={12} />}
          sub={
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-terminal-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-neon-amber"
                  style={{
                    width: `${(MOCK_STATS.activeAccounts / MOCK_STATS.accountLimit) * 100}%`,
                    boxShadow: '0 0 6px #ffb80060',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono-nums text-terminal-muted">
                {MOCK_STATS.accountLimit - MOCK_STATS.activeAccounts} free
              </span>
            </div>
          }
        />
      </div>

      {/* ── Master Accounts — Signal Sources ──────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full bg-neon-cyan"
              style={{ boxShadow: '0 0 8px #00e5ff80, 0 0 20px #00e5ff40' }}
            />
            <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
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
            <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
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
              <FollowerCard key={account.id} account={account} delay={i * 80} />
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
            <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-terminal-surface/60">
                  <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Time
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Symbol
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Action
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Volume
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SIGNALS.map((sig, i) => (
                  <tr
                    key={sig.id}
                    className={`data-row border-b border-terminal-border/40 last:border-0 transition-colors ${
                      i % 2 === 0 ? 'bg-neon-cyan/[0.015]' : ''
                    }`}
                    style={{ animationDelay: `${420 + i * 50}ms` }}
                  >
                    <td className="px-5 py-3.5 font-mono-nums text-neon-cyan text-sm glow-text-cyan">
                      {sig.time}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="cyan" className="font-mono-nums font-bold">{sig.symbol}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionLabel action={sig.action} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono-nums text-slate-200 font-semibold">
                      {sig.volume.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <SignalStatusBadge status={sig.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feed footer */}
          <div className="px-5 py-3 border-t border-terminal-border/30 flex items-center justify-between bg-terminal-surface/40">
            <span className="text-[10px] font-mono-nums text-terminal-muted">
              Showing last {MOCK_SIGNALS.length} signals
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
            <p className="font-bold text-slate-100 tracking-tight">{account.alias}</p>
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
          <p className="font-mono-nums text-xl font-bold text-neon-cyan glow-text-cyan">
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

function FollowerCard({ account, delay }: { account: Account; delay: number }) {
  const connected = isConnected(account.last_heartbeat);
  const mock = getMockPnl(account.id); // TODO: wire to real API
  const pnlPositive = mock.pnl >= 0;
  const lotMode = account.follower_config?.lot_mode ?? 'mirror';
  const maxDrawdown = account.follower_config?.max_total_drawdown_percent ?? 20;

  // Drawdown color logic
  const drawdownPctOfMax = (mock.drawdownPct / maxDrawdown) * 100;
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
            <p className="font-bold text-slate-100 tracking-tight">{account.alias}</p>
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

      {/* P&L + Equity */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            P&L
          </p>
          <p
            className={`font-mono-nums text-xl font-bold ${
              pnlPositive
                ? 'text-neon-green glow-text-green'
                : 'text-neon-red glow-text-red'
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {pnlPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {formatCurrency(mock.pnl)}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-1">
            Equity
          </p>
          <p className="font-mono-nums text-xl font-bold text-white">
            ${mock.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lot mode badge */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="purple">{lotModeLabel(lotMode)}</Badge>
        <span className={`text-[9px] uppercase tracking-[0.15em] font-mono-nums font-bold ${fuelLabelColor}`}>
          {fuelLabel}
        </span>
      </div>

      {/* Fuel gauge drawdown bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold flex items-center gap-1.5">
            <Gauge size={10} />
            Drawdown Gauge
          </p>
          <p className="text-xs font-mono-nums text-terminal-muted font-bold">
            {mock.drawdownPct}% <span className="text-terminal-muted/50">/</span> {maxDrawdown}%
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

function ActionLabel({ action }: { action: MockSignal['action'] }) {
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

function SignalStatusBadge({ status }: { status: MockSignal['status'] }) {
  const map: Record<MockSignal['status'], { variant: 'green' | 'amber' | 'red'; icon: React.ReactNode }> = {
    executed: { variant: 'green', icon: <CheckCircle size={11} /> },
    blocked: { variant: 'amber', icon: <AlertTriangle size={11} /> },
    failed: { variant: 'red', icon: <AlertTriangle size={11} /> },
  };
  const { variant, icon } = map[status];
  return (
    <Badge variant={variant}>
      {icon}
      <span className="uppercase font-bold text-[10px] tracking-wider">{status}</span>
    </Badge>
  );
}

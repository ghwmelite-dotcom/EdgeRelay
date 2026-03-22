import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
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

// ── Sparkline Component ────────────────────────────────────────

function MiniSparkline() {
  const bars = [18, 32, 25, 38, 28, 42, 35, 30, 38];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-px h-5">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-neon-cyan/60"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
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
}

function StatCard({ label, value, sub, delay, glowValue, extra }: StatCardProps) {
  return (
    <div
      className="animate-fade-in-up glass rounded-2xl p-5 flex-1 min-w-0 relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p
          className={`text-3xl font-black font-mono-nums text-white ${
            glowValue ? 'text-neon-cyan glow-text-cyan' : ''
          }`}
        >
          {value}
        </p>
        {extra}
      </div>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { accounts, fetchAccounts } = useAccountsStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const masters = accounts.filter((a) => a.role === 'master');
  const followers = accounts.filter((a) => a.role === 'follower');

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, <span className="text-slate-300">{user?.name ?? 'Trader'}</span>
        </p>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Signals Today"
          value={String(MOCK_STATS.signalsToday)}
          delay={0}
          glowValue
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green glow-text-green">
              <ArrowUpRight size={12} />
              +{MOCK_STATS.signalsChange}% from yesterday
            </span>
          }
        />
        <StatCard
          label="Avg Copy Latency"
          value={`${MOCK_STATS.avgLatency}ms`}
          delay={60}
          extra={<MiniSparkline />}
        />
        <StatCard
          label="Success Rate"
          value={`${MOCK_STATS.successRate}%`}
          delay={120}
          sub={
            <span className="inline-flex items-center gap-1 text-xs text-neon-green glow-text-green">
              <CheckCircle size={12} />
              Healthy
            </span>
          }
        />
        <StatCard
          label="Active Accounts"
          value={`${MOCK_STATS.activeAccounts}/${MOCK_STATS.accountLimit}`}
          delay={180}
          sub={
            <span className="text-xs text-terminal-muted">
              {MOCK_STATS.accountLimit - MOCK_STATS.activeAccounts} slots remaining
            </span>
          }
        />
      </div>

      {/* ── Master Accounts ─────────────────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan shadow-[0_0_6px_#00e5ff]" />
          <h2 className="text-xs uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Master Accounts
          </h2>
        </div>

        {masters.length === 0 ? (
          <Card className="glass card-hover rounded-2xl flex flex-col items-center justify-center py-12 text-center">
            <Activity size={32} className="text-terminal-muted mb-3" />
            <p className="text-slate-500 text-sm mb-3">No master accounts yet</p>
            <Link
              to="/accounts"
              className="text-sm text-neon-cyan hover:underline underline-offset-4 glow-text-cyan"
            >
              Add your first master account
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {masters.map((account, i) => (
              <MasterCard key={account.id} account={account} delay={i * 60} />
            ))}
          </div>
        )}
      </section>

      {/* ── Follower Accounts ───────────────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '280ms' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#00ff9d]" />
          <h2 className="text-xs uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Follower Accounts
          </h2>
        </div>

        {followers.length === 0 ? (
          <Card className="glass card-hover rounded-2xl flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp size={32} className="text-terminal-muted mb-3" />
            <p className="text-slate-500 text-sm mb-3">No follower accounts yet</p>
            <Link
              to="/accounts"
              className="text-sm text-neon-cyan hover:underline underline-offset-4 glow-text-cyan"
            >
              Add follower accounts to start copying
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {followers.map((account, i) => (
              <FollowerCard key={account.id} account={account} delay={i * 60} />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Signals ──────────────────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <Clock size={14} className="text-terminal-muted" />
          <h2 className="text-xs uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Recent Signals
          </h2>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-terminal-surface/80">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
                    Time
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
                    Symbol
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
                    Action
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
                    Volume
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SIGNALS.map((sig, i) => (
                  <tr
                    key={sig.id}
                    className="data-row border-b border-terminal-border/50 last:border-0 transition-colors"
                    style={{ animationDelay: `${300 + i * 40}ms` }}
                  >
                    <td className="px-5 py-3 font-mono-nums text-neon-cyan/80 text-sm">
                      {sig.time}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="cyan">{sig.symbol}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <ActionLabel action={sig.action} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono-nums text-slate-300">
                      {sig.volume.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <SignalStatusBadge status={sig.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      className="glass card-hover rounded-2xl p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-200">{account.alias}</p>
          <p className="text-sm text-slate-500">{account.broker_name ?? 'Unknown broker'}</p>
        </div>
        <StatusDot status={connected ? 'connected' : 'disconnected'} label={connected ? 'Online' : 'Offline'} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Signals Today
          </p>
          <p className="font-mono-nums text-lg text-neon-cyan glow-text-cyan">
            {account.signals_today}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Last Signal
          </p>
          <p className="font-mono-nums text-xs text-slate-500">
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
      ? 'bg-neon-red shadow-[0_0_8px_#ff3d5740]'
      : drawdownPctOfMax > 50
        ? 'bg-neon-amber shadow-[0_0_8px_#ffb80040]'
        : 'bg-neon-green shadow-[0_0_8px_#00ff9d40]';

  const drawdownPulse = drawdownPctOfMax > 80 ? 'animate-pulse' : '';

  return (
    <div
      className="glass card-hover rounded-2xl p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-200">{account.alias}</p>
          <p className="text-sm text-slate-500">{account.broker_name ?? 'Unknown broker'}</p>
        </div>
        <StatusDot status={connected ? 'connected' : 'disconnected'} />
      </div>

      {/* P&L + Equity */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
            P&L
          </p>
          <p
            className={`font-mono-nums text-lg font-bold ${
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
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Equity
          </p>
          <p className="font-mono-nums text-lg text-white">
            ${mock.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Lot mode badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="purple">{lotModeLabel(lotMode)}</Badge>
      </div>

      {/* Drawdown bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">
            Drawdown
          </p>
          <p className="text-xs font-mono-nums text-terminal-muted">
            {mock.drawdownPct}% / {maxDrawdown}%
          </p>
        </div>
        <div className="h-[3px] w-full rounded-full bg-terminal-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${drawdownColor} ${drawdownPulse}`}
            style={{ width: `${Math.min(drawdownPctOfMax, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActionLabel({ action }: { action: MockSignal['action'] }) {
  if (action === 'buy_open') {
    return (
      <span className="text-neon-green font-medium text-sm bg-neon-green/8 px-2 py-0.5 rounded-md">
        Buy Open
      </span>
    );
  }
  if (action === 'sell_open') {
    return (
      <span className="text-neon-red font-medium text-sm bg-neon-red/8 px-2 py-0.5 rounded-md">
        Sell Open
      </span>
    );
  }
  return <span className="text-terminal-muted font-medium text-sm">Close</span>;
}

function SignalStatusBadge({ status }: { status: MockSignal['status'] }) {
  const map: Record<MockSignal['status'], { variant: 'green' | 'amber' | 'red'; icon: React.ReactNode }> = {
    executed: { variant: 'green', icon: <CheckCircle size={12} /> },
    blocked: { variant: 'amber', icon: <AlertTriangle size={12} /> },
    failed: { variant: 'red', icon: <AlertTriangle size={12} /> },
  };
  const { variant, icon } = map[status];
  return (
    <Badge variant={variant}>
      {icon}
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

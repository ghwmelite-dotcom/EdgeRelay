import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
  Filter,
  ArrowUpDown,
  Clock,
  BarChart3,
  ArrowRight,
  Copy,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.PROD
  ? 'https://edgerelay-api.ghwmelite.workers.dev/v1'
  : '/v1';

// ── Types ──────────────────────────────────────────────────────────
interface Provider {
  id: string;
  display_name: string;
  bio: string | null;
  instruments: string | null;
  strategy_style: string;
  listed_at: string | null;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pips: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  avg_trade_duration_sec: number;
  profit_factor: number;
  active_days: number;
  subscriber_count: number;
  equity_curve_json: string;
  computed_at: string;
}

interface RecentTrade {
  symbol: string;
  direction: string;
  volume: number;
  profit: number;
  pips: number;
  duration_seconds: number;
  close_time: string;
}

interface ProviderDetail {
  profile: Provider;
  stats: Record<string, unknown>;
  recent_trades: RecentTrade[];
}

// ── Constants ──────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'total_pnl', label: 'Highest P&L' },
  { value: 'win_rate', label: 'Win Rate' },
  { value: 'subscribers', label: 'Most Copied' },
  { value: 'newest', label: 'Newest' },
  { value: 'drawdown', label: 'Lowest Drawdown' },
  { value: 'trades', label: 'Most Trades' },
];

const STRATEGY_OPTIONS = [
  { value: '', label: 'All Strategies' },
  { value: 'scalper', label: 'Scalper' },
  { value: 'swing', label: 'Swing' },
  { value: 'position', label: 'Position' },
  { value: 'mixed', label: 'Mixed' },
];

const MIN_DAYS_OPTIONS = [
  { value: '0', label: 'Any Track Record' },
  { value: '7', label: '7+ Days' },
  { value: '14', label: '14+ Days' },
  { value: '30', label: '30+ Days' },
  { value: '90', label: '90+ Days' },
];

const STRATEGY_BADGE_VARIANT: Record<string, 'cyan' | 'green' | 'purple' | 'amber' | 'muted'> = {
  scalper: 'purple',
  swing: 'cyan',
  position: 'green',
  mixed: 'amber',
};

// ── Helpers ────────────────────────────────────────────────────────
function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

// ── Equity Curve Sparkline ─────────────────────────────────────────
function EquityCurveSparkline({ data, width = 200, height = 40 }: { data: string; width?: number; height?: number }) {
  let points: number[];
  try {
    const parsed = JSON.parse(data);
    points = Array.isArray(parsed) ? parsed.map(Number).filter((n) => !isNaN(n)) : [];
  } catch {
    points = [];
  }

  if (points.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth={1} className="text-terminal-muted" strokeDasharray="4 4" />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 2;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = padding + ((max - v) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = coords.join(' ');
  const gradientId = `ec-grad-${Math.random().toString(36).slice(2, 8)}`;

  // Build fill polygon (close the path at the bottom)
  const fillPoints = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(0, 229, 255)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="rgb(0, 229, 255)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline points={polyline} fill="none" stroke="rgb(0, 229, 255)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Provider Detail (expanded) ─────────────────────────────────────
function ExpandedProviderDetail({ provider }: { provider: Provider }) {
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/marketplace/providers/${provider.id}`);
        const json = await res.json();
        if (!cancelled) setDetail(json.data ?? null);
      } catch {
        // Silently fail — we still have the summary data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [provider.id]);

  const p = detail?.profile ?? provider;

  return (
    <div className="animate-fade-in-up px-4 pb-6 pt-2">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* Equity Curve */}
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Equity Curve</p>
          <EquityCurveSparkline data={p.equity_curve_json} width={200} height={48} />
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label="Sharpe Ratio" value={p.sharpe_ratio.toFixed(2)} />
          <StatCell label="Profit Factor" value={p.profit_factor.toFixed(2)} />
          <StatCell label="Avg Pips" value={p.avg_pips.toFixed(1)} />
          <StatCell label="Avg Duration" value={formatDuration(p.avg_trade_duration_sec)} />
        </div>
      </div>

      {/* Bio */}
      {p.bio && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">{p.bio}</p>
      )}

      {/* Recent Trades */}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-terminal-muted">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan" />
          Loading recent trades...
        </div>
      ) : detail?.recent_trades && detail.recent_trades.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Recent Trades</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-terminal-border/50">
                  <th className="py-1.5 pr-4 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Symbol</th>
                  <th className="py-1.5 pr-4 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Dir</th>
                  <th className="py-1.5 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Vol</th>
                  <th className="py-1.5 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Pips</th>
                  <th className="py-1.5 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Profit</th>
                  <th className="py-1.5 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {detail.recent_trades.slice(0, 5).map((t, i) => (
                  <tr key={i} className="border-b border-terminal-border/20">
                    <td className="py-1.5 pr-4 font-mono-nums text-slate-300">{t.symbol}</td>
                    <td className="py-1.5 pr-4">
                      <Badge variant={t.direction === 'buy' ? 'green' : 'red'}>{t.direction.toUpperCase()}</Badge>
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono-nums text-slate-400">{t.volume.toFixed(2)}</td>
                    <td className={`py-1.5 pr-4 text-right font-mono-nums ${t.pips >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{t.pips >= 0 ? '+' : ''}{t.pips.toFixed(1)}</td>
                    <td className={`py-1.5 pr-4 text-right font-mono-nums ${t.profit >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatPnl(t.profit)}</td>
                    <td className="py-1.5 text-right font-mono-nums text-slate-400">{formatDuration(t.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">{label}</p>
      <p className="mt-0.5 font-mono-nums text-sm text-slate-200">{value}</p>
    </div>
  );
}

// ── Subscription Types ──────────────────────────────────────────────
interface SubscribeResult {
  subscription: { provider_id: string; provider_name: string; status: string };
  follower: { id: string; api_key: string; api_secret: string; alias: string };
  needs_setup?: boolean;
}

// ── Copy Credentials Modal ──────────────────────────────────────────
function CopyCredentialsModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: SubscribeResult | null;
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!data) return null;

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Subscription Active">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-neon-green text-sm font-medium">
          <Check size={16} />
          Now copying {data.subscription.provider_name}
        </div>

        <div className="rounded-xl border border-terminal-border/50 bg-terminal-surface/50 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-[2px] font-semibold text-terminal-muted">
            Follower EA Credentials
          </p>
          <div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">API Key</span>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono-nums text-xs text-slate-200 bg-terminal-bg/50 rounded-lg px-3 py-2 flex-1 truncate border border-terminal-border/50">
                {data.follower.api_key}
              </code>
              <button
                onClick={() => handleCopy(data.follower.api_key, setCopiedKey)}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-terminal-muted hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all duration-200"
              >
                {copiedKey ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                {copiedKey ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">API Secret</span>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono-nums text-xs text-slate-200 bg-terminal-bg/50 rounded-lg px-3 py-2 flex-1 truncate border border-terminal-border/50">
                {data.follower.api_secret}
              </code>
              <button
                onClick={() => handleCopy(data.follower.api_secret, setCopiedSecret)}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-terminal-muted hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all duration-200"
              >
                {copiedSecret ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
          <AlertTriangle size={14} className="text-neon-amber mt-0.5 shrink-0" />
          <p className="text-sm text-neon-amber">
            Save the API secret now — it won't be shown again. Use it in the Follower EA settings in MT5.
          </p>
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

// ── Setup Modal (broker/MT5 fallback) ───────────────────────────────
function SetupBrokerModal({
  open,
  onClose,
  providerId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  providerId: string;
  onSuccess: (data: SubscribeResult) => void;
}) {
  const [brokerName, setBrokerName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!mt5Login.trim()) {
      setFormError('MT5 login is required');
      return;
    }

    setIsSubmitting(true);
    const res = await api.post<SubscribeResult>(`/marketplace/subscribe/${providerId}`, {
      broker_name: brokerName.trim() || undefined,
      mt5_login: mt5Login.trim(),
    });
    setIsSubmitting(false);

    if (res.error) {
      setFormError(res.error.message);
      return;
    }

    if (res.data) {
      onSuccess(res.data);
      onClose();
    }
  };

  const handleClose = () => {
    setBrokerName('');
    setMt5Login('');
    setFormError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Account Setup Required">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-400">
          Enter your MT5 account details to start copying trades.
        </p>

        <Input
          label="Broker Name"
          placeholder="e.g. ICMarkets"
          value={brokerName}
          onChange={(e) => setBrokerName(e.target.value)}
        />
        <Input
          label="MT5 Login"
          placeholder="e.g. 5012345"
          value={mt5Login}
          onChange={(e) => setMt5Login(e.target.value)}
        />

        {formError && (
          <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
            <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
            <p className="text-sm text-neon-red">{formError}</p>
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Start Copying <ArrowRight size={14} />
        </Button>
      </form>
    </Modal>
  );
}

// ── Copy Provider Button ────────────────────────────────────────────
function CopyProviderButton({
  providerId,
  isSubscribed,
  onCopy,
  copyingId,
}: {
  providerId: string;
  isSubscribed: boolean;
  onCopy: (providerId: string) => void;
  copyingId: string | null;
}) {
  const isCopying = copyingId === providerId;

  if (isSubscribed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 px-3 py-1.5 text-xs font-medium text-neon-green">
        <Check size={12} />
        Copying
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCopy(providerId);
      }}
      disabled={isCopying}
      className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1.5 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] transition-all duration-200 disabled:opacity-50"
    >
      {isCopying ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          Copying...
        </>
      ) : (
        <>
          Copy <ArrowRight size={12} />
        </>
      )}
    </button>
  );
}

// ── Provider Row (desktop table) ───────────────────────────────────
function ProviderRow({ provider, rank, expanded, onToggle, isSubscribed, onCopy, copyingId }: {
  provider: Provider;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  isSubscribed: boolean;
  onCopy: (id: string) => void;
  copyingId: string | null;
}) {
  const badgeVariant = STRATEGY_BADGE_VARIANT[provider.strategy_style] ?? 'muted';

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-terminal-border/30 transition-colors hover:bg-white/[0.02]"
      >
        <td className="py-3 pl-4 pr-2 font-mono-nums text-sm text-terminal-muted">{rank}</td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/10 text-neon-cyan font-bold text-xs shrink-0">
              {provider.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{provider.display_name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant={badgeVariant} className="text-[10px]">{provider.strategy_style}</Badge>
                {provider.instruments && (
                  <span className="text-[10px] text-terminal-muted">{provider.instruments}</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-3 pr-4 text-right font-mono-nums text-sm text-neon-cyan">{formatPct(provider.win_rate)}</td>
        <td className={`py-3 pr-4 text-right font-mono-nums text-sm ${provider.total_pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
          {formatPnl(provider.total_pnl)}
        </td>
        <td className="py-3 pr-4 text-right font-mono-nums text-sm text-neon-red">{formatPct(provider.max_drawdown_pct)}</td>
        <td className="py-3 pr-4 text-right font-mono-nums text-sm text-slate-300">{provider.total_trades.toLocaleString()}</td>
        <td className="py-3 pr-4 text-right font-mono-nums text-sm text-slate-400">{provider.active_days}</td>
        <td className="py-3 pr-4 text-right font-mono-nums text-sm text-slate-300">
          <span className="inline-flex items-center gap-1">
            <Users size={12} className="text-terminal-muted" />
            {provider.subscriber_count}
          </span>
        </td>
        <td className="py-3 pr-4 text-right">
          <CopyProviderButton providerId={provider.id} isSubscribed={isSubscribed} onCopy={onCopy} copyingId={copyingId} />
        </td>
        <td className="py-3 pr-4 text-right">
          {expanded ? <ChevronUp size={16} className="text-terminal-muted" /> : <ChevronDown size={16} className="text-terminal-muted" />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10} className="bg-white/[0.01]">
            <ExpandedProviderDetail provider={provider} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Provider Card (mobile) ─────────────────────────────────────────
function ProviderCard({ provider, rank, expanded, onToggle, isSubscribed, onCopy, copyingId }: {
  provider: Provider;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  isSubscribed: boolean;
  onCopy: (id: string) => void;
  copyingId: string | null;
}) {
  const badgeVariant = STRATEGY_BADGE_VARIANT[provider.strategy_style] ?? 'muted';

  return (
    <div className="glass-premium rounded-2xl p-4 animate-fade-in-up">
      <div onClick={onToggle} className="cursor-pointer">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-cyan/10 text-neon-cyan font-bold text-xs shrink-0">
              {provider.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-terminal-muted font-mono-nums">#{rank}</span>
                <p className="text-sm font-semibold text-white">{provider.display_name}</p>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant={badgeVariant} className="text-[10px]">{provider.strategy_style}</Badge>
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-terminal-muted mt-1" /> : <ChevronDown size={16} className="text-terminal-muted mt-1" />}
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">Win Rate</p>
            <p className="font-mono-nums text-sm text-neon-cyan">{formatPct(provider.win_rate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">P&L</p>
            <p className={`font-mono-nums text-sm ${provider.total_pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatPnl(provider.total_pnl)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">Max DD</p>
            <p className="font-mono-nums text-sm text-neon-red">{formatPct(provider.max_drawdown_pct)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">Subs</p>
            <p className="font-mono-nums text-sm text-slate-300">{provider.subscriber_count}</p>
          </div>
        </div>
      </div>

        {/* Copy button */}
        <div className="mt-3 flex justify-end">
          <CopyProviderButton providerId={provider.id} isSubscribed={isSubscribed} onCopy={onCopy} copyingId={copyingId} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && <ExpandedProviderDetail provider={provider} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export function MarketplacePage() {
  const location = useLocation();
  const isInApp = location.pathname.startsWith('/app');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Filters
  const [sortBy, setSortBy] = useState('total_pnl');
  const [strategy, setStrategy] = useState('');
  const [minDays, setMinDays] = useState('0');

  // Expand state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Subscription state
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Modal state
  const [credentialsData, setCredentialsData] = useState<SubscribeResult | null>(null);
  const [setupProviderId, setSetupProviderId] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch subscriptions if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchSubscriptions() {
      const res = await api.get<Array<{ provider_id: string; status: string }>>('/marketplace/subscriptions');
      if (res.data && Array.isArray(res.data)) {
        const activeIds = new Set(
          res.data.filter((s) => s.status === 'active').map((s) => s.provider_id),
        );
        setSubscribedIds(activeIds);
      }
    }
    fetchSubscriptions();
  }, [isAuthenticated]);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const params = new URLSearchParams();
        if (sortBy) params.set('sort', sortBy);
        if (strategy) params.set('strategy', strategy);
        if (minDays !== '0') params.set('min_days', minDays);

        const res = await fetch(`${API_BASE}/marketplace/providers?${params.toString()}`);
        const json = await res.json();
        setProviders(json.data ?? json.data?.providers ?? []);
      } catch {
        setError('Failed to load providers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(true);
    fetchProviders();
  }, [sortBy, strategy, minDays]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCopy = useCallback(async (providerId: string) => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setCopyingId(providerId);
    setCopyError(null);

    const res = await api.post<SubscribeResult>(`/marketplace/subscribe/${providerId}`);

    setCopyingId(null);

    if (res.error) {
      setCopyError(res.error.message);
      setTimeout(() => setCopyError(null), 5000);
      return;
    }

    if (res.data) {
      // Check if needs setup (no MT5 details)
      if ('needs_setup' in res.data && (res.data as Record<string, unknown>).needs_setup) {
        setSetupProviderId(providerId);
        return;
      }

      // Successful subscription
      setSubscribedIds((prev) => new Set([...prev, providerId]));
      setCredentialsData(res.data);
    }
  }, [isAuthenticated]);

  const handleSetupSuccess = useCallback((data: SubscribeResult) => {
    setSubscribedIds((prev) => new Set([...prev, data.subscription.provider_id]));
    setCredentialsData(data);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg text-slate-100">
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* Nav (only shown on public page) */}
      {!isInApp && (
        <nav
          className={`sticky top-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30'
              : 'bg-transparent'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
              <span className="font-bold text-white">TRADE</span>
              <span className="logo-shimmer font-bold text-neon-cyan glow-text-cyan">METRICS</span>
              <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
            </Link>

            <div className="flex items-center gap-8">
              <Link
                to="/login"
                className="nav-glow-line hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-premium inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 text-center animate-fade-in-up">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Radio size={20} className="text-neon-cyan" />
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl font-display">
              Signal Marketplace
            </h1>
          </div>
          <p className="text-lg text-slate-400">
            Copy verified traders in one click
          </p>
          {!isLoading && providers.length > 0 && (
            <div className="mt-4 inline-flex">
              <Badge variant="cyan">
                <span className="font-mono-nums">{providers.length}</span> provider{providers.length !== 1 ? 's' : ''} listed
              </Badge>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="glass-premium rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-terminal-muted">
                <Filter size={14} />
                <span className="text-xs uppercase tracking-[0.12em] font-semibold hidden sm:inline">Filters</span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-xs text-slate-300 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-xs text-slate-300 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              >
                {STRATEGY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={minDays}
                onChange={(e) => setMinDays(e.target.value)}
                className="rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-xs text-slate-300 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              >
                {MIN_DAYS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass-premium rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 rounded mb-2" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-4 w-16 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
            <AlertTriangle size={24} className="mx-auto mb-3 text-neon-red" />
            <p className="text-neon-red text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && providers.length === 0 && (
          <div className="glass-premium rounded-2xl p-12 text-center animate-fade-in-up">
            <Radio size={32} className="mx-auto mb-4 text-terminal-muted" />
            <p className="text-slate-400 text-sm">
              No signal providers yet. Be the first — become a provider from your dashboard.
            </p>
          </div>
        )}

        {/* Desktop Table */}
        {!isLoading && !error && providers.length > 0 && (
          <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <div className="glass-premium rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-terminal-border/50">
                    <th className="py-3 pl-4 pr-2 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold w-12">#</th>
                    <th className="py-3 pr-4 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Provider</th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><Target size={10} />Win Rate</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><TrendingUp size={10} />Total P&L</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><AlertTriangle size={10} />Max DD</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><BarChart3 size={10} />Trades</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><Clock size={10} />Days</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      <span className="inline-flex items-center gap-1"><Users size={10} />Subs</span>
                    </th>
                    <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">Copy</th>
                    <th className="py-3 pr-4 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <ProviderRow
                      key={p.id}
                      provider={p}
                      rank={i + 1}
                      expanded={expandedId === p.id}
                      onToggle={() => toggleExpand(p.id)}
                      isSubscribed={subscribedIds.has(p.id)}
                      onCopy={handleCopy}
                      copyingId={copyingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Card Grid */}
        {!isLoading && !error && providers.length > 0 && (
          <div className="lg:hidden space-y-3">
            {providers.map((p, i) => (
              <ProviderCard
                key={p.id}
                provider={p}
                rank={i + 1}
                expanded={expandedId === p.id}
                onToggle={() => toggleExpand(p.id)}
                isSubscribed={subscribedIds.has(p.id)}
                onCopy={handleCopy}
                copyingId={copyingId}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="glass-premium rounded-2xl p-8 inline-block">
            <p className="text-slate-300 mb-4 text-sm">Want to share your signals and earn?</p>
            {isInApp ? (
              <Link
                to="/provider/setup"
                className="btn-premium inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
              >
                Become a Provider
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/register"
                className="btn-premium inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
              >
                Sign up to become a provider
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer (public only) */}
      {!isInApp && (
        <footer className="relative z-10 border-t border-terminal-border">
          <div className="px-6 py-8">
            <p className="text-center text-xs text-terminal-muted">
              &copy; 2026 Hodges &amp; Co. Limited &middot; Built on Cloudflare
            </p>
          </div>
        </footer>
      )}

      {/* Copy error toast */}
      {copyError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2 rounded-xl border border-neon-red/30 bg-terminal-bg/95 backdrop-blur-xl px-4 py-3 shadow-lg">
            <AlertTriangle size={14} className="text-neon-red shrink-0" />
            <p className="text-sm text-neon-red">{copyError}</p>
            <button onClick={() => setCopyError(null)} className="text-terminal-muted hover:text-white ml-2">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      <CopyCredentialsModal
        open={credentialsData !== null}
        onClose={() => setCredentialsData(null)}
        data={credentialsData}
      />

      {/* Setup Modal */}
      <SetupBrokerModal
        open={setupProviderId !== null}
        onClose={() => setSetupProviderId(null)}
        providerId={setupProviderId ?? ''}
        onSuccess={handleSetupSuccess}
      />
    </div>
  );
}

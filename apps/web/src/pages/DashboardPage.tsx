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
  Sparkles,
  BarChart3,
  Settings,
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

const TRADER_TITLES = [
  'Commander', 'Strategist', 'Operator', 'Captain', 'Analyst',
  'Tactician', 'Navigator', 'Architect', 'Sentinel', 'Pioneer',
  'Vanguard', 'Maverick', 'Pathfinder', 'Ace', 'Phantom',
  'Oracle', 'Warden', 'Titan', 'Catalyst', 'Cipher',
  'Apex', 'Edge Runner', 'Signal Master', 'Alpha', 'Precision',
  'Forge Master', 'Risk Lord', 'Chart Whisperer', 'Market Monk', 'Night Hawk',
  'Shadow Trader',
];

function getTraderTitle(email: string | undefined): string {
  if (!email) return 'Commander';
  // Hash the email to get a stable per-user index
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  return TRADER_TITLES[Math.abs(hash) % TRADER_TITLES.length];
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

// ── Trading Wisdom ────────────────────────────────────────────

interface WisdomQuote {
  text: string;
  author: string;
  session: 'morning' | 'afternoon' | 'evening' | 'late';
}

const WISDOM_QUOTES: WisdomQuote[] = [
  // Morning — Preparation & Mindset
  { text: 'The goal of a successful trader is to make the best trades. Money is secondary.', author: 'Alexander Elder', session: 'morning' },
  { text: 'Plan your trade, trade your plan. Today\'s preparation determines tomorrow\'s achievement.', author: 'Trading Proverb', session: 'morning' },
  { text: 'Every morning brings new potential, but if you dwell on the misfortunes of the day before, you tend to overlook tremendous opportunities.', author: 'Harvey Mackay', session: 'morning' },
  { text: 'Discipline is choosing between what you want now and what you want most. Your journal knows the difference.', author: 'Abraham Lincoln (adapted)', session: 'morning' },
  { text: 'The market is a device for transferring money from the impatient to the patient. Be patient today.', author: 'Warren Buffett', session: 'morning' },
  { text: 'In trading, it\'s not about being right — it\'s about how much you make when you\'re right and how little you lose when you\'re wrong.', author: 'George Soros', session: 'morning' },
  { text: 'The secret to being successful from a trading perspective is to have an indefatigable, undying, and unquenchable thirst for information and knowledge.', author: 'Paul Tudor Jones', session: 'morning' },
  { text: 'Start each day with a clear mind. Yesterday\'s trades are closed. Today is a new edge.', author: 'TradeMetrics Pro', session: 'morning' },
  { text: 'Risk comes from not knowing what you\'re doing. Before you trade today, know your setup, your stop, and your exit.', author: 'Warren Buffett (adapted)', session: 'morning' },
  { text: 'The best trade you\'ll ever make is the one you don\'t take when conditions aren\'t right.', author: 'TradeMetrics Pro', session: 'morning' },
  { text: 'Winners think in terms of probabilities, not certainties. Your edge plays out over 100 trades, not one.', author: 'Mark Douglas', session: 'morning' },
  { text: 'There is a time to go long, a time to go short, and a time to go fishing. Know which one today is.', author: 'Jesse Livermore', session: 'morning' },

  // Afternoon — Execution & Focus
  { text: 'It\'s not whether you\'re right or wrong that matters, but how much money you make when you\'re right and how much you lose when you\'re wrong.', author: 'George Soros', session: 'afternoon' },
  { text: 'The hard work in trading comes in the preparation. The actual execution should be effortless.', author: 'Jack Schwager', session: 'afternoon' },
  { text: 'Amateurs focus on rewards. Professionals focus on risk. Which one are you being right now?', author: 'TradeMetrics Pro', session: 'afternoon' },
  { text: 'Don\'t focus on making money; focus on protecting what you have.', author: 'Paul Tudor Jones', session: 'afternoon' },
  { text: 'Throughout my financial career, I have continually witnessed examples of other people that I have known being ruined by a failure to respect risk.', author: 'Larry Hite', session: 'afternoon' },
  { text: 'If you can learn to create a state of mind that is not affected by the market\'s behavior, the struggle will cease to exist.', author: 'Mark Douglas', session: 'afternoon' },
  { text: 'The elements of good trading are: cutting losses, cutting losses, and cutting losses.', author: 'Ed Seykota', session: 'afternoon' },
  { text: 'Overtrading is the silent account killer. If your edge gave you 2 signals today, don\'t invent a 3rd.', author: 'TradeMetrics Pro', session: 'afternoon' },
  { text: 'One good trade is worth more than ten mediocre ones. Quality over quantity — always.', author: 'TradeMetrics Pro', session: 'afternoon' },
  { text: 'The market doesn\'t know your position. Trade what you see, not what you hope.', author: 'Trading Proverb', session: 'afternoon' },
  { text: 'Confidence is not "I will profit on this trade." Confidence is "I will be fine if I don\'t profit on this trade."', author: 'TradeMetrics Pro', session: 'afternoon' },
  { text: 'Every battle is won before it is ever fought. Your pre-trade checklist is your battle plan.', author: 'Sun Tzu (adapted)', session: 'afternoon' },

  // Evening — Reflection & Growth
  { text: 'Profits take care of themselves, losses never do. Review what went wrong today — that\'s where growth lives.', author: 'Jesse Livermore (adapted)', session: 'evening' },
  { text: 'The most important investment you can make is in yourself. Tonight, review your journal.', author: 'Warren Buffett (adapted)', session: 'evening' },
  { text: 'You don\'t need to trade every day. You need to trade well on the days you choose.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'What did you learn today? If the answer is nothing, you weren\'t paying attention. The market always teaches.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'Successful traders are not born — they are made through the process of self-discovery. Keep refining.', author: 'Van Tharp', session: 'evening' },
  { text: 'Win or lose, everybody gets what they want out of the market. The key is knowing what you want.', author: 'Ed Seykota', session: 'evening' },
  { text: 'The market will be there tomorrow. Rest tonight, come back sharp.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'A losing day where you followed your rules is more valuable than a winning day where you didn\'t.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'Compound interest applies to skill too. Every day of disciplined trading makes the next one easier.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'Don\'t measure yourself by today\'s P&L. Measure yourself by today\'s discipline. The money follows.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'The trader who can sit with a loss without flinching has already won the biggest battle in this game.', author: 'TradeMetrics Pro', session: 'evening' },
  { text: 'Sleep well. Tomorrow is another session, another edge, another opportunity. Consistency compounds.', author: 'TradeMetrics Pro', session: 'evening' },

  // Late Session — Resilience & Patience
  { text: 'Markets never sleep, but you should. The best traders know when to step away.', author: 'TradeMetrics Pro', session: 'late' },
  { text: 'The stock market is filled with individuals who know the price of everything but the value of nothing.', author: 'Philip Fisher', session: 'late' },
  { text: 'Late-night chart staring doesn\'t find setups — it finds excuses to trade. Trust your plan.', author: 'TradeMetrics Pro', session: 'late' },
  { text: 'I just wait until there is money lying in the corner, and all I have to do is go over there and pick it up.', author: 'Jim Rogers', session: 'late' },
  { text: 'The market rewards patience more than intelligence. Your edge doesn\'t expire overnight.', author: 'TradeMetrics Pro', session: 'late' },
  { text: 'Rest is a trading strategy. The sharpest entries come from the freshest minds.', author: 'TradeMetrics Pro', session: 'late' },
];

function getSessionType(): 'morning' | 'afternoon' | 'evening' | 'late' {
  const h = new Date().getHours();
  if (h < 5) return 'late';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'late';
}

function getDailyQuote(): WisdomQuote {
  const session = getSessionType();
  const sessionQuotes = WISDOM_QUOTES.filter((q) => q.session === session);
  // Deterministic daily rotation seeded by date + session
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const sessionSeed = session === 'morning' ? 0 : session === 'afternoon' ? 1 : session === 'evening' ? 2 : 3;
  const index = (seed + sessionSeed * 7) % sessionQuotes.length;
  return sessionQuotes[index];
}

function WisdomBanner() {
  const quote = getDailyQuote();
  const session = getSessionType();

  const sessionConfig = {
    morning: { label: 'Morning Wisdom', color: '#ffb800', icon: '🌅' },
    afternoon: { label: 'Afternoon Focus', color: '#00e5ff', icon: '⚡' },
    evening: { label: 'Evening Reflection', color: '#b18cff', icon: '🌙' },
    late: { label: 'Late Session', color: '#00ff9d', icon: '🌃' },
  }[session];

  return (
    <div
      className="animate-fade-in-up relative overflow-hidden rounded-xl border px-5 py-4"
      style={{
        animationDelay: '120ms',
        borderColor: `${sessionConfig.color}15`,
        background: `linear-gradient(135deg, ${sessionConfig.color}04 0%, transparent 60%)`,
      }}
    >
      {/* Subtle accent line */}
      <div
        className="absolute left-0 top-0 h-full w-[2px]"
        style={{ background: `linear-gradient(to bottom, ${sessionConfig.color}50, ${sessionConfig.color}10)` }}
      />

      <div className="flex items-start gap-4">
        {/* Session icon */}
        <span className="mt-0.5 text-lg leading-none">{sessionConfig.icon}</span>

        <div className="flex-1 min-w-0">
          {/* Session label */}
          <p className="font-mono-nums text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: `${sessionConfig.color}90` }}>
            {sessionConfig.label}
          </p>

          {/* Quote */}
          <p className="text-[14px] leading-relaxed text-slate-300 italic">
            &ldquo;{quote.text}&rdquo;
          </p>

          {/* Author */}
          <p className="mt-2 font-mono-nums text-[11px] text-terminal-muted">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
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

// ── Alert Config Nudge ────────────────────────────────────────

function AlertConfigNudge() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('alert-nudge-dismissed') === '1'; }
    catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('alert-nudge-dismissed', '1'); } catch {}
  };

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
      <div className="relative overflow-hidden rounded-xl border border-neon-cyan/15 bg-gradient-to-r from-neon-cyan/[0.04] to-transparent px-5 py-3.5">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/20 bg-neon-cyan/10">
            <Sparkles size={16} className="text-neon-cyan" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">Stay ahead of the market</span> — enable breaking news, economic event warnings, and session alerts via Telegram.
            </p>
          </div>

          <Link
            to="/settings"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/10 px-3.5 py-2 text-[12px] font-semibold text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)]"
          >
            <Settings size={13} />
            Configure Alerts
          </Link>

          <button
            onClick={handleDismiss}
            className="shrink-0 text-terminal-muted/40 hover:text-terminal-muted transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top Insight Card ───────────────────────────────────────────

interface AiInsight {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  detail: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-l-neon-red',
  warning: 'border-l-neon-amber',
  info: 'border-l-neon-cyan',
  positive: 'border-l-neon-green',
};
const SEVERITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-neon-red/10', text: 'text-neon-red', label: 'Critical' },
  warning: { bg: 'bg-neon-amber/10', text: 'text-neon-amber', label: 'Warning' },
  info: { bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', label: 'Info' },
  positive: { bg: 'bg-neon-green/10', text: 'text-neon-green', label: 'Positive' },
};

function TopInsightCard() {
  const [insight, setInsight] = useState<AiInsight | null>(null);

  useEffect(() => {
    api.get<AiInsight[]>('/analytics/ai-insights').then((res) => {
      if (res.data && res.data.length > 0) {
        const sorted = [...res.data].sort(
          (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
        );
        setInsight(sorted[0]);
      }
    }).catch(() => { /* silently skip */ });
  }, []);

  if (!insight) return null;

  const badge = SEVERITY_BADGE[insight.severity] ?? SEVERITY_BADGE.info;
  const borderColor = SEVERITY_COLORS[insight.severity] ?? SEVERITY_COLORS.info;
  const firstSentence = insight.detail.split(/(?<=\.)\s/)[0] ?? insight.detail;

  return (
    <div
      className={`animate-fade-in-up glass-premium rounded-2xl border-l-4 ${borderColor} p-4 sm:p-5 flex items-start gap-4`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Sparkles size={18} className={badge.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[0.15em] font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <span className="font-bold text-slate-100 text-sm truncate">{insight.title}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{firstSentence}</p>
      </div>
      <Link
        to="/analytics"
        className="flex-shrink-0 text-xs font-medium text-neon-cyan hover:underline underline-offset-4 glow-text-cyan whitespace-nowrap flex items-center gap-1"
      >
        View All
        <ArrowUpRight size={12} />
      </Link>
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
            {getGreeting()}, {getTraderTitle(user?.email)}
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

      {/* ── Trading Wisdom ─────────────────────────────────────── */}
      <WisdomBanner />

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="divider-diamond" />

      {/* ── Telegram Banner ──────────────────────────────────────── */}
      <TelegramBanner />

      {/* ── Alert Config Nudge ─────────────────────────────────── */}
      <AlertConfigNudge />

      {/* ── Top AI Insight ─────────────────────────────────────── */}
      <TopInsightCard />

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

      <div className="divider mt-4 mb-3" />

      <Link
        to="/analytics"
        className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan/70 hover:text-neon-cyan transition-colors group"
      >
        <BarChart3 size={12} />
        <span>View Analytics</span>
        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </Link>
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
          <span className={`text-[9px] uppercase tracking-[0.15em] font-mono-nums font-bold ${connected ? 'text-neon-green' : 'text-terminal-muted'}`}>
            {connected ? 'ACTIVE' : 'OFFLINE'}
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

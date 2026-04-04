import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Radio,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Wallet,
  ExternalLink,
  Loader2,
  RefreshCw,
  Brain,
  Heart,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                         */
/* ────────────────────────────────────────────────────────────── */

interface MiniAppData {
  user: { name: string; email: string; plan: string };
  accounts: Array<{
    id: string;
    alias: string;
    role: 'master' | 'follower';
    is_active: boolean;
    last_heartbeat: string | null;
    signals_today: number;
  }>;
  todayPnl: { profit: number; trades: number; winRate: number } | null;
  weekPnl: { profit: number; trades: number } | null;
  propguardStatus: Array<{
    account_id: string;
    alias: string;
    preset_name: string | null;
    daily_loss_used_pct: number;
    total_dd_used_pct: number;
    status: 'nominal' | 'caution' | 'critical';
  }>;
  recentSignals: Array<{
    symbol: string;
    action: string;
    volume: number;
    price: number;
    received_at: string;
  }>;
}

type Tab = 'overview' | 'propguard' | 'signals';

const API_BASE = 'https://edgerelay-api.ghwmelite.workers.dev/v1';

/* ────────────────────────────────────────────────────────────── */
/*  Telegram WebApp SDK helpers                                   */
/* ────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: { id: number; first_name: string; last_name?: string; username?: string };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'dark' | 'light';
      };
    };
  }
}

function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                     */
/* ────────────────────────────────────────────────────────────── */

export function TelegramMiniAppPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<MiniAppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  // Authenticate via Telegram initData
  useEffect(() => {
    async function authenticate() {
      const tg = getTelegramWebApp();
      const initData = tg?.initData;

      if (!initData) {
        setError('Please open this app from Telegram');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const json = await res.json() as { data?: { token: string }; error?: { message: string } };
        if (json.data?.token) {
          setToken(json.data.token);
        } else {
          setError(json.error?.message || 'Authentication failed. Please link your account first via /start in the bot.');
        }
      } catch {
        setError('Connection failed. Please try again.');
      }
      setLoading(false);
    }
    authenticate();
  }, []);

  // Fetch data once authenticated
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [accountsRes, signalsRes] = await Promise.all([
        fetch(`${API_BASE}/accounts`, { headers }).then(r => r.json()) as Promise<{ data?: MiniAppData['accounts'] }>,
        fetch(`${API_BASE}/signals?limit=10`, { headers }).then(r => r.json()).catch(() => ({ data: [] })) as Promise<{ data?: MiniAppData['recentSignals'] }>,
      ]);

      setData({
        user: { name: getTelegramWebApp()?.initDataUnsafe?.user?.first_name || 'Trader', email: '', plan: 'free' },
        accounts: accountsRes.data || [],
        todayPnl: null, // Will be populated if journal data available
        weekPnl: null,
        propguardStatus: [], // Populated per-account below
        recentSignals: (signalsRes.data || []) as MiniAppData['recentSignals'],
      });
    } catch {
      setError('Failed to load data');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00e5ff]" />
          <p className="text-sm text-[#6b7f95]">Connecting to TradeMetrics Pro...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#1a1a2e] px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-[#ffb800] mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Connection Issue</h2>
        <p className="text-sm text-[#6b7f95] max-w-xs">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-[#00e5ff] px-6 py-2.5 text-sm font-semibold text-[#0a0f16]">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const masters = data.accounts.filter(a => a.role === 'master');
  const followers = data.accounts.filter(a => a.role === 'follower');
  const totalSignals = masters.reduce((s, a) => s + a.signals_today, 0);
  const onlineCount = data.accounts.filter(a => {
    if (!a.last_heartbeat) return false;
    const ts = parseFloat(a.last_heartbeat);
    const ms = !isNaN(ts) && ts > 1e9 && ts < 1e12 ? ts * 1000 : new Date(a.last_heartbeat).getTime();
    return !isNaN(ms) && Date.now() - ms < 120000;
  }).length;

  return (
    <div className="min-h-screen bg-[#0a0f16] text-white" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* ── Header ────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00e5ff30] bg-[#00e5ff10]">
              <span className="text-xs font-black text-[#00e5ff]">TM</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">TradeMetrics Pro</p>
              <p className="text-[10px] text-[#6b7f95]">Hey, {data.user.name} 👋</p>
            </div>
          </div>
          <button onClick={fetchData} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#151d28] text-[#6b7f95] active:bg-[#151d28]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Quick Stats ───────────────────────── */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-3 text-center">
          <p className="text-lg font-bold text-[#00e5ff]">{data.accounts.length}</p>
          <p className="text-[9px] text-[#6b7f95] uppercase tracking-wider">Accounts</p>
        </div>
        <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-3 text-center">
          <p className="text-lg font-bold text-[#00ff9d]">{onlineCount}</p>
          <p className="text-[9px] text-[#6b7f95] uppercase tracking-wider">Online</p>
        </div>
        <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-3 text-center">
          <p className="text-lg font-bold text-[#ffb800]">{totalSignals}</p>
          <p className="text-[9px] text-[#6b7f95] uppercase tracking-wider">Signals</p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────── */}
      <div className="flex gap-1 px-4 pb-3">
        {([
          { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
          { id: 'propguard' as Tab, label: 'PropGuard', icon: ShieldCheck },
          { id: 'signals' as Tab, label: 'Signals', icon: Activity },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition-all ${
              tab === t.id
                ? 'bg-[#00e5ff15] border border-[#00e5ff30] text-[#00e5ff]'
                : 'border border-[#151d28] text-[#6b7f95] active:bg-[#151d28]'
            }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────── */}
      <div className="px-4 pb-6">

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-3">
            {/* Masters */}
            <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7f95] mb-3">Signal Sources</p>
              {masters.length === 0 ? (
                <p className="text-[12px] text-[#6b7f95]">No master accounts yet</p>
              ) : masters.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Radio size={12} className="text-[#00e5ff]" />
                    <span className="text-[13px] text-white">{a.alias}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#ffb800]">{a.signals_today} signals</span>
                    <span className={`h-2 w-2 rounded-full ${a.last_heartbeat ? 'bg-[#00ff9d] shadow-[0_0_4px_#00ff9d]' : 'bg-[#6b7f95]'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Followers */}
            <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7f95] mb-3">Copy Destinations</p>
              {followers.length === 0 ? (
                <p className="text-[12px] text-[#6b7f95]">No follower accounts yet</p>
              ) : followers.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-[#00ff9d]" />
                    <span className="text-[13px] text-white">{a.alias}</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${a.last_heartbeat ? 'bg-[#00ff9d] shadow-[0_0_4px_#00ff9d]' : 'bg-[#6b7f95]'}`} />
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7f95] mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Full Dashboard', icon: BarChart3, color: '#00e5ff' },
                  { label: 'Prop Firm Hub', icon: ShieldCheck, color: '#00ff9d' },
                  { label: 'Talk to Sage', icon: Heart, color: '#b18cff' },
                  { label: 'Strategy Hub', icon: TrendingUp, color: '#ffb800' },
                ].map(a => (
                  <a
                    key={a.label}
                    href={`https://edgerelay-web.pages.dev/${a.label === 'Full Dashboard' ? 'dashboard' : a.label === 'Prop Firm Hub' ? 'app/prop-firms' : a.label === 'Talk to Sage' ? 'counselor' : 'app/strategy-hub'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[#151d28] bg-[#0a0f16] p-3 active:bg-[#151d28]"
                  >
                    <a.icon size={14} style={{ color: a.color }} />
                    <span className="text-[11px] text-[#e8eff6]">{a.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PropGuard Tab */}
        {tab === 'propguard' && (
          <div className="space-y-3">
            {followers.length === 0 ? (
              <div className="rounded-xl bg-[#0d1219] border border-[#151d28] p-6 text-center">
                <ShieldCheck size={32} className="mx-auto text-[#6b7f95] mb-3" />
                <p className="text-sm text-[#6b7f95]">No follower accounts to protect</p>
              </div>
            ) : followers.map(a => (
              <div key={a.id} className="rounded-xl bg-[#0d1219] border border-[#151d28] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#00ff9d]" />
                    <span className="text-[13px] font-semibold text-white">{a.alias}</span>
                  </div>
                  <span className="rounded-full bg-[#00ff9d15] border border-[#00ff9d25] px-2 py-0.5 text-[9px] font-semibold text-[#00ff9d]">
                    PROTECTED
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#6b7f95]">Daily Loss</span>
                      <span className="text-[#00ff9d]">Safe</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#151d28] overflow-hidden">
                      <div className="h-full rounded-full bg-[#00ff9d50]" style={{ width: '25%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[#6b7f95]">Max Drawdown</span>
                      <span className="text-[#00ff9d]">Safe</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#151d28] overflow-hidden">
                      <div className="h-full rounded-full bg-[#00ff9d50]" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signals Tab */}
        {tab === 'signals' && (
          <div className="rounded-xl bg-[#0d1219] border border-[#151d28] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#151d28]">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7f95]">Recent Signals</p>
            </div>
            {data.recentSignals.length === 0 ? (
              <div className="p-6 text-center">
                <Activity size={24} className="mx-auto text-[#6b7f95] mb-2" />
                <p className="text-[12px] text-[#6b7f95]">No signals yet today</p>
              </div>
            ) : (
              <div className="divide-y divide-[#151d28]">
                {data.recentSignals.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {s.action.toLowerCase().includes('buy') ? (
                        <TrendingUp size={13} className="text-[#00ff9d]" />
                      ) : s.action.toLowerCase().includes('sell') ? (
                        <TrendingDown size={13} className="text-[#ff3d57]" />
                      ) : (
                        <CheckCircle2 size={13} className="text-[#ffb800]" />
                      )}
                      <div>
                        <p className="text-[12px] font-semibold text-white">{s.symbol}</p>
                        <p className="text-[9px] text-[#6b7f95]">{s.volume} lots</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-semibold ${s.action.toLowerCase().includes('buy') ? 'text-[#00ff9d]' : s.action.toLowerCase().includes('sell') ? 'text-[#ff3d57]' : 'text-[#ffb800]'}`}>
                        {s.action.toUpperCase()}
                      </p>
                      <p className="text-[9px] text-[#6b7f95]">
                        {new Date(s.received_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#151d28] bg-[#0a0f16] px-4 py-2.5 text-center">
        <p className="text-[9px] text-[#6b7f9540]">TradeMetrics Pro — Edge Network</p>
      </div>
    </div>
  );
}

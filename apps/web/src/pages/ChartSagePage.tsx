import { useCallback, useEffect, useState } from 'react';
import {
  Coins,
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Zap,
  Bitcoin,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types — mirrors the ChartSage worker API                           */
/* ------------------------------------------------------------------ */

interface LiveSignal {
  id: number | null;
  asset: string;
  asset_class: string;
  session: string;
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  setup_type: string;
  prob_up: number;
  confidence: number;
  reasoning: string;
  entry_price: number | null;
  sl: number | null;
  tp: number | null;
}

interface SignalRow {
  id: number;
  created_at: string;
  asset: string;
  asset_class: string;
  session: string;
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  setup_type: string;
  expiry_minutes: number;
  confidence: number;
  outcome: 'win' | 'loss' | 'breakeven' | 'skipped' | null;
}

interface StatsBucket {
  bucket: string;
  signals: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  ci_lo: number | null;
  ci_hi: number | null;
  reliable: boolean;
  beats_breakeven: boolean;
}

interface StatsResponse {
  payout_pct: number;
  breakeven_win_rate: number;
  min_sample: number;
  by_class: StatsBucket[];
  by_session: StatsBucket[];
  by_setup: StatsBucket[];
  by_confidence: StatsBucket[];
}

interface CryptoSignal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  grade: 'A' | 'B';
  score: number;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  rr_to_tp1: number;
  confluence_tags: string[];
  invalidation: string;
}

interface CryptoScanResult {
  scanned: number;
  emitted: CryptoSignal[];
  errors: string[];
}

const fmtPrice = (x: number) =>
  x >= 1
    ? x.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : Number(x.toPrecision(6)).toString();

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

function DirectionMark({ direction, size = 'md' }: { direction: string; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-3xl' : 'text-sm';
  if (direction === 'LONG')
    return (
      <span className={`flex items-center gap-2 font-bold text-neon-green glow-text-green ${cls}`}>
        <TrendingUp className={size === 'lg' ? 'h-7 w-7' : 'h-4 w-4'} /> LONG
      </span>
    );
  if (direction === 'SHORT')
    return (
      <span className={`flex items-center gap-2 font-bold text-neon-red glow-text-red ${cls}`}>
        <TrendingDown className={size === 'lg' ? 'h-7 w-7' : 'h-4 w-4'} /> SHORT
      </span>
    );
  return (
    <span className={`flex items-center gap-2 font-bold text-terminal-muted ${cls}`}>
      <Minus className={size === 'lg' ? 'h-7 w-7' : 'h-4 w-4'} /> NO TRADE
    </span>
  );
}

function outcomeBadge(o: SignalRow['outcome']) {
  if (o === 'win') return <Badge variant="green">win</Badge>;
  if (o === 'loss') return <Badge variant="red">loss</Badge>;
  if (o === 'breakeven') return <Badge variant="muted">breakeven</Badge>;
  if (o === 'skipped') return <Badge variant="muted">skipped</Badge>;
  return <Badge variant="amber">open</Badge>;
}

function Cell({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-terminal-border/50 bg-terminal-card/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-terminal-muted">{k}</div>
      <div className={`mt-1 text-sm text-slate-200 ${mono ? 'font-mono tabular-nums' : ''}`}>{v}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const SYMBOLS = [
  { key: 'XAUUSD', label: 'Gold', sub: 'XAU/USD', icon: Coins },
  { key: 'EURUSD', label: 'Euro', sub: 'EUR/USD', icon: CandlestickChart },
] as const;

export function ChartSagePage() {
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [signal, setSignal] = useState<LiveSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cryptoScan, setCryptoScan] = useState<CryptoScanResult | null>(null);

  const loadFeed = useCallback(async () => {
    const [sigRes, statsRes] = await Promise.all([
      api.get<SignalRow[]>('/chartsage/signals?limit=15'),
      api.get<StatsResponse>('/chartsage/stats'),
    ]);
    if (sigRes.data) setRows(sigRes.data);
    if (statsRes.data) setStats(statsRes.data);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const analyze = async (symbol: string) => {
    setAnalyzing(symbol);
    setError(null);
    const res = await api.post<LiveSignal>('/chartsage/analyze-live', { symbol });
    setAnalyzing(null);
    if (res.error || !res.data) {
      setError(res.error?.message || 'Analysis failed');
      return;
    }
    setSignal(res.data);
    loadFeed();
  };

  const scanCrypto = async () => {
    setAnalyzing('CRYPTO');
    setError(null);
    const res = await api.post<CryptoScanResult>('/chartsage/analyze-crypto', {});
    setAnalyzing(null);
    if (res.error || !res.data) {
      setError(res.error?.message || 'Crypto scan failed');
      return;
    }
    setCryptoScan(res.data);
    loadFeed();
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const statBlock = (title: string, buckets: StatsBucket[]) => (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-[2px] text-terminal-muted">{title}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-terminal-muted/70">
            <th className="pb-1.5 font-medium">Bucket</th>
            <th className="pb-1.5 font-medium">N</th>
            <th className="pb-1.5 font-medium">W/L</th>
            <th className="pb-1.5 font-medium">Win% [95% CI]</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {buckets.map((b) => (
            <tr key={b.bucket} className={`border-t border-terminal-border/30 ${b.reliable ? '' : 'opacity-40'}`}>
              <td className="py-1.5 text-slate-300">{b.bucket || '?'}</td>
              <td className="py-1.5">{b.signals}</td>
              <td className="py-1.5">
                {b.wins}/{b.losses}
              </td>
              <td className={`py-1.5 ${b.beats_breakeven ? 'text-neon-green' : 'text-slate-300'}`}>
                {b.win_rate ?? '—'}
                {b.ci_lo != null && <span className="text-terminal-muted"> [{b.ci_lo}–{b.ci_hi}]</span>}
                {b.beats_breakeven && ' ▲'}
              </td>
            </tr>
          ))}
          {buckets.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-center text-terminal-muted">
                No graded signals yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Chart<span className="text-neon-cyan glow-text-cyan">Sage</span>
          </h1>
          <p className="mt-1 text-sm text-terminal-muted">
            live feed in · signal out · every call graded
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl border border-terminal-border/50 bg-terminal-card/40 px-3 py-2 text-xs text-slate-400 transition-all hover:border-neon-cyan/30 hover:text-neon-cyan focus-ring"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Analyze */}
      <Card variant="elevated">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Zap className="h-4 w-4 text-neon-amber" /> Live analysis
          <span className="text-xs font-normal text-terminal-muted">
            real candles → probability → ATR trade plan
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SYMBOLS.map(({ key, label, sub, icon: Icon }) => (
            <button
              key={key}
              onClick={() => analyze(key)}
              disabled={analyzing !== null}
              className="group flex items-center gap-3 rounded-xl border border-terminal-border/60 bg-terminal-card/40 px-4 py-3.5 text-left transition-all duration-200 hover:border-neon-cyan/40 hover:bg-neon-cyan/5 hover:shadow-[0_0_20px_#00e5ff15] disabled:opacity-50 focus-ring"
            >
              <span className="rounded-lg border border-neon-cyan/20 bg-neon-cyan/10 p-2 text-neon-cyan">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-200">{label}</span>
                <span className="block text-xs text-terminal-muted">{sub}</span>
              </span>
              {analyzing === key && <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />}
            </button>
          ))}
          <button
            onClick={scanCrypto}
            disabled={analyzing !== null}
            className="group flex items-center gap-3 rounded-xl border border-terminal-border/60 bg-terminal-card/40 px-4 py-3.5 text-left transition-all duration-200 hover:border-neon-amber/40 hover:bg-neon-amber/5 hover:shadow-[0_0_20px_#ffb80015] disabled:opacity-50 focus-ring"
          >
            <span className="rounded-lg border border-neon-amber/20 bg-neon-amber/10 p-2 text-neon-amber">
              <Bitcoin className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-200">Crypto scan</span>
              <span className="block text-xs text-terminal-muted">top-15 confluence</span>
            </span>
            {analyzing === 'CRYPTO' && <Loader2 className="h-4 w-4 animate-spin text-neon-amber" />}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-neon-red">{error}</p>}
      </Card>

      {/* Latest signal */}
      {signal && (
        <Card variant="elevated" glow={signal.direction !== 'NO_TRADE'}>
          <div className="flex items-center justify-between border-b border-terminal-border/40 pb-4">
            <DirectionMark direction={signal.direction} size="lg" />
            <div className="text-right text-xs text-terminal-muted">
              <span className="font-mono text-sm text-slate-200">P(up) {signal.prob_up}%</span>
              <span className="ml-2">lean {signal.confidence}/100</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Cell k="Asset" v={signal.asset} />
            <Cell k="Session" v={signal.session} />
            <Cell k="Setup" v={signal.setup_type?.replace(/_/g, ' ') || '—'} />
            <Cell k="Entry" v={signal.entry_price ?? '—'} />
            <Cell k="Stop-loss" v={signal.sl ?? '—'} />
            <Cell k="Take-profit" v={signal.tp ?? '—'} />
          </div>
          {signal.reasoning && (
            <p className="mt-4 border-t border-terminal-border/40 pt-3 text-sm leading-relaxed text-slate-400">
              {signal.reasoning}
            </p>
          )}
          {signal.direction !== 'NO_TRADE' && (
            <p className="mt-2 text-xs text-terminal-muted">
              Outcome auto-grades from the live feed when TP or SL is hit — 5-min checks, 4h time-stop.
            </p>
          )}
        </Card>
      )}

      {/* Crypto scan results */}
      {cryptoScan && (
        <Card variant="elevated">
          <div className="flex items-center justify-between border-b border-terminal-border/40 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Bitcoin className="h-4 w-4 text-neon-amber" /> Crypto confluence scan
            </div>
            <span className="text-xs text-terminal-muted">
              {cryptoScan.scanned} scanned · {cryptoScan.emitted.length} emitted
            </span>
          </div>
          {cryptoScan.emitted.length === 0 ? (
            <p className="pt-3 text-sm text-terminal-muted">
              No A/B-grade confluence setups this scan — the six-pillar stack stayed silent.
              That is the filter working, not a bug.
            </p>
          ) : (
            <div className="divide-y divide-terminal-border/30">
              {cryptoScan.emitted.map((s) => (
                <div key={s.symbol + s.direction} className="py-3">
                  <div className="flex items-center justify-between">
                    <DirectionMark direction={s.direction} />
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-200">{s.symbol}</span>
                      <Badge variant={s.grade === 'A' ? 'amber' : 'muted'}>
                        Grade {s.grade} · {s.score}/100
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-xs tabular-nums text-slate-300">
                    Entry {fmtPrice(s.entry)} · SL {fmtPrice(s.sl)} · TP1 {fmtPrice(s.tp1)} · TP2 {fmtPrice(s.tp2)} · R:R {s.rr_to_tp1}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400">{s.confluence_tags.join(' + ')}</div>
                  <div className="mt-1 text-xs text-terminal-muted">{s.invalidation}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Signal feed */}
      <Card variant="elevated">
        <div className="mb-3 text-sm font-semibold text-slate-200">Recent signals</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-terminal-muted/70">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Time (UTC)</th>
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium">Setup</th>
                <th className="pb-2 font-medium">Direction</th>
                <th className="pb-2 font-medium">Lean</th>
                <th className="pb-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-terminal-border/30">
                  <td className="py-2 text-terminal-muted">{r.id}</td>
                  <td className="py-2 text-slate-400">{(r.created_at || '').slice(5, 16)}</td>
                  <td className="py-2 text-slate-200">{r.asset}</td>
                  <td className="py-2 text-slate-400">{r.setup_type?.replace(/_/g, ' ') || '—'}</td>
                  <td className="py-2">
                    {r.direction === 'LONG' ? (
                      <Badge variant="green">LONG</Badge>
                    ) : r.direction === 'SHORT' ? (
                      <Badge variant="red">SHORT</Badge>
                    ) : (
                      <Badge variant="muted">NO_TRADE</Badge>
                    )}
                  </td>
                  <td className="py-2 text-slate-300">{r.confidence}</td>
                  <td className="py-2">{outcomeBadge(r.outcome)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-terminal-muted">
                    No signals yet — run an analysis above
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Performance */}
      {stats && (
        <Card variant="elevated">
          <div className="mb-4 text-sm font-semibold text-slate-200">Performance</div>
          <div className="grid gap-6 md:grid-cols-2">
            {statBlock('Asset class', stats.by_class)}
            {statBlock('Session', stats.by_session)}
            {statBlock('Setup', stats.by_setup)}
            {statBlock('Confidence', stats.by_confidence)}
          </div>
          <p className="mt-4 text-xs text-terminal-muted">
            Breakeven at {stats.payout_pct}% payout = {stats.breakeven_win_rate}% win rate.
            ▲ = 95% CI clears breakeven. Dimmed rows have &lt; {stats.min_sample} resolved outcomes — noise, not signal.
          </p>
        </Card>
      )}
    </div>
  );
}

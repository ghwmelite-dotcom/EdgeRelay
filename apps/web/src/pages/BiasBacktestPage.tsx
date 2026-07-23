// /bias/backtest — interactive backtest simulator.
//
// User picks symbol + risk settings + entry trigger, we run the sim on
// bias_history, render an equity curve + stats. Philosophically: this is
// the page that turns skeptics into users — "here's what following the
// engine would have done to your account, from the actual live data".
import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, TrendingUp, TrendingDown, AlertTriangle, Share2, Check } from 'lucide-react';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { toPng } from 'html-to-image';
import { api } from '@/lib/api';
import type { BacktestParams, BacktestResult, EntryTrigger } from '@edgerelay/shared';

const SYMBOLS = ['XAUUSD', 'NAS100', 'US30', 'EURUSD', 'GBPUSD'] as const;

const TRIGGERS: Array<{ key: EntryTrigger; label: string; hint: string }> = [
  { key: 'continuation',   label: 'Continuation only', hint: 'Highest-probability entry per ICC' },
  { key: 'a_plus',         label: 'A+ Setups (4H+1H)', hint: 'Rare but strongest signal' },
  { key: 'indication',     label: 'Indication breaks', hint: 'Earlier entry, lower quality' },
  { key: 'any_tradeable',  label: 'Any tradeable',     hint: 'All engine buy/sell calls' },
];

const DEFAULTS: BacktestParams = {
  symbol: 'XAUUSD',
  startingBalance: 10_000,
  riskPercent: 1,
  stopLossPercent: 1.0,
  takeProfitR: 2,
  timeStopHours: 48,
  entryTrigger: 'continuation',
};

export function BiasBacktestPage() {
  const [params, setParams] = useState<BacktestParams>(DEFAULTS);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareRef = useRef<HTMLDivElement | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const run = useCallback(async (p: BacktestParams) => {
    setLoading(true);
    setError(null);
    const res = await api.post<BacktestResult>('/bias/backtest', p);
    if (res.data) {
      setResult(res.data);
    } else {
      setError(res.error?.message ?? 'Backtest failed');
    }
    setLoading(false);
  }, []);

  // Kick off an initial run on mount so users land on a populated page
  useEffect(() => { run(DEFAULTS); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // SEO head
  useEffect(() => {
    const prior = document.title;
    document.title = 'ICC Bias Backtest Simulator · Live Data · TradeMetrics Pro';
    const setMeta = (name: string, value: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    const desc = 'Interactive backtest simulator for the TradeMetrics Pro ICC bias engine. Set your risk, SL, TP, and entry rule — see the equity curve that would have resulted from every actual live call. No look-ahead, no cherry-picking.';
    setMeta('description', desc);
    setMeta('og:title', 'ICC Bias Backtest Simulator', 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:url', 'https://trademetricspro.com/bias/backtest', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'ICC Bias Backtest Simulator');
    setMeta('twitter:description', desc);
    return () => { document.title = prior; };
  }, []);

  const updateParam = <K extends keyof BacktestParams>(key: K, value: BacktestParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const handleShare = async () => {
    if (!shareRef.current || !result) return;
    setShareBusy(true);
    setShareDone(false);
    try {
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true, pixelRatio: 2, backgroundColor: '#05080d',
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `backtest-${params.symbol}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
      const shareText = `ICC Backtest — ${params.symbol} · ${result.totalReturnPercent >= 0 ? '+' : ''}${result.totalReturnPercent}% over ${result.totalTrades} trades (${result.winRate}% win rate).`;
      const shareUrl = 'https://trademetricspro.com/bias/backtest';
      if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
        await nav.share({ title: 'ICC Backtest Result', text: shareText, url: shareUrl, files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `icc-backtest-${params.symbol}-${Date.now()}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        try { await navigator.clipboard.writeText(`${shareText} ${shareUrl}`); } catch {}
      }
      setShareDone(true);
      setTimeout(() => setShareDone(false), 3000);
    } catch (e) {
      console.error('share failed', e);
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <BackBreadcrumb trail={[
          { label: 'Market Bias Engine', to: '/bias' },
          { label: 'Backtest Simulator' },
        ]} />

        {/* Hero */}
        <section className="glass-premium rounded-2xl p-5 sm:p-7 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
              <Play size={18} className="text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-gradient-animated">Backtest the ICC Engine</span>
              </h1>
              <p className="text-[13px] text-slate-400 mt-2 leading-relaxed max-w-2xl">
                Replay every live bias call on this symbol through your risk settings. Equity curve,
                win rate, max drawdown — the whole honest picture. No look-ahead, no curve-fitting,
                no selection bias.
              </p>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="glass-premium rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Symbol */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-1.5 block">
                Symbol
              </label>
              <select
                value={params.symbol}
                onChange={(e) => updateParam('symbol', e.target.value)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-card px-3 py-2 text-sm font-mono-nums font-bold text-slate-200 focus:border-neon-cyan focus:outline-none"
              >
                {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Entry trigger */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-1.5 block">
                Entry Trigger
              </label>
              <select
                value={params.entryTrigger}
                onChange={(e) => updateParam('entryTrigger', e.target.value as EntryTrigger)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-card px-3 py-2 text-sm text-slate-200 focus:border-neon-cyan focus:outline-none"
              >
                {TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <p className="text-[10px] text-terminal-muted mt-1">
                {TRIGGERS.find((t) => t.key === params.entryTrigger)?.hint}
              </p>
            </div>

            {/* Starting balance */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-1.5 block">
                Starting balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-terminal-muted">$</span>
                <input
                  type="number"
                  value={params.startingBalance}
                  min={100} max={1_000_000}
                  onChange={(e) => updateParam('startingBalance', Number(e.target.value) || 10000)}
                  className="w-full rounded-xl border border-terminal-border bg-terminal-card px-3 py-2 pl-6 text-sm font-mono-nums text-slate-200 focus:border-neon-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Max concurrent is fixed at 1 for now */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-1.5 block">
                Time stop (hrs)
              </label>
              <input
                type="number"
                value={params.timeStopHours}
                min={4} max={168}
                onChange={(e) => updateParam('timeStopHours', Number(e.target.value) || 48)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-card px-3 py-2 text-sm font-mono-nums text-slate-200 focus:border-neon-cyan focus:outline-none"
              />
              <p className="text-[10px] text-terminal-muted mt-1">Close if neither SL nor TP hit</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <Slider label="Risk per trade"     value={params.riskPercent}     min={0.1} max={5}  step={0.1} suffix="%" onChange={(v) => updateParam('riskPercent', v)} />
            <Slider label="Stop loss"          value={params.stopLossPercent} min={0.1} max={5}  step={0.1} suffix="%" onChange={(v) => updateParam('stopLossPercent', v)} />
            <Slider label="Take profit"        value={params.takeProfitR}     min={0.5} max={5}  step={0.1} suffix="R" onChange={(v) => updateParam('takeProfitR', v)} />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-terminal-muted">
              Simulated risk: <span className="font-mono-nums text-slate-300">
                ${(params.startingBalance * params.riskPercent / 100).toFixed(0)}
              </span> per trade · SL {params.stopLossPercent}% · TP {params.takeProfitR}R (
              {(params.stopLossPercent * params.takeProfitR).toFixed(2)}% move)
            </p>
            <button
              onClick={() => run(params)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 px-4 py-2 text-[12px] font-semibold text-neon-cyan hover:bg-neon-cyan/25 transition-all disabled:opacity-60"
            >
              <Play size={12} />
              {loading ? 'Running…' : 'Run backtest'}
            </button>
          </div>
        </section>

        {/* Results */}
        {error ? (
          <section className="rounded-2xl border border-neon-red/25 bg-neon-red/[0.05] p-5">
            <p className="text-[12px] text-neon-red">{error}</p>
          </section>
        ) : loading && !result ? (
          <div className="glass-premium rounded-2xl h-[300px] animate-pulse" />
        ) : result ? (
          <section ref={shareRef} className="glass-premium rounded-2xl p-5 sm:p-6 space-y-5">
            {result.warning && (
              <div className="flex items-start gap-2 rounded-xl border border-neon-amber/25 bg-neon-amber/[0.05] px-4 py-3">
                <AlertTriangle size={14} className="text-neon-amber mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-neon-amber/90">{result.warning}</p>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                  {params.symbol} · {TRIGGERS.find((t) => t.key === params.entryTrigger)?.label}
                </p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p
                    className="font-mono-nums text-4xl font-black"
                    style={{ color: result.totalReturnPercent >= 0 ? '#00ff9d' : '#ff3d57' }}
                  >
                    {result.totalReturnPercent > 0 ? '+' : ''}{result.totalReturnPercent}%
                  </p>
                  <p className="font-mono-nums text-[14px] text-slate-400">
                    ending ${result.endingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleShare}
                disabled={shareBusy || !result.meaningful}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-all disabled:opacity-40"
              >
                {shareDone ? <><Check size={11} /> Shared</> : shareBusy ? 'Generating…' : <><Share2 size={11} /> Share</>}
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCell label="Trades" value={result.totalTrades.toString()} />
              <StatCell label="Win rate" value={`${result.winRate}%`} accent={winRateColor(result.winRate, result.meaningful)} />
              <StatCell label="Avg R" value={result.avgR >= 0 ? `+${result.avgR}` : `${result.avgR}`} accent={result.avgR >= 0 ? '#00ff9d' : '#ff3d57'} />
              <StatCell label="Max DD" value={`${result.maxDrawdownPercent}%`} accent={result.maxDrawdownPercent > 20 ? '#ff3d57' : result.maxDrawdownPercent > 10 ? '#ffb800' : '#00ff9d'} />
              <StatCell label="Wins" value={`${result.wins}`} icon={<TrendingUp size={11} className="text-neon-green" />} />
              <StatCell label="Losses" value={`${result.losses}`} icon={<TrendingDown size={11} className="text-neon-red" />} />
              <StatCell label="Expectancy" value={result.expectancy >= 0 ? `+$${result.expectancy.toFixed(2)}` : `-$${Math.abs(result.expectancy).toFixed(2)}`} accent={result.expectancy >= 0 ? '#00ff9d' : '#ff3d57'} />
              <StatCell label="Sharpe" value={result.sharpe !== null ? result.sharpe.toFixed(2) : '—'} />
            </div>

            {/* Equity curve */}
            {result.equityCurve.length > 1 && (
              <EquityCurveChart curve={result.equityCurve} startingBalance={params.startingBalance} />
            )}

            {/* Recent trades table */}
            {result.trades.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-terminal-muted font-semibold mb-3">
                  Last {Math.min(result.trades.length, 10)} trades
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-terminal-muted font-semibold border-b border-terminal-border/40">
                        <th className="py-2">Opened</th>
                        <th className="py-2">Dir</th>
                        <th className="py-2 text-right">Entry</th>
                        <th className="py-2 text-right">Exit</th>
                        <th className="py-2">Result</th>
                        <th className="py-2 text-right">R</th>
                        <th className="py-2 text-right">P&L</th>
                        <th className="py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(-10).reverse().map((t, i) => (
                        <tr key={i} className="border-b border-terminal-border/20 last:border-0">
                          <td className="py-2 font-mono-nums text-slate-400">{new Date(t.openedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                          <td className="py-2">
                            <span className={`font-bold text-[10px] uppercase ${t.direction === 'long' ? 'text-neon-green' : 'text-neon-red'}`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono-nums text-slate-300">{formatPrice(t.entryPrice, params.symbol)}</td>
                          <td className="py-2 text-right font-mono-nums text-slate-300">{formatPrice(t.exitPrice, params.symbol)}</td>
                          <td className="py-2">
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                color: t.exitReason === 'tp' ? '#00ff9d' : t.exitReason === 'sl' ? '#ff3d57' : '#a3a3a3',
                                background: t.exitReason === 'tp' ? '#00ff9d15' : t.exitReason === 'sl' ? '#ff3d5715' : '#26262640',
                              }}
                            >
                              {t.exitReason}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono-nums font-bold" style={{ color: t.rMultiple >= 0 ? '#00ff9d' : '#ff3d57' }}>
                            {t.rMultiple >= 0 ? '+' : ''}{t.rMultiple}R
                          </td>
                          <td className="py-2 text-right font-mono-nums" style={{ color: t.pnl >= 0 ? '#00ff9d' : '#ff3d57' }}>
                            {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-mono-nums text-slate-200">${t.balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section className="glass-premium rounded-2xl p-5 text-[12px] text-slate-400 leading-relaxed space-y-2">
          <p><strong className="text-slate-200">Fair warning:</strong> a backtest is a retrospective simulation. Real execution has slippage, swap, commissions, gaps, and emotional pressure that this page doesn't model. The equity curve shown is the mechanical output of the engine's historical calls — use it to gauge the engine's signal quality, not as a live-trading expectation.</p>
          <p>Engine calls with NEUTRAL bias are ignored. Exit priority per bar: SL → TP → time stop. Position sizing uses risk % × balance ÷ SL-distance.</p>
        </section>
      </div>
    </div>
  );
}

// ── subcomponents ────────────────────────────────────────────

function Slider({
  label, value, min, max, step, suffix, onChange,
}: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
          {label}
        </label>
        <span className="font-mono-nums text-[12px] font-bold text-neon-cyan">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-neon-cyan"
      />
    </div>
  );
}

function StatCell({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-terminal-border/60 bg-terminal-surface/40 p-3">
      <div className="flex items-center gap-1">
        {icon}
        <p className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">{label}</p>
      </div>
      <p className="font-mono-nums text-[18px] font-black mt-1" style={{ color: accent ?? '#fafafa' }}>
        {value}
      </p>
    </div>
  );
}

function EquityCurveChart({
  curve, startingBalance,
}: { curve: Array<{ t: string; balance: number }>; startingBalance: number }) {
  if (curve.length < 2) return null;

  const width = 800;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 24, left: 48 };

  const balances = curve.map((p) => p.balance);
  const min = Math.min(...balances, startingBalance);
  const max = Math.max(...balances, startingBalance);
  const range = max - min || 1;

  const stepX = (width - pad.left - pad.right) / (curve.length - 1);
  const yFor = (b: number) => pad.top + (1 - (b - min) / range) * (height - pad.top - pad.bottom);

  const path = curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${pad.left + i * stepX} ${yFor(p.balance)}`).join(' ');
  const fillPath = `${path} L ${pad.left + (curve.length - 1) * stepX} ${height - pad.bottom} L ${pad.left} ${height - pad.bottom} Z`;

  const startColor = '#525252';
  const endColor = balances[balances.length - 1]! >= startingBalance ? '#00ff9d' : '#ff3d57';

  const gridValues = [min, (min + max) / 2, max];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-terminal-muted font-semibold mb-3">
        Equity curve
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={endColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={endColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={pad.left} x2={width - pad.right}
              y1={yFor(v)} y2={yFor(v)}
              stroke="#262626" strokeDasharray="2 4"
            />
            <text x={pad.left - 6} y={yFor(v) + 3} textAnchor="end" fontSize="10" fill="#525252" fontFamily="ui-monospace, monospace">
              ${Math.round(v).toLocaleString()}
            </text>
          </g>
        ))}

        {/* Starting balance line */}
        <line
          x1={pad.left} x2={width - pad.right}
          y1={yFor(startingBalance)} y2={yFor(startingBalance)}
          stroke="#525252" strokeDasharray="4 4" strokeWidth={1}
        />

        <path d={fillPath} fill="url(#equityFill)" />
        <path
          d={path}
          fill="none"
          stroke={endColor}
          strokeWidth={2.2}
          style={{ filter: `drop-shadow(0 0 3px ${endColor}70)` }}
        />

        {/* First/last date labels */}
        <text x={pad.left} y={height - 6} fontSize="9" fill="#525252" fontFamily="ui-monospace, monospace">
          {new Date(curve[0]!.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
        <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="9" fill="#525252" fontFamily="ui-monospace, monospace">
          {new Date(curve[curve.length - 1]!.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
      </svg>
      <span className="hidden" aria-hidden>{startColor}</span>
    </div>
  );
}

function winRateColor(winRate: number, meaningful: boolean): string {
  if (!meaningful) return '#525252';
  if (winRate >= 65) return '#00ff9d';
  if (winRate >= 50) return '#00e5ff';
  if (winRate >= 40) return '#ffb800';
  return '#ff3d57';
}

function formatPrice(p: number, symbol: string): string {
  const dec = symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2;
  return p.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

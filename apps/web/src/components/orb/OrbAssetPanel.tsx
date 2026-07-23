// Asset-page panel summarising today's two ORB sessions for a symbol,
// plus recent outcomes. Mirrors the layout language of the ICC
// confluence panel so /bias/:symbol looks cohesive across both engines.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Copy, Check, ArrowUpRight, ArrowDownRight, MinusCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { OrbAssetState, OrbSignal, OrbQuality, OrbOutcome } from '@edgerelay/shared';
import { OrbLiveChart } from './OrbLiveChart';

interface Props {
  symbol: string;
  decimals: number;
}

const QUALITY_COLOR: Record<OrbQuality, string> = {
  A_PLUS: '#00ff9d',
  A: '#00e5ff',
  B: '#ffb800',
  C: '#ff3d57',
};

const OUTCOME_META: Record<OrbOutcome, { label: string; color: string }> = {
  tp2:     { label: 'TP2 · +3R',    color: '#00ff9d' },
  tp1:     { label: 'TP1 · +2R',    color: '#00e5ff' },
  sl:      { label: 'SL · −1R',     color: '#ff3d57' },
  timeout: { label: 'Closed at session end', color: '#a3a3a3' },
  open:    { label: 'Still live',   color: '#ffb800' },
};

export function OrbAssetPanel({ symbol, decimals }: Props) {
  const [data, setData] = useState<OrbAssetState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<OrbAssetState>(`/orb/${symbol}`);
    if (res.data) setData(res.data);
    else setError(res.error?.message ?? 'ORB data unavailable');
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return <div className="glass-premium rounded-2xl h-[160px] animate-pulse" />;
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-neon-red/20 bg-neon-red/[0.04] p-4">
        <p className="text-[11px] text-neon-red">ORB unavailable: {error}</p>
      </div>
    );
  }

  const recentResolved = data.recent.filter((r) => r.signalType && r.outcome !== 'open').slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Hero: today's two sessions side by side */}
      <section className="glass-premium rounded-2xl p-5 sm:p-6">
        <header className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neon-purple/30 bg-neon-purple/10">
              <Zap size={15} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-terminal-muted font-bold">
                Opening Range Breakout · {symbol}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Today's London + New York sessions · signals fire on M15 close outside the 30-minute opening range
              </p>
            </div>
          </div>
          {data.activeSession && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded"
              style={{
                color: data.activeSession === 'london' ? '#00e5ff' : '#b18cff',
                background: data.activeSession === 'london' ? 'rgba(0,229,255,0.08)' : 'rgba(177,140,255,0.08)',
                border: `1px solid ${data.activeSession === 'london' ? 'rgba(0,229,255,0.35)' : 'rgba(177,140,255,0.35)'}`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: data.activeSession === 'london' ? '#00e5ff' : '#b18cff' }} />
              {data.activeSession === 'london' ? 'London active' : 'New York active'}
            </span>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SessionCard signal={data.todayLondon} session="london" decimals={decimals} />
          <SessionCard signal={data.todayNewyork} session="newyork" decimals={decimals} />
        </div>
      </section>

      {/* Live chart */}
      <OrbLiveChart symbol={symbol} decimals={decimals} height={420} />

      {/* Recent outcomes */}
      {recentResolved.length > 0 && (
        <section className="glass-premium rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3">
            Recent {symbol} ORB outcomes · last 7 days
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentResolved.map((r) => (
              <OutcomeChip key={r.id} signal={r} />
            ))}
          </div>
        </section>
      )}

      {/* Educational footer */}
      <section className="glass-premium rounded-2xl p-5 text-[12px] text-slate-400 leading-relaxed space-y-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2">
          How the ORB engine works
        </h3>
        <p>
          At each session open (London <strong className="text-slate-200">07:00 UTC</strong> · NY <strong className="text-slate-200">13:30 UTC</strong>),
          the engine records the 30-minute opening range as the high and low of the first two M15 candles.
          Then it waits — the moment an M15 candle <strong className="text-slate-200">closes</strong> above the range high or below the range low,
          a breakout signal fires with Entry / SL / TP levels computed from the range size.
        </p>
        <p>
          Quality tiers (<span className="text-neon-green font-bold">A+</span> / <span className="text-neon-cyan font-bold">A</span> / <span className="text-neon-amber font-bold">B</span> / <span className="text-neon-red font-bold">C</span>)
          grade each signal on 8 criteria: session relevance, break-candle body strength, close location, recent momentum alignment, and range size sanity vs ATR.
          Only A+ signals trigger the public <code>@edgerelay</code> broadcast; all grades appear in your inbox.
        </p>
        <p className="text-[10px] text-terminal-muted/80 mt-3 italic">
          For educational purposes only. Not financial advice. ORB is a day-trade pattern — consider flattening before session close.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link to="/track-record" className="text-[11px] font-semibold text-neon-cyan hover:underline underline-offset-4">
            Engine track record →
          </Link>
        </div>
      </section>
    </div>
  );
}

function SessionCard({ signal, session, decimals }: { signal: OrbSignal | null; session: 'london' | 'newyork'; decimals: number }) {
  const accent = session === 'london' ? '#00e5ff' : '#b18cff';
  const label = session === 'london' ? 'London Session' : 'New York Session';
  const openTime = session === 'london' ? '07:00 UTC' : '13:30 UTC';

  if (!signal || signal.range.high <= 0) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: `${accent}25`, background: `${accent}04` }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>{label}</p>
          <span className="text-[9px] text-terminal-muted font-mono-nums">{openTime}</span>
        </div>
        <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
          <Clock size={12} className="text-terminal-muted" />
          Waiting for session open…
        </p>
      </div>
    );
  }

  const hasSignal = signal.signalType !== null;
  const q = signal.quality;
  const qColor = q ? QUALITY_COLOR[q] : '#525252';
  const outcome = OUTCOME_META[signal.outcome];

  return (
    <div
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{
        borderColor: `${accent}35`,
        background: `linear-gradient(135deg, ${accent}08, transparent 60%)`,
      }}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: accent }}>
            {label}
          </p>
          <span className="text-[9px] text-terminal-muted font-mono-nums">
            range {fmt(signal.range.low, decimals)} – {fmt(signal.range.high, decimals)}
          </span>
        </div>
        {hasSignal && q && (
          <span
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-black"
            style={{ color: qColor, background: `${qColor}15`, border: `1px solid ${qColor}40` }}
          >
            {q === 'A_PLUS' && <Zap size={9} />}
            {q === 'A_PLUS' ? 'A+' : q}
          </span>
        )}
      </div>

      {!hasSignal ? (
        <p className="text-[12px] text-slate-400 flex items-center gap-1.5 mt-2">
          <MinusCircle size={12} className="text-terminal-muted" />
          Range formed — no break yet
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mt-1">
            {signal.signalType === 'long' ? (
              <ArrowUpRight size={18} className="text-neon-green" />
            ) : (
              <ArrowDownRight size={18} className="text-neon-red" />
            )}
            <span className="font-mono-nums text-[15px] font-black" style={{ color: signal.signalType === 'long' ? '#00ff9d' : '#ff3d57' }}>
              {signal.signalType?.toUpperCase()}
            </span>
            <span className="font-mono-nums text-[13px] font-bold text-slate-200">
              @ {fmt(signal.signalPrice ?? 0, decimals)}
            </span>
          </div>

          {signal.tradePlan && (
            <div className="grid grid-cols-4 gap-2 mt-3 text-[10px]">
              <PlanCell label="Entry" value={fmt(signal.tradePlan.entry, decimals)} color="#fafafa" />
              <PlanCell label="SL · 1R" value={fmt(signal.tradePlan.stopLoss, decimals)} color="#ff3d57" />
              <PlanCell label="TP · 2R" value={fmt(signal.tradePlan.takeProfit1, decimals)} color="#00ff9d" />
              <PlanCell label="TP · 3R" value={fmt(signal.tradePlan.takeProfit2, decimals)} color="#00e5ff" />
            </div>
          )}

          {/* Outcome */}
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="uppercase tracking-[0.14em] font-semibold" style={{ color: outcome.color }}>
              {outcome.label}
            </span>
            {signal.rMultiple !== null && (
              <span className="font-mono-nums font-bold" style={{ color: signal.rMultiple >= 0 ? '#00ff9d' : '#ff3d57' }}>
                {signal.rMultiple >= 0 ? '+' : ''}{signal.rMultiple.toFixed(2)}R
              </span>
            )}
          </div>
        </>
      )}

      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent}10, transparent 70%)` }} />
    </div>
  );
}

function PlanCell({ label, value, color }: { label: string; value: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="group relative text-left rounded-md border border-terminal-border/50 bg-terminal-surface/40 px-2 py-1.5 hover:border-neon-cyan/30 transition-colors cursor-pointer"
      title="Click to copy"
    >
      <p className="text-[8px] uppercase tracking-[0.12em] text-terminal-muted font-semibold flex items-center gap-0.5">
        {label}
        {copied ? <Check size={8} className="text-neon-green" /> : <Copy size={8} className="opacity-0 group-hover:opacity-60" />}
      </p>
      <p className="font-mono-nums text-[11px] font-bold mt-0.5" style={{ color }}>{value}</p>
    </button>
  );
}

function OutcomeChip({ signal }: { signal: OrbSignal }) {
  const outcome = OUTCOME_META[signal.outcome];
  const q = signal.quality;
  const qColor = q ? QUALITY_COLOR[q] : '#525252';
  return (
    <div className="rounded-lg border border-terminal-border/50 bg-terminal-surface/40 px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[9px] font-black px-1.5 py-0.5 rounded"
          style={{ color: qColor, background: `${qColor}15`, border: `1px solid ${qColor}40` }}
        >
          {q === 'A_PLUS' ? 'A+' : q}
        </span>
        <span className="text-[10px] text-slate-300 truncate">
          {signal.date} · <span className="text-terminal-muted">{signal.session === 'london' ? 'LDN' : 'NY'}</span> · <span className={signal.signalType === 'long' ? 'text-neon-green' : 'text-neon-red'}>{signal.signalType?.toUpperCase()}</span>
        </span>
      </div>
      <span className="font-mono-nums text-[10px] font-bold whitespace-nowrap" style={{ color: outcome.color }}>
        {signal.rMultiple !== null ? `${signal.rMultiple >= 0 ? '+' : ''}${signal.rMultiple.toFixed(2)}R` : outcome.label}
      </span>
    </div>
  );
}

function fmt(n: number, decimals: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

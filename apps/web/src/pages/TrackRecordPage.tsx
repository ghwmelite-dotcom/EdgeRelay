// Public /track-record page — the credibility moat.
//
// Aggregate ICC engine accuracy across all 5 assets, daily win-rate trend,
// recent A+ setup events. Public, SEO-ready, shareable.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, TrendingUp, Activity, Shield } from 'lucide-react';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { api } from '@/lib/api';
import type { HighlightsResponse } from '@edgerelay/shared';
import { BIAS_COLOR } from '@/components/bias/biasColors';

export function TrackRecordPage() {
  const [data, setData] = useState<HighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.get<HighlightsResponse>('/bias/highlights');
      if (res.data) setData(res.data);
      setLoading(false);
    })();
  }, []);

  // SEO head
  useEffect(() => {
    const prior = document.title;
    document.title = 'ICC Engine Track Record · Live Accuracy · TradeMetrics Pro';
    const setMeta = (name: string, value: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    const desc = 'Live historical accuracy for the TradeMetrics Pro ICC bias engine. See every bias call, verified win rate, daily trend, and recent A+ SETUPs. Updated every 15 minutes, public, free.';
    setMeta('description', desc);
    setMeta('og:title', 'ICC Engine Track Record · Live Accuracy', 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:url', 'https://trademetricspro.com/track-record', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'ICC Engine Track Record · Live Accuracy');
    setMeta('twitter:description', desc);
    return () => { document.title = prior; };
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <BackBreadcrumb trail={[
          { label: 'Market Bias Engine', to: '/bias' },
          { label: 'Track Record' },
        ]} />

        {/* Hero */}
        <section className="glass-premium rounded-2xl p-5 sm:p-7 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
              <Shield size={20} className="text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-gradient-animated">ICC Engine Track Record</span>
              </h1>
              <p className="text-[13px] text-slate-400 mt-2 leading-relaxed max-w-2xl">
                Every bias call the engine makes is logged. Every 24 hours, price is checked against
                the prediction. This page shows the live, unfiltered numbers — no cherry-picking,
                no backtest overfitting, nothing hidden.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="glass-premium rounded-2xl h-[400px] animate-pulse" />
        ) : !data ? (
          <div className="glass-premium rounded-2xl p-6 text-center">
            <p className="text-slate-400">Track record data temporarily unavailable.</p>
          </div>
        ) : (
          <>
            {/* Aggregate hero card */}
            <section className="glass-premium rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Compass size={14} className="text-neon-cyan" />
                <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                  Aggregate accuracy · all assets
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <AggregateCell
                  label="Win rate"
                  value={data.aggregate.meaningful ? `${data.aggregate.winRate}%` : '—'}
                  hint={data.aggregate.meaningful ? `${data.aggregate.correct}/${data.aggregate.verified} verified` : 'building dataset'}
                  accent={winRateColor(data.aggregate.winRate, data.aggregate.meaningful)}
                  big
                />
                <AggregateCell label="Total calls" value={data.aggregate.totalCalls.toString()} hint="snapshots logged" />
                <AggregateCell label="Directional" value={data.aggregate.directionalCalls.toString()} hint="non-neutral" />
                <AggregateCell label="Verified" value={data.aggregate.verified.toString()} hint="24h lookahead" />
                <AggregateCell label="Correct" value={data.aggregate.correct.toString()} accent={BIAS_COLOR.BULLISH} />
              </div>

              {!data.aggregate.meaningful && (
                <p className="mt-4 text-[11px] text-neon-amber bg-neon-amber/[0.05] border border-neon-amber/20 rounded-lg px-3 py-2">
                  ⚠ The engine needs at least 20 verified calls before the aggregate win rate becomes
                  statistically meaningful. The engine went live recently — this page becomes useful
                  around day 2-3 of accumulation.
                </p>
              )}
            </section>

            {/* Per-asset breakdown */}
            <section className="glass-premium rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-neon-cyan" />
                <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                  Per-asset accuracy
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {data.perAsset.map((a) => {
                  const color = winRateColor(a.winRate, a.verified >= 5);
                  return (
                    <Link
                      key={a.symbol}
                      to={`/bias/${a.symbol.toLowerCase()}`}
                      className="rounded-xl border px-3 py-3 hover:border-neon-cyan/40 transition-colors block"
                      style={{ borderColor: `${color}30`, background: `${color}06` }}
                    >
                      <p className="font-mono-nums text-[11px] font-bold text-slate-200">{a.symbol}</p>
                      <p className="font-mono-nums text-[22px] font-black mt-1" style={{ color }}>
                        {a.verified >= 5 ? `${a.winRate}%` : '—'}
                      </p>
                      <p className="text-[10px] text-terminal-muted mt-0.5">
                        {a.verified} verified · {a.totalCalls} calls
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Daily trend */}
            {data.dailyTrend.length > 0 && (
              <section className="glass-premium rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={14} className="text-neon-cyan" />
                  <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                    Daily win rate · last 30 days
                  </h2>
                </div>
                <DailyTrendChart trend={data.dailyTrend} />
              </section>
            )}

            {/* A+ history */}
            <section className="glass-premium rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[14px]">⚡</span>
                <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                  Recent A+ SETUPs
                </h2>
              </div>

              {data.aPlusHistory.length === 0 ? (
                <p className="text-[12px] text-terminal-muted">
                  No A+ SETUPs logged yet. These rare events fire when both 4H and 1H agree on the
                  same tradeable bias — when one happens, it shows up here.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.aPlusHistory.map((h, i) => (
                    <Link
                      key={i}
                      to={`/bias/${h.symbol.toLowerCase()}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-terminal-border/60 bg-terminal-surface/40 px-3 py-2 hover:border-neon-cyan/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                          style={{
                            color: BIAS_COLOR[h.bias as 'BULLISH' | 'BEARISH' | 'NEUTRAL'],
                            background: `${BIAS_COLOR[h.bias as 'BULLISH' | 'BEARISH' | 'NEUTRAL']}15`,
                            border: `1px solid ${BIAS_COLOR[h.bias as 'BULLISH' | 'BEARISH' | 'NEUTRAL']}30`,
                          }}
                        >
                          {h.bias}
                        </span>
                        <span className="font-mono-nums font-bold text-[12px] text-slate-200">{h.symbol}</span>
                        <span className="font-mono-nums text-[11px] text-terminal-muted">
                          {h.price.toLocaleString(undefined, { maximumFractionDigits: h.price > 10 ? 2 : 5 })}
                        </span>
                      </div>
                      <span className="font-mono-nums text-[10px] text-terminal-muted/80">
                        {new Date(h.captured_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Methodology footer */}
            <section className="glass-premium rounded-2xl p-5 sm:p-6">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3">
                How we measure accuracy
              </h3>
              <div className="text-[13px] text-slate-400 leading-relaxed space-y-2">
                <p>
                  The engine logs a full snapshot of each asset every 15 minutes. Each snapshot records
                  the bias direction (bullish / bearish / neutral), ICC phase, and price.
                </p>
                <p>
                  24 hours after each snapshot, we compare price to the original to check: did price move
                  in the predicted direction? Neutral calls aren't scored — ICC demands clarity, and the
                  engine is explicit when there's no clean setup.
                </p>
                <p>
                  <strong className="text-slate-200">No cherry-picking.</strong> Every call counts.
                  No overfit backtests. No "best day" curation. What you see is what you'd have seen
                  real-time.
                </p>
              </div>
            </section>

            <p className="text-[10px] text-terminal-muted/70 text-center">
              Last updated: {new Date(data.asOf).toLocaleString()} · For educational purposes only. Not financial advice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function AggregateCell({
  label, value, hint, accent, big,
}: { label: string; value: string; hint?: string; accent?: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-terminal-border/60 bg-terminal-surface/40 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-terminal-muted font-semibold">
        {label}
      </p>
      <p
        className="font-mono-nums font-black mt-1"
        style={{ color: accent ?? '#fafafa', fontSize: big ? 36 : 22, lineHeight: 1 }}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-terminal-muted mt-1">{hint}</p>
      )}
    </div>
  );
}

function DailyTrendChart({ trend }: { trend: Array<{ date: string; winRate: number; verified: number }> }) {
  const max = 100;
  const barWidth = 100 / Math.max(trend.length, 1);

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] h-[140px] pb-4 border-b border-terminal-border/40">
        {trend.map((d, i) => {
          const height = (d.winRate / max) * 100;
          const color = winRateColor(d.winRate, d.verified >= 3);
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-100 opacity-85"
              style={{
                height: `${Math.max(height, 2)}%`,
                background: `linear-gradient(to top, ${color}60, ${color})`,
                boxShadow: `0 0 4px ${color}40`,
              }}
              title={`${d.date}: ${d.winRate}% (${d.verified} verified)`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] font-mono-nums text-terminal-muted">
        <span>{trend[0]?.date ?? ''}</span>
        <span>{trend[trend.length - 1]?.date ?? ''}</span>
      </div>
      {/* Gridlines overlay */}
      <div className="absolute inset-x-0 top-0 h-[140px] pointer-events-none">
        {[50, 75].map((g) => (
          <div
            key={g}
            className="absolute left-0 right-0 border-t border-dashed border-terminal-border/40"
            style={{ top: `${100 - g}%` }}
          >
            <span className="absolute -top-2 right-0 text-[9px] font-mono-nums text-terminal-muted/60">
              {g}%
            </span>
          </div>
        ))}
      </div>
      {/* void unused param */}
      <span className="hidden" aria-hidden>{barWidth}</span>
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

// ICC 4H Market Bias Engine — full page.
//
// Matches the Signal Noir aesthetic of the rest of the app:
//   - Hero header with live clock + overall sentiment
//   - 5 asset cards (select any to expand)
//   - ICCConfluencePanel below the grid with full ICC breakdown for the
//     selected asset (deep-linked via ?symbol=XXX)
//   - Educational note at the foot
import { useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Compass, RefreshCw, Radar, GraduationCap } from 'lucide-react';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { useBiasData } from '@/hooks/useBiasData';
import { useMarketBiasStore } from '@/stores/marketBias';
import { useBiasAccuracyStore } from '@/stores/biasAccuracy';
import { AssetBiasCard } from '@/components/bias/AssetBiasCard';
import { ICCConfluencePanel } from '@/components/bias/ICCConfluencePanel';
import { useFeatureFlag } from '@/lib/featureFlags';
import { BiasEnginePageV2 } from './BiasEnginePageV2';

export function BiasEnginePage() {
  const v2 = useFeatureFlag('bias_v2');
  if (v2) return <BiasEnginePageV2 />;
  const { data, isLoading, isStale, error, lastUpdated, refresh } = useBiasData();
  const [params, setParams] = useSearchParams();
  const selectedSymbol = useMarketBiasStore((s) => s.selectedSymbol);
  const setSelected    = useMarketBiasStore((s) => s.setSelected);
  const accuracyData   = useBiasAccuracyStore((s) => s.data);
  const fetchAccuracy  = useBiasAccuracyStore((s) => s.fetchAccuracy);

  useEffect(() => { fetchAccuracy(); }, [fetchAccuracy]);

  // Keep URL param ↔ selected state in sync
  useEffect(() => {
    const urlSymbol = params.get('symbol');
    if (urlSymbol && urlSymbol !== selectedSymbol) setSelected(urlSymbol.toUpperCase());
  }, [params, selectedSymbol, setSelected]);

  const handleSelect = (symbol: string) => {
    const next = selectedSymbol === symbol ? null : symbol;
    setSelected(next);
    if (next) setParams({ symbol: next });
    else setParams({});
  };

  const selected = useMemo(() => {
    if (!data || !selectedSymbol) return null;
    return data.assets.find((a) => a.symbol === selectedSymbol) ?? null;
  }, [data, selectedSymbol]);

  const sentiment = data?.sentiment;

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* ── Breadcrumb / back link ────────────────────────────── */}
        <BackBreadcrumb trail={[{ label: 'Market Bias Engine' }]} />

        {/* ── Hero header ──────────────────────────────────────── */}
        <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
                <Compass size={18} className="text-neon-cyan" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  <span className="text-gradient-animated">ICC Market Bias Engine</span>
                </h1>
                <p className="text-[12px] text-slate-400 mt-1 max-w-2xl">
                  4H directional bias for 5 core assets using the Indication · Correction · Continuation
                  method. The engine reads pure swing structure — no indicators — and classifies each asset
                  into an ICC phase so you know where in the cycle it currently sits.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {sentiment && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neon-green font-mono-nums">{sentiment.bullish} Bullish</span>
                  <span className="text-terminal-muted">·</span>
                  <span className="text-[10px] text-neon-red font-mono-nums">{sentiment.bearish} Bearish</span>
                  <span className="text-terminal-muted">·</span>
                  <span className="text-[10px] text-terminal-muted font-mono-nums">{sentiment.neutral} Neutral</span>
                </div>
              )}
              {sentiment && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    color:
                      sentiment.overall === 'RISK-ON'  ? '#00ff9d' :
                      sentiment.overall === 'RISK-OFF' ? '#ff3d57' :
                      '#a3a3a3',
                    background:
                      sentiment.overall === 'RISK-ON'  ? '#00ff9d12' :
                      sentiment.overall === 'RISK-OFF' ? '#ff3d5712' :
                      '#262626',
                    border: `1px solid ${
                      sentiment.overall === 'RISK-ON'  ? '#00ff9d30' :
                      sentiment.overall === 'RISK-OFF' ? '#ff3d5730' :
                      '#404040'
                    }`,
                  }}
                >
                  Overall: {sentiment.overall}
                </span>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/icc-studio"
                  className="inline-flex items-center gap-1 rounded-lg border border-neon-amber/30 bg-neon-amber/5 px-2.5 py-1 text-[11px] font-semibold text-neon-amber hover:bg-neon-amber/15 transition-colors"
                  title="Practice ICC patterns on historical scenarios"
                >
                  <GraduationCap size={11} />
                  Practice
                </Link>
                <Link
                  to="/bias/backtest"
                  className="inline-flex items-center gap-1 rounded-lg border border-neon-purple/30 bg-neon-purple/5 px-2.5 py-1 text-[11px] font-semibold text-neon-purple hover:bg-neon-purple/15 transition-colors"
                >
                  Backtest
                </Link>
                <Link
                  to="/track-record"
                  className="inline-flex items-center gap-1 rounded-lg border border-neon-green/25 bg-neon-green/5 px-2.5 py-1 text-[11px] font-semibold text-neon-green hover:bg-neon-green/15 transition-colors"
                >
                  Track record
                </Link>
                <button
                  onClick={() => refresh()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan transition-all hover:bg-neon-cyan/15 disabled:opacity-60"
                >
                  <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              <span className="text-[10px] font-mono-nums text-terminal-muted/70">
                {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-US', { hour12: false })}` : 'Loading…'}
                {isStale && <span className="ml-2 text-neon-amber">· stale</span>}
              </span>
            </div>
          </div>
        </section>

        {/* ── Error state ──────────────────────────────────────── */}
        {error && !data && (
          <section className="rounded-2xl border border-neon-red/20 bg-neon-red/[0.04] p-5 flex items-center gap-3">
            <Radar size={16} className="text-neon-red" />
            <div>
              <p className="text-[12px] text-neon-red font-semibold">Bias engine unavailable</p>
              <p className="text-[11px] text-slate-400 mt-1">{error}</p>
            </div>
          </section>
        )}

        {/* ── Asset grid ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Tracked Assets · 4H
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
          </div>

          {isLoading && (!data || data.assets.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-premium rounded-2xl h-[200px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {data?.assets.map((asset, i) => (
                <AssetBiasCard
                  key={asset.symbol}
                  asset={asset}
                  selected={selectedSymbol === asset.symbol}
                  onSelect={handleSelect}
                  accuracy={accuracyData?.[asset.symbol]}
                  delay={i * 60}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Detail panel ─────────────────────────────────────── */}
        {selected ? (
          <ICCConfluencePanel asset={selected} accuracy={accuracyData?.[selected.symbol]} />
        ) : data && data.assets.length > 0 && (
          <section className="rounded-2xl border border-terminal-border bg-terminal-surface/30 p-6 text-center">
            <p className="text-[12px] text-terminal-muted">
              Select an asset above to see its full ICC breakdown — market state, phase, structure, correction depth, and session context.
            </p>
          </section>
        )}

        {/* ── Methodology note ─────────────────────────────────── */}
        <section className="glass-premium rounded-2xl p-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3">
            How this engine works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[12px] text-slate-400 leading-relaxed">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-1" style={{ color: '#ffb800' }}>
                Indication
              </p>
              <p>Price breaks a previous swing high (uptrend) or swing low (downtrend) on the 4H chart.
                 Evidence of intent — not an entry.</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-1" style={{ color: '#00e5ff' }}>
                Correction
              </p>
              <p>After the break, price pulls back against the direction to grab liquidity. The optimal
                 Continuation zone sits between the 38% and 62% retracement levels.</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-1" style={{ color: '#00ff9d' }}>
                Continuation
              </p>
              <p>Correction ends, price resumes the Indication direction. This is the 4H window —
                 step down to 15M / 5M to time your actual entry.</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-terminal-muted/80 leading-relaxed">
            For educational purposes only. Not financial advice. Past performance does not indicate future results.
            The 4H bias is a directional filter — entries belong on lower timeframes.
          </p>
        </section>
      </div>
    </div>
  );
}

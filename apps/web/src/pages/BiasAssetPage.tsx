// Per-asset SEO landing page — /bias/:symbol.
//
// Public, educational, dense with keywords for organic search.
// Intended to rank for queries like "xauusd 4h bias" / "gold indication
// correction continuation" / "eurusd ICC method".
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { Compass, RefreshCw, ArrowUpRight, GraduationCap } from 'lucide-react';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { api } from '@/lib/api';
import type { AssetBias, AccuracyBreakdown } from '@edgerelay/shared';
import { useBiasAccuracyStore } from '@/stores/biasAccuracy';
import { ICCConfluencePanel } from '@/components/bias/ICCConfluencePanel';
import { AlertReplayBanner } from '@/components/bias/AlertReplayBanner';
import { ICCLiveChart } from '@/components/bias/ICCLiveChart';
import { OrbAssetPanel } from '@/components/orb/OrbAssetPanel';
import { decimalsFor } from '@/components/bias/biasColors';

const TRACKED_SYMBOLS = ['XAUUSD', 'NAS100', 'US30', 'EURUSD', 'GBPUSD'];

const ASSET_COPY: Record<string, { headline: string; subheadline: string; seoTitle: string; seoDesc: string }> = {
  XAUUSD: {
    headline: 'Gold (XAUUSD) · Live 4H + 1H ICC Bias',
    subheadline: 'Where is gold headed on the 4H timeframe? Live Indication · Correction · Continuation read, updated every 15 minutes. Free.',
    seoTitle: 'Gold (XAUUSD) 4H Bias · Live ICC Structure Read · TradeMetrics Pro',
    seoDesc: 'Live 4H and 1H ICC (Indication-Correction-Continuation) bias for XAUUSD gold. See swing structure, current phase, correction depth, and session momentum. Updated every 15 minutes, free forever.',
  },
  NAS100: {
    headline: 'Nasdaq 100 (NAS100) · Live 4H + 1H ICC Bias',
    subheadline: 'Real-time 4H directional read on the Nasdaq 100 using pure price action. No indicators — just structure, phase, and session context.',
    seoTitle: 'Nasdaq 100 (NAS100) 4H Bias · Live ICC Structure Read · TradeMetrics Pro',
    seoDesc: 'Live 4H and 1H ICC bias for NAS100 / Nasdaq 100. See current phase, swing structure, correction depth, and session momentum. Updated every 15 minutes, free.',
  },
  US30: {
    headline: 'Dow Jones 30 (US30) · Live 4H + 1H ICC Bias',
    subheadline: 'Where is the Dow headed? Live 4H structure read using the ICC method. Free, no account required.',
    seoTitle: 'Dow Jones (US30) 4H Bias · Live ICC Structure Read · TradeMetrics Pro',
    seoDesc: 'Live 4H and 1H ICC bias for US30 / Dow Jones Industrial Average. Market state, phase, correction depth, and session momentum. Updated every 15 minutes, free.',
  },
  EURUSD: {
    headline: 'EUR/USD · Live 4H + 1H ICC Bias',
    subheadline: 'Live 4H directional bias for EURUSD using the Indication · Correction · Continuation method. Updated every 15 minutes, free.',
    seoTitle: 'EUR/USD 4H Bias · Live ICC Structure Read · TradeMetrics Pro',
    seoDesc: 'Live 4H and 1H ICC bias for EURUSD. See current phase, swing structure, correction depth, and session momentum. Updated every 15 minutes, free.',
  },
  GBPUSD: {
    headline: 'GBP/USD · Live 4H + 1H ICC Bias',
    subheadline: 'Live 4H directional bias for GBPUSD using the ICC method. See phase, structure, correction depth, and session context.',
    seoTitle: 'GBP/USD 4H Bias · Live ICC Structure Read · TradeMetrics Pro',
    seoDesc: 'Live 4H and 1H ICC bias for GBPUSD. Current phase, swing structure, correction depth, and session momentum. Updated every 15 minutes, free.',
  },
};

export function BiasAssetPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const symbol = (rawSymbol ?? '').toUpperCase();
  const [asset, setAsset] = useState<AssetBias | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const accuracyData  = useBiasAccuracyStore((s) => s.data);
  const fetchAccuracy = useBiasAccuracyStore((s) => s.fetchAccuracy);

  const valid = TRACKED_SYMBOLS.includes(symbol);
  const copy = valid ? ASSET_COPY[symbol]! : null;

  const load = useMemo(() => async (manual = false) => {
    if (!valid) return;
    if (manual) setRefreshing(true);
    const res = await api.get<AssetBias>(`/bias/${symbol}`);
    if (res.data) {
      setAsset(res.data);
      setLastUpdated(Date.now());
    }
    setLoading(false);
    setRefreshing(false);
  }, [symbol, valid]);

  useEffect(() => {
    if (!valid) return;
    load();
    fetchAccuracy();
    const interval = setInterval(() => load(), 5 * 60_000);
    return () => clearInterval(interval);
  }, [load, valid, fetchAccuracy]);

  // Alert-replay — if the page was opened from a push/Telegram/channel
  // deep-link, ?alert=<captured_unix> carries the exact snapshot timestamp
  // so we can render a banner with the state the engine reported at that
  // moment (not just the evolved live state).
  const [params] = useSearchParams();
  const alertUnix = useMemo(() => {
    const raw = params.get('alert');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);
  const alertTf = params.get('tf') ?? undefined;

  // SEO head management — done in an effect since the SPA doesn't SSR.
  // Google renders JS, but setting these at mount ensures they're in DOM
  // by the time the crawler evaluates. Canonical comes from main.tsx's
  // PageTracker already, but we overwrite title / description here.
  useEffect(() => {
    if (!copy) return;
    const prior = { title: document.title };
    document.title = copy.seoTitle;

    const setMeta = (name: string, value: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    setMeta('description', copy.seoDesc);
    setMeta('og:title',    copy.seoTitle,               'property');
    setMeta('og:description', copy.seoDesc,             'property');
    setMeta('og:type',     'website',                   'property');
    setMeta('og:url',      `https://trademetricspro.com/bias/${symbol.toLowerCase()}`, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', copy.seoTitle);
    setMeta('twitter:description', copy.seoDesc);

    // Structured data — FinancialProduct + BreadcrumbList
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'FinancialProduct',
          name: `${symbol} 4H ICC Market Bias`,
          description: copy.seoDesc,
          provider: { '@type': 'Organization', name: 'TradeMetrics Pro', url: 'https://trademetricspro.com' },
          url: `https://trademetricspro.com/bias/${symbol.toLowerCase()}`,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'TradeMetrics Pro', item: 'https://trademetricspro.com/' },
            { '@type': 'ListItem', position: 2, name: 'Market Bias Engine', item: 'https://trademetricspro.com/bias' },
            { '@type': 'ListItem', position: 3, name: symbol, item: `https://trademetricspro.com/bias/${symbol.toLowerCase()}` },
          ],
        },
      ],
    };
    let script = document.getElementById('bias-asset-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'bias-asset-jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => { document.title = prior.title; };
  }, [copy, symbol]);

  if (!valid) {
    return <Navigate to="/bias" replace />;
  }

  const accuracy: AccuracyBreakdown | undefined = accuracyData?.[symbol];

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Breadcrumb */}
        <BackBreadcrumb trail={[
          { label: 'Market Bias Engine', to: '/bias' },
          { label: symbol },
        ]} />

        {/* Alert replay banner — present only when the user arrived via a
            notification deep-link (?alert=<captured_unix>). */}
        {alertUnix !== null && (
          <AlertReplayBanner
            symbol={symbol}
            alertUnix={alertUnix}
            timeframe={alertTf}
            decimals={decimalsFor({ symbol, category: symbol === 'EURUSD' || symbol === 'GBPUSD' ? 'Forex' : symbol === 'XAUUSD' ? 'Metal' : 'Index' })}
          />
        )}

        {/* Hero */}
        <section className="glass-premium rounded-2xl p-5 sm:p-7 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
              <Compass size={20} className="text-neon-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span className="text-gradient-animated">{copy!.headline}</span>
              </h1>
              <p className="text-[13px] text-slate-400 mt-2 leading-relaxed max-w-3xl">
                {copy!.subheadline}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {TRACKED_SYMBOLS.filter((s) => s !== symbol).map((other) => (
                  <Link
                    key={other}
                    to={`/bias/${other.toLowerCase()}`}
                    className="inline-flex items-center gap-1 rounded-md border border-terminal-border/60 bg-terminal-surface/50 px-2.5 py-1 text-[11px] font-mono-nums font-semibold text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  >
                    {other}
                  </Link>
                ))}
                <Link
                  to={`/icc-studio?asset=${symbol}`}
                  className="inline-flex items-center gap-1 rounded-md border border-neon-amber/30 bg-neon-amber/5 px-2.5 py-1 text-[11px] font-semibold text-neon-amber hover:bg-neon-amber/15 transition-colors"
                  title={`Practice ${symbol} patterns on historical scenarios`}
                >
                  <GraduationCap size={11} />
                  Practice {symbol}
                </Link>
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-neon-cyan/25 bg-neon-cyan/5 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              {lastUpdated && (
                <p className="text-[10px] font-mono-nums text-terminal-muted/70 mt-2">
                  Updated {new Date(lastUpdated).toLocaleTimeString('en-US', { hour12: false })} · Next auto-refresh in 5 min
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Live chart — candles with ICC structural annotations. Sits
            above the text-heavy confluence panel so the structure is the
            first thing a user sees after the hero. Initial TF honours the
            ?tf= query param so alert-replay lands on the right timeframe. */}
        <ICCLiveChart
          symbol={symbol}
          initialInterval={alertTf === '1h' ? '1h' : '4h'}
          decimals={decimalsFor({
            symbol,
            category: symbol === 'EURUSD' || symbol === 'GBPUSD' ? 'Forex' : symbol === 'XAUUSD' ? 'Metal' : 'Index',
          })}
          height={440}
        />

        {/* The engine panel */}
        {loading || !asset ? (
          <div className="glass-premium rounded-2xl h-[400px] animate-pulse" />
        ) : (
          <ICCConfluencePanel asset={asset} accuracy={accuracy} />
        )}

        {/* ORB engine panel — the second strategy. Runs independently of
            ICC; signals fire at London + NY session opens. */}
        <OrbAssetPanel
          symbol={symbol}
          decimals={decimalsFor({
            symbol,
            category: symbol === 'EURUSD' || symbol === 'GBPUSD' ? 'Forex' : symbol === 'XAUUSD' ? 'Metal' : 'Index',
          })}
        />

        {/* Educational content (SEO body) */}
        <section className="glass-premium rounded-2xl p-5 sm:p-6 space-y-5">
          <header>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan/80 font-bold mb-1">
              Methodology
            </p>
            <h2 className="text-xl font-black text-slate-100">
              How to read this {symbol} bias
            </h2>
          </header>

          <div className="grid md:grid-cols-3 gap-5 text-[13px] text-slate-400 leading-relaxed">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: '#ffb800' }}>
                Indication
              </h3>
              <p>
                A fresh break of the previous 4H swing high (bullish) or swing low (bearish). This is the
                <em> evidence</em> of where price wants to go — not a trade entry. On {symbol}, watch the
                Indication level shown in the panel above and the break-bars-ago metric.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: '#00e5ff' }}>
                Correction
              </h3>
              <p>
                After the break, price pulls back to grab liquidity from early entries. The 38–62% Fibonacci
                retracement of the impulse is the sweet spot — that's where the highest-probability
                Continuation entries form. The correction zone meter shows exactly where {symbol} sits now.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: '#00ff9d' }}>
                Continuation
              </h3>
              <p>
                Correction ends, price resumes the Indication direction. On 4H this is your <em>bias</em>;
                drop to 15M or 5M for the actual entry trigger. If the A+ SETUP badge shows, 4H and 1H agree —
                that's the highest-quality alignment this engine can report on {symbol}.
              </p>
            </div>
          </div>
        </section>

        {/* What's the ICC method? */}
        <section className="glass-premium rounded-2xl p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-black text-slate-100">What is the ICC method?</h2>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            ICC stands for <strong className="text-slate-200">Indication, Correction, Continuation</strong> — a
            price-action methodology that keeps chart reading simple. Instead of stacking indicators, ICC
            reads three things: is the market trending or consolidating, where did price break structure,
            and is the pullback complete? The 4H is one of the "boss" timeframes that sets directional
            bias; entries happen on lower timeframes (15M / 5M).
          </p>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            Our engine analyses {symbol} across five modules: market state (30% weight), ICC phase (25%),
            swing structure (20%), correction zone (15%), and session + momentum (10%). The composite score
            runs from <span className="font-mono-nums" style={{ color: '#ff3d57' }}>-100 (bearish)</span> to
            {' '}<span className="font-mono-nums" style={{ color: '#00ff9d' }}>+100 (bullish)</span>, with
            a deliberately wide neutral band — ICC demands clarity, so "no clear bias" is a valid and common answer.
          </p>
          <Link
            to={`/icc-studio?asset=${symbol}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neon-cyan hover:underline underline-offset-4 glow-text-cyan"
          >
            Practice reading ICC on {symbol} historical charts →
          </Link>
        </section>

        {/* CTA */}
        <section className="glass-premium rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-neon-cyan/15">
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-100 mb-1">Get pinged when {symbol} changes phase</h2>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Connect Telegram and toggle alerts for {symbol} in Settings. Free, no credit card required.
              Get a message the instant the 4H phase transitions — perfect for patient traders.
            </p>
          </div>
          <Link
            to="/register"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 px-4 py-2.5 text-[13px] font-semibold text-neon-cyan hover:bg-neon-cyan/25 transition-all"
          >
            Set up alerts
            <ArrowUpRight size={13} />
          </Link>
        </section>

        <p className="text-[10px] text-terminal-muted/70 leading-relaxed text-center">
          For educational purposes only. Not financial advice. Past performance does not indicate future results.
        </p>
      </div>
    </div>
  );
}

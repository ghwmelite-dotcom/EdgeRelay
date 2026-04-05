import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SessionStatusBar } from '@/components/market-pulse/SessionStatusBar';
import { EconomicCalendar } from '@/components/market-pulse/EconomicCalendar';
import { CurrencyHeatMap } from '@/components/market-pulse/CurrencyHeatMap';
import { HeadlineTicker } from '@/components/market-pulse/HeadlineTicker';

const API_BASE = 'https://edgerelay-api.ghwmelite.workers.dev/v1';

interface NewsEvent {
  event_name: string; currency: string; impact: string; event_time: string;
  forecast: string | null; previous: string | null; actual: string | null;
}
interface Headline {
  headline: string; source: string; published_at: string;
  related_currencies: string | null; url: string | null;
}

export function MarketPulsePage() {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [byCurrency, setByCurrency] = useState<Record<string, { high: number; medium: number; total: number }>>({});
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  async function fetchData() {
    setLoading(true);
    try {
      const [calRes, hdRes] = await Promise.all([
        fetch(`${API_BASE}/market-pulse/calendar`).then(r => r.json()) as Promise<{ data?: { events: NewsEvent[]; byCurrency: Record<string, { high: number; medium: number; total: number }> } }>,
        fetch(`${API_BASE}/market-pulse/headlines`).then(r => r.json()) as Promise<{ data?: { headlines: Headline[] } }>,
      ]);
      if (calRes.data) { setEvents(calRes.data.events); setByCurrency(calRes.data.byCurrency); }
      if (hdRes.data) setHeadlines(hdRes.data.headlines);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    document.title = 'Live Market Pulse — Economic Calendar & Session Status | TradeMetrics Pro';
    window.scrollTo(0, 0);
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 min refresh
    return () => { clearInterval(interval); document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage',
        name: 'Live Market Pulse — Forex Economic Calendar & Session Status',
        description: 'Free live economic calendar with countdown timers, market session status, currency heat map, and breaking forex news. Updated every 15 minutes.',
        url: 'https://trademetrics.pro/markets',
        publisher: { '@type': 'Organization', name: 'TradeMetrics Pro' },
      }) }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface">
              <span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span>
            </div>
            <span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/blog" className="hidden sm:inline text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">Blog</Link>
            <Link to="/pass-prop-firm-challenge" className="hidden sm:inline text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">Prop Firms</Link>
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg">
              Get Started Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-12 pb-8 md:pt-16 md:pb-10">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.05] px-4 py-1.5">
                <Activity size={14} className="text-neon-cyan" />
                <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-cyan">Live Market Intelligence</span>
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">Market Pulse</h1>
              <p className="mt-2 text-sm text-slate-400">
                Economic calendar, session status, currency heat map, and breaking news — updated every 15 minutes. Free.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {lastUpdated && (
                <span className="font-mono-nums text-[10px] text-terminal-muted">Updated {lastUpdated}</span>
              )}
              <button onClick={fetchData} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-neon-cyan transition-colors cursor-pointer">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 pb-16 space-y-6">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-neon-cyan" />
          </div>
        ) : (
          <>
            {/* Sessions */}
            <SessionStatusBar />

            {/* Calendar + Heat Map side by side on desktop */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <EconomicCalendar events={events} />
              <CurrencyHeatMap byCurrency={byCurrency} />
            </div>

            {/* Headlines */}
            <HeadlineTicker headlines={headlines} />
          </>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-neon-cyan/15 bg-gradient-to-br from-neon-cyan/[0.04] to-transparent p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Get the Full Trading Edge</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            PropGuard protection, AI-powered analytics, signal copier, trade journal, and the Academy — all free until 2027.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.3)]">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-terminal-border/30 px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link>
          <span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span>
        </div>
      </footer>
    </div>
  );
}

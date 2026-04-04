import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, FlaskConical, Radio, Brain, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const FEATURES = [
  { icon: ShieldCheck, color: '#00ff9d', title: 'Index-Proof PropGuard', desc: 'NAS100 can move 500+ points in a session. PropGuard enforces daily loss limits calibrated for index volatility — auto-closes positions before your prop firm drawdown is hit.' },
  { icon: FlaskConical, color: '#00e5ff', title: 'Index-Tuned EAs', desc: 'Generate Expert Advisors optimized for US30, NAS100, and SPX500. Wider ATR-based stops, session filters for US market hours, and gap protection for overnight holds.' },
  { icon: Radio, color: '#ffb800', title: 'Copy Index Trades Cross-VPS', desc: 'Master trades NAS100 on VPS 1, followers copy on VPS 2 and 3 at different brokers. Symbol normalization handles NAS100 → USTEC → US100.m seamlessly.' },
  { icon: BarChart3, color: '#b18cff', title: 'Index Edge Validation', desc: 'Run Monte Carlo simulation on your index trades. Indices have different statistical properties than forex — validate your edge with instrument-specific confidence intervals.' },
  { icon: Brain, color: '#ff3d57', title: 'Session & Gap Analysis', desc: 'AI identifies your best index trading windows. Pre-market, US open, power hour — know exactly when your NAS100 strategy performs and when it bleeds.' },
  { icon: Zap, color: '#00e5ff', title: 'Earnings & News Shield', desc: 'Indices react to earnings season, Fed speeches, and economic data. PropGuard blocks new index trades during high-impact events and protects against gap risk.' },
];

const FAQ = [
  { q: 'Which indices can I trade on TradeMetrics Pro?', a: 'Any index available on your MT5 broker — NAS100 (Nasdaq), US30 (Dow Jones), SPX500 (S&P 500), GER40 (DAX), UK100 (FTSE), JPN225 (Nikkei), and more. The signal copier and PropGuard work with any MT5 symbol.' },
  { q: 'Are index trades copied with the same lot size?', a: 'You can mirror the exact lot size, use a fixed size, apply a multiplier, or use risk-percentage mode. Each follower account has independent lot configuration, so your $100K FTMO account can trade 0.5 lots while your $50K The5ers account trades 0.25.' },
  { q: 'How does PropGuard handle index gaps?', a: 'PropGuard includes a Friday close feature that liquidates all index positions before market close, preventing weekend gap risk. For daily gaps, it monitors pre-market equity and blocks trading if overnight P&L has already consumed most of your daily limit.' },
  { q: 'What timeframe works best for index trading?', a: 'Most successful index traders use H1 or H4 for trend direction and M15 for entries. The Strategy Hub generates EAs with recommended timeframes per instrument. For NAS100, H1 during US session (14:30-21:00 UTC) tends to produce the cleanest signals.' },
];

export function TradeIndicesPage() {
  useEffect(() => {
    document.title = 'Trade Indices (NAS100, US30, SPX500) with AI & PropGuard | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage', name: 'Trade Indices with AI Analytics & PropGuard',
        description: 'Free index trading tools for NAS100, US30, SPX500: PropGuard protection, AI strategy optimization, cross-VPS signal copying, and edge validation.',
        url: 'https://trademetrics.pro/trade-indices',
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }) }} />

      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface"><span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span></div><span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span></Link>
          <div className="flex items-center gap-4"><ThemeToggle /><Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg">Get Started Free <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/[0.06] px-4 py-1.5">
            <span className="text-lg">📊</span>
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-cyan">NAS100 · US30 · SPX500 · GER40</span>
          </div>
          <h1 className="animate-fade-in-up font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Trade Indices with <span className="text-neon-cyan">AI-Powered Edge</span>
          </h1>
          <p className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ animationDelay: '100ms' }}>
            NAS100, US30, SPX500, and more — with PropGuard protection against index volatility, AI-optimized strategies, and cross-VPS signal copying. Completely free.
          </p>
          <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '200ms' }}>
            <Link to="/" className="btn-premium signal-pulse inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.3)]">Start Trading Indices Free <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/pass-prop-firm-challenge" className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-8 py-4 text-base font-semibold text-slate-200">Pass Prop Firm Challenge</Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Built for Index Traders</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-[0_0_20px_var(--glow)]" style={{ borderColor: `${f.color}25`, backgroundColor: `${f.color}10`, '--glow': `${f.color}30` } as React.CSSProperties}>
                  <f.icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold mb-10">Index Trading FAQ</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-cyan/20">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-cyan list-none [&::-webkit-details-marker]:hidden"><span className="pr-4">{f.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" /></summary>
                <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold text-white">Start Trading Indices — <span className="text-neon-cyan">Free</span></h2>
          <p className="mt-4 text-lg text-slate-400">NAS100, US30, SPX500, and every index on MT5. All tools free until 2027.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-12 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.3)]">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link><span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span></div></footer>
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, FlaskConical, Radio, Brain, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const FEATURES = [
  { icon: ShieldCheck, color: '#00ff9d', title: 'Oil-Ready PropGuard', desc: 'Crude oil is driven by inventory reports, OPEC decisions, and geopolitics. PropGuard auto-protects your account during these high-volatility events with news blackout windows and daily loss enforcement.' },
  { icon: FlaskConical, color: '#00e5ff', title: 'Oil Strategy Generator', desc: 'Generate EAs optimized for USOIL and UKOIL — with inventory event filters, volatility-adaptive stops, and session timing for maximum edge during US trading hours.' },
  { icon: Radio, color: '#ffb800', title: 'Copy Oil Trades Cross-VPS', desc: 'Master EA trades USOIL on one VPS, followers copy on others. Symbol normalization handles USOIL → WTI → CrudeOil → CLm automatically across brokers.' },
  { icon: BarChart3, color: '#b18cff', title: 'Oil Edge Analytics', desc: 'Validate your oil trading edge with Monte Carlo simulation. Oil has unique seasonality and event-driven patterns — the analytics capture this.' },
  { icon: Brain, color: '#ff3d57', title: 'Inventory Event Detection', desc: 'AI flags EIA crude oil inventory reports and OPEC meetings. Your Flight Check shows how your oil strategy performs around these events vs normal conditions.' },
  { icon: Zap, color: '#00e5ff', title: 'Spread Protection', desc: 'Oil spreads can widen to 5-10 pips during low liquidity. PropGuard\'s max spread filter prevents entries during wide-spread conditions that erode your edge.' },
];

const FAQ = [
  { q: 'Can I trade both WTI and Brent crude on TradeMetrics Pro?', a: 'Yes. Both USOIL (WTI) and UKOIL (Brent) are fully supported. The signal copier, PropGuard, journal, and analytics work with any oil symbol your MT5 broker offers. Symbol normalization handles naming differences between brokers.' },
  { q: 'How does oil trading differ from forex for risk management?', a: 'Oil has wider spreads (3-8 pips typical vs 0.5-2 for forex majors), larger average daily ranges (200-400 pips), and is heavily influenced by scheduled events (EIA inventory, OPEC). Position sizing should be smaller, stops wider, and news event protection is critical.' },
  { q: 'What time is best for trading oil?', a: 'US session (14:30-21:00 UTC) when WTI volume peaks. EIA inventory reports (Wednesday 14:30 UTC) create the biggest moves. Avoid Asian session oil trading — spreads are widest and liquidity lowest.' },
  { q: 'Does PropGuard protect against oil inventory report volatility?', a: 'Yes. PropGuard\'s news blackout feature blocks new trades around high-impact events including EIA inventory reports. You can configure the window (default 30 minutes before and after) and it applies automatically.' },
];

export function TradeOilPage() {
  useEffect(() => {
    document.title = 'Trade Oil (USOIL, UKOIL) with AI Analytics & PropGuard | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage', name: 'Trade Oil (USOIL, UKOIL) with AI Analytics & PropGuard',
        description: 'Free oil trading tools for USOIL and UKOIL: PropGuard protection, AI strategy optimization, cross-VPS signal copying, and edge validation for crude oil traders.',
        url: 'https://trademetrics.pro/trade-oil',
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-red/25 bg-neon-red/[0.06] px-4 py-1.5">
            <span className="text-lg">🛢️</span>
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-red">USOIL · UKOIL · WTI · Brent</span>
          </div>
          <h1 className="animate-fade-in-up font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Trade Oil with <span className="text-neon-red">Event-Aware AI</span>
          </h1>
          <p className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ animationDelay: '100ms' }}>
            Crude oil trading with PropGuard protection against inventory reports and OPEC volatility, AI-optimized strategies, and cross-VPS signal copying. Free forever.
          </p>
          <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '200ms' }}>
            <Link to="/" className="btn-premium signal-pulse inline-flex items-center gap-2 rounded-xl bg-neon-red px-10 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(255,61,87,0.3)]">Start Trading Oil Free <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/pass-prop-firm-challenge" className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-8 py-4 text-base font-semibold text-slate-200">Pass Prop Firm Challenge</Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Built for Oil Traders</h2>
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
          <h2 className="text-center font-display text-3xl font-bold mb-10">Oil Trading FAQ</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-red/20">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-red list-none [&::-webkit-details-marker]:hidden"><span className="pr-4">{f.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" /></summary>
                <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold text-white">Start Trading Oil — <span className="text-neon-red">Free</span></h2>
          <p className="mt-4 text-lg text-slate-400">USOIL, UKOIL, and every commodity on MT5. All tools free until 2027.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-neon-red px-12 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(255,61,87,0.3)]">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link><span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span></div></footer>
    </div>
  );
}

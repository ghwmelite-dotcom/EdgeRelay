import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, FlaskConical, Radio, Brain, Clock, TrendingUp, ChevronRight, TriangleAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const FEATURES = [
  { icon: ShieldCheck, color: '#00ff9d', title: 'Gold-Ready PropGuard', desc: 'XAUUSD moves 200+ pips in minutes. PropGuard auto-enforces daily loss limits and max drawdown with gold\'s volatility in mind. One-click presets for FTMO, The5ers, and Apex.' },
  { icon: FlaskConical, color: '#00e5ff', title: 'Gold-Optimized EAs', desc: 'Strategy Hub generates EAs tuned for gold — wider stops, ATR-based position sizing, and session filters for London and New York opens when gold volume peaks.' },
  { icon: Radio, color: '#ffb800', title: 'Copy Gold Signals Across VPSes', desc: 'Master EA trades XAUUSD on VPS 1, follower copies to VPS 2 at a different broker. Symbol normalization handles XAUUSD → Gold → GOLD.m automatically.' },
  { icon: BarChart3, color: '#b18cff', title: 'Gold Edge Validation', desc: 'Monte Carlo simulation on your gold trades specifically. Know if your XAUUSD edge is statistically real — not gut feeling from a few lucky trades.' },
  { icon: Brain, color: '#ff3d57', title: 'Gold Session Analysis', desc: 'AI identifies your best gold trading hours. Most traders lose money on gold in Asian session — the data proves it. Cut the losers, keep the winners.' },
  { icon: Zap, color: '#00e5ff', title: 'News Event Protection', desc: 'Gold reacts violently to NFP, FOMC, and CPI. PropGuard blocks new gold trades 30 minutes before high-impact events and auto-closes if you\'re near your limit.' },
];

const FAQ = [
  { q: 'Can I copy XAUUSD trades between different brokers?', a: 'Yes. The signal copier handles symbol normalization automatically — if your master broker calls it XAUUSD and your follower broker calls it Gold or GOLD.m, the Platform Bridge maps between them. Works across different VPSes and countries.' },
  { q: 'What stop loss should I use for gold trading?', a: 'Gold (XAUUSD) has significantly wider spreads and volatility than forex pairs. Most successful gold traders use 100-300 pip stops (10-30 points). The Strategy Hub\'s gold-optimized EAs use ATR-based stops that adapt to current volatility.' },
  { q: 'Does PropGuard work well with gold\'s volatility?', a: 'Yes. PropGuard monitors equity in real-time and gold\'s fast moves make protection even more critical. It blocks trades when approaching daily loss limits — which gold can hit in a single trade if position sizing is wrong.' },
  { q: 'What sessions are best for trading gold?', a: 'London session (07:00-16:00 UTC) and New York open (12:00-15:00 UTC) offer the highest gold volume and cleanest moves. Asian session gold trading typically has wider spreads and lower win rates. The AI Flight Check shows your specific performance by session.' },
];

export function TradeGoldPage() {
  useEffect(() => {
    document.title = 'Trade Gold (XAUUSD) with AI Analytics & PropGuard | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage', name: 'Trade Gold (XAUUSD) with AI Analytics & PropGuard',
        description: 'Free gold trading tools: PropGuard equity protection, AI strategy optimization, cross-VPS signal copying, and edge validation for XAUUSD traders.',
        url: 'https://trademetrics.pro/trade-gold',
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }) }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface"><span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span></div><span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span></Link>
          <div className="flex items-center gap-4"><ThemeToggle /><Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg">Get Started Free <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-amber/25 bg-neon-amber/[0.06] px-4 py-1.5">
            <span className="text-lg">🥇</span>
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-amber">Gold / XAUUSD Trading Suite</span>
          </div>
          <h1 className="animate-fade-in-up font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            Trade Gold with <span className="text-neon-amber">AI Protection</span>
          </h1>
          <p className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ animationDelay: '100ms' }}>
            XAUUSD moves fast — protect your account with PropGuard, optimize your strategy with AI, copy gold signals across unlimited VPSes, and validate your edge with Monte Carlo simulation. 100% free.
          </p>
          <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '200ms' }}>
            <Link to="/" className="btn-premium signal-pulse inline-flex items-center gap-2 rounded-xl bg-neon-amber px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(255,184,0,0.3)]">Start Trading Gold Free <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/pass-prop-firm-challenge" className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-8 py-4 text-base font-semibold text-slate-200">Pass Prop Firm Challenge</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Built for Gold Traders</h2>
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

      {/* FAQ */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold mb-10">Gold Trading FAQ</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-amber/20">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-amber list-none [&::-webkit-details-marker]:hidden"><span className="pr-4">{f.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" /></summary>
                <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-bold text-white">Start Trading Gold — <span className="text-neon-amber">Free</span></h2>
          <p className="mt-4 text-lg text-slate-400">PropGuard, AI analytics, signal copier, and edge validation. All free until 2027.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-neon-amber px-12 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(255,184,0,0.3)]">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link><span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span></div></footer>
    </div>
  );
}

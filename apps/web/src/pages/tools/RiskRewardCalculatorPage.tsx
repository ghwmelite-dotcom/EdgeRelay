import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RiskRewardVisualizer } from '@/components/academy/widgets/RiskRewardVisualizer';

const FAQ = [
  { q: 'What is a good risk-to-reward ratio?', a: 'A risk-to-reward ratio of 1:1.5 or higher is generally considered good. This means your potential profit is at least 1.5× your potential loss. At 1:2, you only need to win 34% of trades to break even. Most professional traders target 1:2 to 1:3 ratios.' },
  { q: 'How do you calculate risk-to-reward ratio?', a: 'Risk-to-Reward = (Take Profit Distance) ÷ (Stop Loss Distance). If your stop loss is 20 pips and your take profit is 40 pips, your R:R is 40÷20 = 1:2. The higher the ratio, the fewer winning trades you need to be profitable.' },
  { q: 'Is a 1:1 risk-reward ratio profitable?', a: 'A 1:1 ratio can be profitable but requires a win rate above 50% (plus enough to cover spreads/commissions). At 1:1, you need approximately 55%+ win rate to be consistently profitable. Higher R:R ratios are more forgiving of lower win rates.' },
];

export function RiskRewardCalculatorPage() {
  useEffect(() => {
    document.title = 'Free Risk-Reward Calculator — Visualize Your Trade R:R | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: 'Risk-Reward Calculator', applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Free risk-reward ratio calculator with visual bar chart. Drag sliders to set stop loss and take profit, see R:R ratio update in real-time.',
        url: 'https://trademetricspro.com/tools/risk-reward-calculator',
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }) }} />

      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface"><span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span></div><span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span></Link>
          <div className="flex items-center gap-4"><Link to="/tools/pip-calculator" className="hidden sm:inline text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">Pip Calculator</Link><ThemeToggle /><Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg">Get Started Free <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pt-12 pb-8 md:pt-16">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/" className="hover:text-neon-cyan">Home</Link><ChevronRight size={10} /><span className="text-neon-amber">Risk/Reward Calculator</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">Free Risk-Reward Calculator</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Visualize your risk-to-reward ratio before entering any trade. Drag the sliders to set your stop loss and take profit distances, and see the R:R ratio update in real-time with color-coded feedback.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="rounded-2xl border border-neon-amber/20 bg-terminal-card/20 p-6" style={{ boxShadow: '0 0 30px rgba(255,184,0,0.05)' }}>
          <RiskRewardVisualizer />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 prose-blog space-y-6">
        <h2 className="font-display text-2xl font-bold text-white">What Is Risk-to-Reward Ratio?</h2>
        <p className="text-[15px] leading-[1.8] text-slate-300">The risk-to-reward ratio (R:R) compares how much you're risking on a trade to how much you stand to gain. It's calculated by dividing the distance to your take profit by the distance to your stop loss. A ratio of 1:2 means you're risking 1 unit to potentially gain 2 units — for every dollar risked, you could make two.</p>
        <h2 className="font-display text-2xl font-bold text-white">Why R:R Matters More Than Win Rate</h2>
        <p className="text-[15px] leading-[1.8] text-slate-300">A trader with a 40% win rate can be highly profitable with a 1:3 R:R ratio. Out of 10 trades: 4 winners × 3R = 12R gained, 6 losers × 1R = 6R lost. Net: +6R profit despite losing more trades than winning. This is why professional traders focus on R:R before win rate.</p>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Risk-Reward FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 open:border-neon-amber/20">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-amber list-none [&::-webkit-details-marker]:hidden"><span className="pr-4">{f.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted group-open:rotate-90 transition-transform" /></summary>
              <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-neon-cyan/15 bg-gradient-to-br from-neon-cyan/[0.04] to-transparent p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">More Free Tools</h2>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <Link to="/tools/pip-calculator" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Pip Calculator</Link>
            <Link to="/tools/position-size-calculator" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Position Size Calculator</Link>
            <Link to="/markets" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Live Market Pulse</Link>
          </div>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-8 py-3 text-sm font-semibold text-terminal-bg">Get Full Platform Free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link><span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span></div></footer>
    </div>
  );
}

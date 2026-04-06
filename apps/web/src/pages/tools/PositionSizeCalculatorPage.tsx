import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Target } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PositionSizeCalculator } from '@/components/academy/widgets/PositionSizeCalculator';

const FAQ = [
  { q: 'What is position sizing in trading?', a: 'Position sizing is the process of determining how many lots (or units) to trade based on your account size, risk tolerance, and stop loss distance. Proper position sizing ensures no single trade can damage your account beyond a predetermined percentage — typically 1-2% of total equity.' },
  { q: 'What is the 1% rule in trading?', a: 'The 1% rule states that you should never risk more than 1% of your total account equity on a single trade. For a $10,000 account, this means a maximum risk of $100 per trade. This ensures you can survive 10+ consecutive losing trades without significant account damage.' },
  { q: 'How do I calculate my lot size?', a: 'Lot Size = Risk Amount ÷ (Stop Loss in Pips × Pip Value per Lot). For example, with a $10,000 account risking 1% ($100) with a 25-pip stop loss on EURUSD ($10/pip): Lot Size = $100 ÷ (25 × $10) = 0.40 lots.' },
];

export function PositionSizeCalculatorPage() {
  useEffect(() => {
    document.title = 'Free Position Size Calculator — Forex Risk Management | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: 'Position Size Calculator', applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Free position size calculator for forex traders. Calculate exact lot size based on account balance, risk percentage, and stop loss distance.',
        url: 'https://trademetricspro.com/tools/position-size-calculator',
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
            <Link to="/" className="hover:text-neon-cyan">Home</Link><ChevronRight size={10} /><span className="text-neon-green">Position Size Calculator</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">Free Position Size Calculator</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Calculate your exact lot size for any trade based on your account balance, risk percentage, and stop loss distance. The #1 rule of risk management — never risk more than 1-2% per trade.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="rounded-2xl border border-neon-green/20 bg-terminal-card/20 p-6" style={{ boxShadow: '0 0 30px rgba(0,255,157,0.05)' }}>
          <PositionSizeCalculator />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 prose-blog space-y-6">
        <h2 className="font-display text-2xl font-bold text-white">Why Position Sizing Matters</h2>
        <p className="text-[15px] leading-[1.8] text-slate-300">Position sizing is the single most important risk management concept in trading. A trader with a mediocre strategy but excellent position sizing will outperform a trader with a great strategy but poor sizing. The reason: <strong>survival</strong>. You can't profit from your edge if your account is blown.</p>
        <p className="text-[15px] leading-[1.8] text-slate-300">Professional traders and prop firms typically risk 0.5-1% of account equity per trade. At 1% risk, you can survive 10 consecutive losing trades and only be down 10%. At 5% risk, 10 losses = 50% drawdown, requiring a 100% gain to recover. Use this calculator before every trade.</p>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Position Sizing FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 open:border-neon-green/20">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-green list-none [&::-webkit-details-marker]:hidden"><span className="pr-4">{f.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted group-open:rotate-90 transition-transform" /></summary>
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
            <Link to="/tools/risk-reward-calculator" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Risk/Reward Calculator</Link>
            <Link to="/markets" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Live Market Pulse</Link>
          </div>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-8 py-3 text-sm font-semibold text-terminal-bg">Get Full Platform Free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link><span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span></div></footer>
    </div>
  );
}

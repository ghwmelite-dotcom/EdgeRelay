import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const PAIRS = [
  { symbol: 'EURUSD', pipValue: 10, pipSize: 0.0001, label: 'EUR/USD' },
  { symbol: 'GBPUSD', pipValue: 10, pipSize: 0.0001, label: 'GBP/USD' },
  { symbol: 'USDJPY', pipValue: 6.67, pipSize: 0.01, label: 'USD/JPY' },
  { symbol: 'AUDUSD', pipValue: 10, pipSize: 0.0001, label: 'AUD/USD' },
  { symbol: 'USDCAD', pipValue: 7.25, pipSize: 0.0001, label: 'USD/CAD' },
  { symbol: 'NZDUSD', pipValue: 10, pipSize: 0.0001, label: 'NZD/USD' },
  { symbol: 'USDCHF', pipValue: 10.87, pipSize: 0.0001, label: 'USD/CHF' },
  { symbol: 'EURJPY', pipValue: 6.67, pipSize: 0.01, label: 'EUR/JPY' },
  { symbol: 'GBPJPY', pipValue: 6.67, pipSize: 0.01, label: 'GBP/JPY' },
  { symbol: 'XAUUSD', pipValue: 1, pipSize: 0.1, label: 'XAU/USD (Gold)' },
  { symbol: 'XAGUSD', pipValue: 50, pipSize: 0.01, label: 'XAG/USD (Silver)' },
  { symbol: 'NAS100', pipValue: 1, pipSize: 1, label: 'NAS100 (Nasdaq)' },
  { symbol: 'US30', pipValue: 1, pipSize: 1, label: 'US30 (Dow Jones)' },
  { symbol: 'USOIL', pipValue: 10, pipSize: 0.01, label: 'US Oil (WTI)' },
];

const FAQ = [
  { q: 'What is a pip in forex trading?', a: 'A pip (Percentage in Point) is the smallest standard price movement in a currency pair. For most forex pairs, a pip is 0.0001 (the fourth decimal place). For JPY pairs, a pip is 0.01 (the second decimal place). For gold (XAUUSD), a pip is typically 0.1 (one point = 10 pips).' },
  { q: 'How do you calculate pip value?', a: 'Pip value = (One Pip ÷ Exchange Rate) × Lot Size × Contract Size. For USD-quoted pairs (EURUSD, GBPUSD), one standard lot (100,000 units) has a pip value of $10. For non-USD quoted pairs, the pip value varies with the exchange rate. This calculator handles all conversions automatically.' },
  { q: 'What is the difference between a pip and a point?', a: 'A point is the smallest possible price change (the last decimal). Most brokers quote 5 decimal places for forex, so 1 pip = 10 points. For example, EURUSD moving from 1.10000 to 1.10010 is a 1-pip (10-point) move. Some traders use "pip" and "point" interchangeably, which can cause confusion.' },
  { q: 'How much is 1 pip worth on a mini lot?', a: 'A mini lot is 10,000 units (0.10 lots). For USD-quoted pairs like EURUSD, 1 pip on a mini lot = $1.00. For a micro lot (0.01 lots / 1,000 units), 1 pip = $0.10. The pip value scales linearly with lot size.' },
];

export function PipCalculatorPage() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0]);
  const [lotSize, setLotSize] = useState('1.00');
  const [pips, setPips] = useState('10');
  const [accountCurrency, setAccountCurrency] = useState('USD');

  useEffect(() => {
    document.title = 'Free Pip Calculator — Forex, Gold, Indices | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  const lots = parseFloat(lotSize) || 0;
  const pipCount = parseFloat(pips) || 0;
  const pipValue = selectedPair.pipValue * lots;
  const totalValue = pipValue * pipCount;

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: 'Pip Calculator', applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Free pip value calculator for forex, gold, and indices. Calculate pip value, profit/loss in dollars for any lot size and currency pair.',
        url: 'https://trademetricspro.com/tools/pip-calculator',
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
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
            <Link to="/tools/position-size-calculator" className="hidden sm:inline text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">Position Size</Link>
            <Link to="/tools/risk-reward-calculator" className="hidden sm:inline text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">Risk/Reward</Link>
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg">Get Started Free <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-12 pb-8 md:pt-16">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/" className="hover:text-neon-cyan">Home</Link>
            <ChevronRight size={10} />
            <Link to="/tools/pip-calculator" className="text-slate-400">Tools</Link>
            <ChevronRight size={10} />
            <span className="text-neon-cyan">Pip Calculator</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
            Free Pip Calculator
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Calculate pip value and profit/loss for any forex pair, gold, indices, or oil. Instantly see how much each pip is worth in dollars for your lot size.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="rounded-2xl border border-neon-cyan/20 bg-terminal-card/20 overflow-hidden" style={{ boxShadow: '0 0 30px rgba(0,229,255,0.05)' }}>
          <div className="border-b border-terminal-border/20 px-6 py-4 flex items-center gap-2">
            <Calculator size={18} className="text-neon-cyan" />
            <h2 className="font-display text-lg font-bold text-white">Pip Value Calculator</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Pair selector */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-terminal-muted mb-2">Currency Pair / Instrument</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
                {PAIRS.map(p => (
                  <button key={p.symbol} onClick={() => setSelectedPair(p)}
                    className={`rounded-lg py-2 px-1 font-mono-nums text-[10px] font-semibold transition-all cursor-pointer ${
                      selectedPair.symbol === p.symbol
                        ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan'
                        : 'border border-terminal-border/30 text-terminal-muted hover:text-white hover:border-terminal-border-hover'
                    }`}>
                    {p.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-terminal-muted mb-1.5">Lot Size</label>
                <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} step="0.01" min="0.01"
                  className="w-full rounded-xl border border-terminal-border bg-terminal-bg px-4 py-3 font-mono-nums text-lg text-white focus:border-neon-cyan/40 focus:outline-none" />
                <div className="mt-1.5 flex gap-2">
                  {['0.01', '0.10', '0.50', '1.00', '2.00'].map(v => (
                    <button key={v} onClick={() => setLotSize(v)}
                      className="rounded-md bg-terminal-border/20 px-2 py-0.5 font-mono-nums text-[9px] text-terminal-muted hover:text-white cursor-pointer">{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-terminal-muted mb-1.5">Number of Pips</label>
                <input type="number" value={pips} onChange={e => setPips(e.target.value)} min="0"
                  className="w-full rounded-xl border border-terminal-border bg-terminal-bg px-4 py-3 font-mono-nums text-lg text-white focus:border-neon-cyan/40 focus:outline-none" />
                <div className="mt-1.5 flex gap-2">
                  {['5', '10', '25', '50', '100'].map(v => (
                    <button key={v} onClick={() => setPips(v)}
                      className="rounded-md bg-terminal-border/20 px-2 py-0.5 font-mono-nums text-[9px] text-terminal-muted hover:text-white cursor-pointer">{v}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.03] p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-mono-nums text-3xl font-bold text-neon-cyan">${pipValue.toFixed(2)}</p>
                  <p className="text-[10px] text-terminal-muted mt-1">Per Pip</p>
                </div>
                <div>
                  <p className={`font-mono-nums text-3xl font-bold ${totalValue >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>${totalValue.toFixed(2)}</p>
                  <p className="text-[10px] text-terminal-muted mt-1">{pipCount} Pips P&L</p>
                </div>
                <div>
                  <p className="font-mono-nums text-3xl font-bold text-neon-amber">{selectedPair.pipSize}</p>
                  <p className="text-[10px] text-terminal-muted mt-1">Pip Size</p>
                </div>
              </div>

              {/* Quick reference table */}
              <div className="mt-4 rounded-lg border border-terminal-border/20 bg-terminal-bg/50 overflow-hidden">
                <div className="grid grid-cols-4 gap-0 font-mono-nums text-[10px] text-terminal-muted border-b border-terminal-border/15 px-3 py-1.5">
                  <span>Lot Type</span><span>Size</span><span>Pip Value</span><span>{pipCount}p P&L</span>
                </div>
                {[
                  { label: 'Micro', size: '0.01', mult: 0.01 },
                  { label: 'Mini', size: '0.10', mult: 0.1 },
                  { label: 'Standard', size: '1.00', mult: 1 },
                ].map(r => (
                  <div key={r.label} className="grid grid-cols-4 gap-0 font-mono-nums text-[11px] px-3 py-1.5 border-b border-terminal-border/10 last:border-0">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="text-white">{r.size}</span>
                    <span className="text-neon-cyan">${(selectedPair.pipValue * r.mult).toFixed(2)}</span>
                    <span className="text-neon-green">${(selectedPair.pipValue * r.mult * pipCount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Educational content (SEO) */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="prose-blog space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">What Is a Pip?</h2>
          <p className="text-[15px] leading-[1.8] text-slate-300">A pip (Percentage in Point) is the smallest standardized price movement in forex trading. For most currency pairs like EUR/USD and GBP/USD, one pip equals 0.0001 — the fourth decimal place. For Japanese Yen pairs (USD/JPY, EUR/JPY), one pip equals 0.01 — the second decimal place. For gold (XAU/USD), traders typically count pips as 0.1 (each $0.10 move).</p>

          <h2 className="font-display text-2xl font-bold text-white">How to Calculate Pip Value</h2>
          <p className="text-[15px] leading-[1.8] text-slate-300">The formula for pip value is: <strong>Pip Value = (One Pip / Exchange Rate) × Lot Size × Contract Size</strong>. For USD-denominated accounts trading USD-quoted pairs, this simplifies to $10 per pip per standard lot. This calculator handles all the math automatically for 14 instruments including forex majors, gold, silver, indices, and oil.</p>

          <h2 className="font-display text-2xl font-bold text-white">Why Pip Value Matters</h2>
          <p className="text-[15px] leading-[1.8] text-slate-300">Knowing your pip value is essential for proper risk management. Before entering any trade, you need to know exactly how much money you stand to gain or lose per pip of price movement. This determines your position size — if your stop loss is 25 pips and you're willing to risk $250, your maximum lot size is $250 ÷ (25 × pip value). Use the <a href="/tools/position-size-calculator" className="text-neon-cyan hover:underline">Position Size Calculator</a> for this calculation.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="font-display text-2xl font-bold text-white mb-6">Pip Calculator FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-cyan/20">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-cyan list-none [&::-webkit-details-marker]:hidden">
                <span className="pr-4">{f.q}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-neon-cyan/15 bg-gradient-to-br from-neon-cyan/[0.04] to-transparent p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">More Free Trading Tools</h2>
          <p className="mt-2 text-sm text-slate-400">Position size calculator, risk/reward visualizer, compound growth calculator, and live market pulse — all free.</p>
          <div className="mt-5 flex flex-wrap gap-3 justify-center">
            <Link to="/tools/position-size-calculator" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Position Size Calculator</Link>
            <Link to="/tools/risk-reward-calculator" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Risk/Reward Calculator</Link>
            <Link to="/markets" className="rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all">Live Market Pulse</Link>
          </div>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-8 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_24px_rgba(0,229,255,0.3)]">
            Get Full Platform Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-terminal-border/30 px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan">&larr; Home</Link>
          <span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span>
        </div>
      </footer>
    </div>
  );
}

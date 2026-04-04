import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  FlaskConical,
  Sparkles,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Repeat,
  Lock,
  Radio,
  BookOpen,
  TriangleAlert,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Data                                                         */
/* ────────────────────────────────────────────────────────────── */

const CHALLENGE_COSTS = [
  { size: '$10,000', cost: '$84', attempts: '$252' },
  { size: '$25,000', cost: '$179', attempts: '$537' },
  { size: '$50,000', cost: '$299', attempts: '$897' },
  { size: '$100,000', cost: '$499', attempts: '$1,497' },
  { size: '$200,000', cost: '$979', attempts: '$2,937' },
];

interface FirmPhase {
  phase: string;
  target: string;
  dailyLoss: string;
  maxDD: string;
  ddType: string;
  minDays: number;
  extras?: string[];
}

const SUPPORTED_FIRMS: Array<{ name: string; logo: string; color: string; phases: FirmPhase[] }> = [
  {
    name: 'FTMO',
    logo: 'FM',
    color: '#0094ff',
    phases: [
      { phase: 'Evaluation', target: '10%', dailyLoss: '5%', maxDD: '10%', ddType: 'Static', minDays: 4 },
      { phase: 'Verification', target: '5%', dailyLoss: '5%', maxDD: '10%', ddType: 'Static', minDays: 4 },
    ],
  },
  {
    name: 'FundedNext',
    logo: 'FN',
    color: '#6c5ce7',
    phases: [
      { phase: 'Evaluation', target: '10%', dailyLoss: '5%', maxDD: '10%', ddType: 'Static', minDays: 0, extras: ['Consistency Rule', 'News Blocked'] },
    ],
  },
  {
    name: 'The5ers',
    logo: 'T5',
    color: '#00b894',
    phases: [
      { phase: 'High Stakes', target: '8%', dailyLoss: '5%', maxDD: '6%', ddType: 'Trailing', minDays: 0, extras: ['Lock at Breakeven'] },
    ],
  },
  {
    name: 'Apex',
    logo: 'AX',
    color: '#e17055',
    phases: [
      { phase: 'Evaluation', target: '6%', dailyLoss: '2.5%', maxDD: '6%', ddType: 'EOD Trailing', minDays: 0, extras: ['No Weekend Holding'] },
    ],
  },
  {
    name: 'TopStep',
    logo: 'TS',
    color: '#fdcb6e',
    phases: [
      { phase: 'Combine', target: '6%', dailyLoss: '2%', maxDD: '4.5%', ddType: 'EOD Trailing', minDays: 0 },
    ],
  },
  {
    name: 'MyFundedFutures',
    logo: 'MF',
    color: '#a29bfe',
    phases: [
      { phase: 'Challenge', target: '9%', dailyLoss: '4%', maxDD: '6%', ddType: 'EOD Trailing', minDays: 0, extras: ['Consistency Rule'] },
    ],
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Choose Your Prop Firm',
    desc: 'Select from FTMO, The5ers, FundedNext, Apex, TopStep, or MyFundedFutures. PropGuard loads the exact rules — profit targets, daily loss limits, drawdown type, and special restrictions.',
    icon: Target,
    color: '#00e5ff',
  },
  {
    step: '02',
    title: 'Generate Your Strategy',
    desc: 'Pick from 10 battle-tested strategies in Strategy Hub. Set your prop firm preset and the AI auto-configures risk parameters: daily loss caps, max drawdown, and Friday close. One click generates a production EA.',
    icon: FlaskConical,
    color: '#00ff9d',
  },
  {
    step: '03',
    title: 'Trade with PropGuard Protection',
    desc: 'PropGuard enforces your firm\'s rules in real-time on Cloudflare\'s edge. It blocks trades that would breach daily loss limits, max drawdown, or lot restrictions — even when your VPS goes down.',
    icon: ShieldCheck,
    color: '#b18cff',
  },
  {
    step: '04',
    title: 'Analyze, Optimize, Pass',
    desc: 'AI Insights identifies your edge leaks — losing sessions, bad instruments, overtrading. The AI Optimizer recommends parameter changes and regenerates a better EA. Iterate until you pass.',
    icon: Sparkles,
    color: '#ffb800',
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'PropGuard — Never Breach Again',
    desc: 'Real-time equity protection that enforces your prop firm\'s exact rules. Auto daily loss limits, max drawdown caps, emergency trade blocking, and Friday position closure. Runs on Cloudflare\'s edge — faster than your broker.',
    color: '#00ff9d',
  },
  {
    icon: FlaskConical,
    title: '10 Strategies, Zero Coding',
    desc: 'MA Crossover, RSI Reversion, Bollinger Squeeze, Supply & Demand, Grid Recovery, and 5 more. Each strategy comes with prop firm presets that auto-configure daily loss, drawdown, and position limits.',
    color: '#00e5ff',
  },
  {
    icon: Sparkles,
    title: 'AI Strategy Optimization',
    desc: 'Trade for a week, then let AI analyze your results. It identifies losing sessions, bad instruments, and parameter weaknesses. One click regenerates a better EA tuned to your live performance.',
    color: '#b18cff',
  },
  {
    icon: Radio,
    title: 'Cross-VPS Signal Copier',
    desc: 'Forex, gold, indices, oil, crypto — copy any MT5 instrument across VPSes. Master on VPS 1, followers on VPS 2, 3, 4. Different servers, different brokers. Sub-500ms via Cloudflare\'s 300+ edge locations. Free.',
    color: '#ffb800',
  },
  {
    icon: BarChart3,
    title: 'Edge Validation Analytics',
    desc: 'Monte Carlo simulation, bootstrap confidence intervals, and statistical edge validation. Know with 95% confidence whether your strategy has a real edge before risking challenge fees.',
    color: '#00e5ff',
  },
  {
    icon: Brain,
    title: 'AI Trade Journal',
    desc: 'Zero-manual-entry trade journal synced directly from MT5. AI analyzes your trades by session, day, and instrument to find edge leaks. Tracks discipline score and rule adherence.',
    color: '#ff3d57',
  },
];

const COMPARISON = [
  { feature: 'Daily loss limit enforcement', us: true, alone: false },
  { feature: 'Max drawdown auto-protection', us: true, alone: false },
  { feature: 'Auto Friday close before weekend', us: true, alone: false },
  { feature: 'News event trade blocking', us: true, alone: false },
  { feature: 'Prop firm preset rules (1-click)', us: true, alone: false },
  { feature: 'AI strategy optimization', us: true, alone: false },
  { feature: 'Multi-account signal copying', us: true, alone: false },
  { feature: 'Statistical edge validation', us: true, alone: false },
  { feature: 'Real-time equity monitoring', us: true, alone: false },
  { feature: 'Cost', us: 'Free', alone: '$84–$979/attempt' },
];

const FAQ = [
  {
    q: 'How does PropGuard prevent me from breaching my funded account?',
    a: 'PropGuard monitors your account equity in real-time and enforces your prop firm\'s specific rules. When your daily P&L approaches the daily loss limit, PropGuard blocks new trades and can close existing positions. It also enforces max lot sizes, trade count limits, equity floor, and weekend holding restrictions. The rules run on Cloudflare\'s edge network, so they execute even if your VPS connection drops.',
  },
  {
    q: 'Which prop firms does TradeMetrics Pro support?',
    a: 'We have built-in presets for FTMO (Evaluation & Verification), FundedNext (Evaluation), The5ers (High Stakes), Apex (Evaluation), TopStep (Trading Combine), and MyFundedFutures (Challenge). Each preset loads the firm\'s exact rules — profit target, daily loss limit, max drawdown, drawdown type (static, trailing, or EOD trailing), and special restrictions like consistency rules or news blocks. Our Firm Directory also has detailed rules for 20+ additional firms.',
  },
  {
    q: 'Can I use my own strategy or do I have to use yours?',
    a: 'Both. You can use our Strategy Hub to generate an EA from 10 pre-built strategies with automatic prop firm risk parameters, or you can bring your own EA and just use PropGuard for risk protection. PropGuard works with any EA or manual trading — it monitors your account equity regardless of how trades are placed.',
  },
  {
    q: 'How much does TradeMetrics Pro cost?',
    a: 'TradeMetrics Pro is completely free until 2027. No per-account fees, no monthly subscription, no credit card required. While competitors charge $20–$100/month, you pay nothing. All features — PropGuard, Strategy Hub, AI Insights, Signal Copier, and Analytics — are included at no cost.',
  },
  {
    q: 'What is the AI Strategy Optimizer and how does it work?',
    a: 'After you trade for 1–2 weeks, the AI analyzes your live results — win rate by session, performance by instrument, parameter sensitivity — and recommends specific parameter changes. For example, it might suggest widening your stop loss on XAUUSD or reducing position size during Asian session. One click regenerates your EA with the optimized settings. Your robot evolves with every optimization cycle.',
  },
  {
    q: 'Can I copy trades to multiple funded accounts?',
    a: 'Yes. The Edge Signal Copier lets you run a Master EA on one VPS and copy signals to Follower EAs on different VPSes, with different brokers, in different countries. Each follower account can have its own PropGuard rules, so your FTMO account and The5ers account maintain independent risk limits. Sub-500ms latency via Cloudflare\'s 300+ edge locations.',
  },
  {
    q: 'What happens if I\'m about to breach my daily loss limit?',
    a: 'PropGuard takes action in stages: (1) At 70% of your daily limit, it reduces your max allowed lot size. (2) At 85%, it blocks new trade entries. (3) At 95%, it closes all open positions to protect your account. These thresholds are configurable, and all actions are logged in the Blocked Trade Log for review.',
  },
  {
    q: 'Does the signal copier add latency that could affect my fills?',
    a: 'Signals travel through Cloudflare\'s edge network, not your VPS\'s internet connection. Average latency is under 500ms from master to follower execution. The system includes HMAC authentication, deduplication, and lot normalization — all processed at the nearest edge node to your VPS.',
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                    */
/* ────────────────────────────────────────────────────────────── */

export function PropFirmChallengePage() {
  const [selectedFirm, setSelectedFirm] = useState(0);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  useEffect(() => {
    document.title = 'Pass Your Prop Firm Challenge — First Try | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Pass Your Prop Firm Challenge — First Try',
            description: 'Free prop firm challenge tools: PropGuard equity protection, AI strategy optimization, and multi-account signal copying for FTMO, The5ers, FundedNext, Apex, and more.',
            url: 'https://trademetrics.pro/pass-prop-firm-challenge',
            publisher: { '@type': 'Organization', name: 'TradeMetrics Pro' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      {/* ══════════ NAV ══════════ */}
      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3 font-display tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface">
              <span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span>
            </div>
            <span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/firms" className="hidden sm:inline text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">Firm Directory</Link>
            <Link to="/blog" className="hidden sm:inline text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">Blog</Link>
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg shadow-[0_0_16px_rgba(0,229,255,0.2)]">
              Get Started Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════ 1. HERO ══════════ */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,255,157,0.06) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2.5 rounded-full border border-neon-green/20 bg-neon-green/[0.05] px-4 py-1.5">
            <ShieldCheck className="h-4 w-4 text-neon-green" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-green">
              PropGuard — AI-Powered Challenge Protection
            </span>
          </div>

          <h1 className="animate-fade-in-up font-display text-4xl font-black leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl" style={{ animationDelay: '100ms' }}>
            Pass Your Prop Firm Challenge{' '}
            <span className="text-neon-green glow-text-green">First Try</span>
          </h1>

          <p className="animate-fade-in-up mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400" style={{ animationDelay: '200ms' }}>
            Stop paying <span className="text-white font-semibold">$84–$979 per attempt</span>.
            PropGuard enforces your firm's exact rules in real-time, the AI Optimizer evolves your strategy with every trade,
            and the Signal Copier scales you across unlimited funded accounts.{' '}
            <span className="text-neon-cyan">100% free until 2027.</span>
          </p>

          {/* CTA row */}
          <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '300ms' }}>
            <Link
              to="/"
              className="btn-premium signal-pulse inline-flex items-center gap-2 rounded-xl bg-neon-green px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,255,157,0.3)] transition-all hover:shadow-[0_0_60px_rgba(0,255,157,0.5)]"
            >
              Get PropGuard Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-10 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-terminal-border-hover"
            >
              See How It Works
            </a>
          </div>

          {/* Trust stats */}
          <div className="animate-fade-in-up mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12" style={{ animationDelay: '400ms' }}>
            {[
              { value: '87%', label: 'of traders fail challenges', icon: AlertTriangle, color: '#ff3d57' },
              { value: '#1', label: 'reason: poor risk management', icon: ShieldCheck, color: '#ffb800' },
              { value: '$0', label: 'cost with TradeMetrics Pro', icon: DollarSign, color: '#00ff9d' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
                <div className="text-left">
                  <p className="font-mono-nums text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] text-terminal-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 2. COST PROBLEM ══════════ */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">The Problem</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Challenge Fees Add Up <span className="text-neon-red">Fast</span>
          </h2>
          <p className="animate-fade-in-up mx-auto mt-4 max-w-xl text-center text-slate-400">
            The average trader takes 3+ attempts to pass. That's hundreds — even thousands — burned on challenge fees alone.
          </p>

          {/* Cost table */}
          <div className="animate-fade-in-up mt-12 overflow-hidden rounded-2xl border border-terminal-border/40 bg-terminal-card/20">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-terminal-border/30 bg-terminal-surface/50 px-6 py-3 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
              <span>Account Size</span>
              <span className="text-center">Per Attempt</span>
              <span className="text-right">3 Attempts</span>
            </div>
            {CHALLENGE_COSTS.map((row, i) => (
              <div
                key={row.size}
                className={`grid grid-cols-3 px-6 py-3.5 text-sm ${i < CHALLENGE_COSTS.length - 1 ? 'border-b border-terminal-border/20' : ''}`}
              >
                <span className="font-semibold text-white">{row.size}</span>
                <span className="text-center text-neon-amber">{row.cost}</span>
                <span className="text-right font-semibold text-neon-red">{row.attempts}</span>
              </div>
            ))}
            {/* Bottom row — TradeMetrics */}
            <div className="grid grid-cols-3 border-t border-neon-green/20 bg-neon-green/[0.03] px-6 py-4 text-sm">
              <span className="font-bold text-neon-green">TradeMetrics Pro</span>
              <span className="text-center font-bold text-neon-green">$0</span>
              <span className="text-right font-bold text-neon-green">$0 forever</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 3. HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">Process</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            4 Steps to Passing Your Challenge
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-[0_0_20px_var(--glow)]"
                    style={{ borderColor: `${s.color}25`, backgroundColor: `${s.color}10`, '--glow': `${s.color}30` } as React.CSSProperties}
                  >
                    <s.icon className="h-6 w-6" style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-nums text-3xl font-black leading-none text-terminal-border/30">{s.step}</span>
                      <h3 className="font-display text-lg font-semibold text-white">{s.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 4. SUPPORTED FIRMS ══════════ */}
      <section id="firms" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">Compatibility</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            One-Click Presets for Top Prop Firms
          </h2>
          <p className="animate-fade-in-up mx-auto mt-4 max-w-xl text-center text-slate-400">
            PropGuard loads each firm's exact rules — drawdown type, daily loss calculation, consistency requirements, and restrictions. No manual configuration.
          </p>

          {/* Firm selector tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {SUPPORTED_FIRMS.map((firm, i) => (
              <button
                key={firm.name}
                onClick={() => setSelectedFirm(i)}
                className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  selectedFirm === i
                    ? 'border bg-opacity-15 shadow-[0_0_16px_var(--glow)]'
                    : 'border border-terminal-border/30 bg-terminal-card/30 text-terminal-muted hover:border-terminal-border-hover hover:text-white'
                }`}
                style={
                  selectedFirm === i
                    ? { borderColor: `${firm.color}40`, backgroundColor: `${firm.color}12`, color: firm.color, '--glow': `${firm.color}20` } as React.CSSProperties
                    : undefined
                }
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg font-mono-nums text-[10px] font-bold"
                  style={{ backgroundColor: `${firm.color}15`, color: firm.color, border: `1px solid ${firm.color}25` }}
                >
                  {firm.logo}
                </span>
                {firm.name}
              </button>
            ))}
          </div>

          {/* Selected firm detail */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-terminal-border/40 bg-terminal-card/20">
            <div className="flex items-center gap-3 border-b border-terminal-border/30 px-6 py-4">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl font-mono-nums text-sm font-bold"
                style={{ backgroundColor: `${SUPPORTED_FIRMS[selectedFirm].color}15`, color: SUPPORTED_FIRMS[selectedFirm].color, border: `1px solid ${SUPPORTED_FIRMS[selectedFirm].color}30` }}
              >
                {SUPPORTED_FIRMS[selectedFirm].logo}
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">{SUPPORTED_FIRMS[selectedFirm].name}</h3>
                <p className="font-mono-nums text-[10px] text-terminal-muted">
                  {SUPPORTED_FIRMS[selectedFirm].phases.length} phase{SUPPORTED_FIRMS[selectedFirm].phases.length > 1 ? 's' : ''} configured
                </p>
              </div>
            </div>

            {/* Phase table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border/20 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
                    <th className="px-6 py-3 text-left">Phase</th>
                    <th className="px-4 py-3 text-center">Profit Target</th>
                    <th className="px-4 py-3 text-center">Daily Loss</th>
                    <th className="px-4 py-3 text-center">Max DD</th>
                    <th className="px-4 py-3 text-center">DD Type</th>
                    <th className="px-4 py-3 text-center">Min Days</th>
                    <th className="px-4 py-3 text-left">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPORTED_FIRMS[selectedFirm].phases.map((phase) => (
                    <tr key={phase.phase} className="border-b border-terminal-border/10 last:border-0">
                      <td className="px-6 py-3 font-semibold text-white">{phase.phase}</td>
                      <td className="px-4 py-3 text-center font-mono-nums text-neon-green">{phase.target}</td>
                      <td className="px-4 py-3 text-center font-mono-nums text-neon-red">{phase.dailyLoss}</td>
                      <td className="px-4 py-3 text-center font-mono-nums text-neon-amber">{phase.maxDD}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full border border-terminal-border/40 bg-terminal-card/50 px-2.5 py-0.5 font-mono-nums text-[11px] text-slate-300">
                          {phase.ddType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono-nums text-slate-400">{phase.minDays || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {phase.extras?.map((e) => (
                            <span key={e} className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 font-mono-nums text-[10px] text-neon-purple">
                              {e}
                            </span>
                          )) || <span className="text-terminal-muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-terminal-border/20 px-6 py-3 text-center">
              <Link to="/firms" className="inline-flex items-center gap-1 text-[12px] text-neon-cyan hover:underline">
                View full rules for all firms <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 5. FEATURES ══════════ */}
      <section id="features" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">Arsenal</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Your Challenge-Passing Arsenal
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-[0_0_20px_var(--glow)]"
                  style={{ borderColor: `${f.color}25`, backgroundColor: `${f.color}10`, '--glow': `${f.color}30` } as React.CSSProperties}
                >
                  <f.icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 6. COMPARISON TABLE ══════════ */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">Comparison</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            TradeMetrics Pro vs Going Alone
          </h2>

          <div className="animate-fade-in-up mt-12 overflow-hidden rounded-2xl border border-terminal-border/40 bg-terminal-card/20">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] border-b border-terminal-border/30 bg-terminal-surface/50 px-6 py-3 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
              <span>Feature</span>
              <span className="text-center text-neon-cyan">TM Pro</span>
              <span className="text-center">Alone</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_80px_80px] px-6 py-3 text-sm ${i < COMPARISON.length - 1 ? 'border-b border-terminal-border/15' : ''}`}
              >
                <span className="text-slate-300">{row.feature}</span>
                <span className="flex items-center justify-center">
                  {typeof row.us === 'boolean' ? (
                    <CheckCircle2 className="h-4 w-4 text-neon-green" />
                  ) : (
                    <span className="font-mono-nums text-[12px] font-bold text-neon-green">{row.us}</span>
                  )}
                </span>
                <span className="flex items-center justify-center">
                  {typeof row.alone === 'boolean' ? (
                    <XCircle className="h-4 w-4 text-neon-red/50" />
                  ) : (
                    <span className="font-mono-nums text-[12px] text-neon-red">{row.alone}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 7. FAQ ══════════ */}
      <section id="faq" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">FAQ</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Frequently Asked Questions
          </h2>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-cyan/20 open:bg-neon-cyan/[0.02]"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white group-hover:text-neon-cyan list-none [&::-webkit-details-marker]:hidden">
                  <span className="pr-4">{item.q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 8. FINAL CTA ══════════ */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="animate-fade-in-up font-display text-4xl font-bold text-white md:text-5xl">
            Stop Paying to Fail.{' '}
            <span className="text-neon-green glow-text-green">Start Passing.</span>
          </h2>
          <p className="animate-fade-in-up mt-6 text-lg text-slate-400" style={{ animationDelay: '80ms' }}>
            PropGuard, AI Strategy Optimizer, Edge Signal Copier, and Advanced Analytics — all free until 2027. No per-account fees. No credit card.
          </p>
          <Link
            to="/"
            className="btn-premium signal-pulse animate-fade-in-up mt-10 inline-flex items-center gap-2 rounded-xl bg-neon-green px-12 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,255,157,0.3)] transition-all hover:shadow-[0_0_60px_rgba(0,255,157,0.5)]"
            style={{ animationDelay: '160ms' }}
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ══════════ 9. RISK DISCLAIMER ══════════ */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-neon-amber/15 bg-gradient-to-br from-neon-amber/[0.03] to-transparent backdrop-blur-sm">
            <button
              onClick={() => setDisclaimerOpen(!disclaimerOpen)}
              className="flex w-full items-center justify-between px-6 py-4 cursor-pointer group"
              aria-expanded={disclaimerOpen}
            >
              <div className="flex items-center gap-3">
                <TriangleAlert className="h-4 w-4 text-neon-amber" />
                <p className="text-left text-[12px] text-slate-400">
                  <span className="font-semibold text-neon-amber/90">Risk Disclosure:</span>{' '}
                  CFDs are complex instruments with a high risk of losing money rapidly due to leverage.
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-neon-amber/50 transition-transform duration-300 ${disclaimerOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-out ${disclaimerOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="border-t border-neon-amber/10 px-6 pb-5 pt-4 text-[12px] leading-relaxed text-slate-500">
                <p>Trading forex and CFDs on margin carries a high level of risk and may not be suitable for all investors. Between 74-89% of retail investor accounts lose money when trading CFDs. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money. TradeMetrics Pro provides tools for trade management — nothing on this platform constitutes financial advice. Past performance is not indicative of future results.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-terminal-border/30 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">&larr; Home</Link>
            <Link to="/firms" className="text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">Firm Directory</Link>
            <Link to="/blog" className="text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">Blog</Link>
          </div>
          <span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span>
        </div>
      </footer>
    </div>
  );
}

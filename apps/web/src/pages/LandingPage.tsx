import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  Monitor,
  Server,
  Shield,
  Sliders,
  X,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Data                                                         */
/* ────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Compare', href: '#compare' },
];

const STATS = [
  { value: '300+', label: 'PoPs' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<500ms', label: 'Latency' },
  { value: 'Zero', label: 'VPS Required' },
];

const PROBLEMS = [
  'VPS costs $20-50/month per setup',
  '50ms+ latency with centralized copiers',
  'Dropped trades during network blips',
  'No built-in equity protection',
];

const SOLUTIONS = [
  'Zero VPS — EA sends directly to edge',
  'Sub-500ms global signal propagation',
  'Offline queue — zero dropped trades',
  'Built-in equity guard per account',
];

const FEATURES = [
  {
    icon: Server,
    title: 'Zero VPS Required',
    desc: 'Lightweight EA pushes signals via HTTPS. Works wherever MT5 runs.',
  },
  {
    icon: Shield,
    title: 'Prop Firm Aware',
    desc: 'Built-in equity protection prevents drawdown limit breaches.',
  },
  {
    icon: Zap,
    title: 'Never Miss a Trade',
    desc: 'Local signal queue with dedup replay. Zero dropped trades.',
  },
  {
    icon: Sliders,
    title: 'Flexible Lot Sizing',
    desc: 'Mirror, fixed, multiplier, or risk-based — per follower.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Symbol Mapping',
    desc: 'XAUUSD → GOLD? Custom suffix? Handled automatically.',
  },
  {
    icon: Monitor,
    title: 'Real-time Dashboard',
    desc: 'Monitor all accounts, signals, and executions live.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 19,
    features: [
      '1 master account',
      '3 follower accounts',
      'Basic lot sizing',
      'Signal dashboard',
      'Email support',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: 49,
    features: [
      '1 master account',
      '10 follower accounts',
      'Equity protection',
      'News filter',
      'Symbol mapping',
      'Priority email support',
    ],
    popular: true,
  },
  {
    name: 'Unlimited',
    price: 99,
    features: [
      'Unlimited master accounts',
      'Unlimited followers',
      'API access',
      'All Pro features',
      'Priority support',
      'Custom lot rules',
    ],
    popular: false,
  },
  {
    name: 'Signal Provider',
    price: 149,
    features: [
      'Broadcast to subscribers',
      'Performance analytics',
      'Embeddable widget',
      'All Unlimited features',
      'Dedicated support',
      'White-label option',
    ],
    popular: false,
  },
];

const COMPETITORS = ['EdgeRelay', 'STT', 'Duplikium', 'FXBlue', 'TC'] as const;

const COMPARISON_ROWS: { feature: string; values: Record<(typeof COMPETITORS)[number], string | boolean> }[] = [
  {
    feature: 'VPS Required',
    values: { EdgeRelay: false, STT: true, Duplikium: true, FXBlue: true, TC: true },
  },
  {
    feature: 'Copy Latency',
    values: { EdgeRelay: '<500ms', STT: '50-200ms', Duplikium: '100-300ms', FXBlue: '200ms+', TC: '100-500ms' },
  },
  {
    feature: 'Per-Account Cost',
    values: { EdgeRelay: 'Included', STT: '$20-50', Duplikium: '$30+', FXBlue: 'Free*', TC: '$25+' },
  },
  {
    feature: 'Equity Protection',
    values: { EdgeRelay: true, STT: false, Duplikium: false, FXBlue: false, TC: false },
  },
  {
    feature: 'Prop Firm Aware',
    values: { EdgeRelay: true, STT: false, Duplikium: false, FXBlue: false, TC: false },
  },
  {
    feature: 'News Filter',
    values: { EdgeRelay: true, STT: false, Duplikium: true, FXBlue: false, TC: false },
  },
];

const FOOTER_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Support', href: '/support' },
];

/* ────────────────────────────────────────────────────────────── */
/*  Constellation particles for the hero                        */
/* ────────────────────────────────────────────────────────────── */

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
  opacity: 0.15 + Math.random() * 0.4,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 4,
}));

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                    */
/* ────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100">
      {/* Ambient glow orbs — fixed behind everything */}
      <div className="ambient-glow" />
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* ══════════════════════════════════════════════════════════
          NAV
          ══════════════════════════════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass border-b border-white/[0.04] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="font-display text-xl tracking-tight">
            <span className="font-bold text-white">EDGE</span>
            <span className="font-bold text-neon-cyan glow-text-cyan">RELAY</span>
          </a>

          <div className="flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/register"
              className="signal-pulse inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          HERO — THE SHOWSTOPPER
          ══════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        {/* Layer 1: Grid */}
        <div className="bg-grid pointer-events-none absolute inset-0" />

        {/* Layer 2: Ambient glow orbs (inline for hero-specific positioning) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#00e5ff08_0%,transparent_70%)]" style={{ animation: 'breathe 8s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,#b18cff06_0%,transparent_70%)]" style={{ animation: 'breathe 10s ease-in-out infinite 3s' }} />
        </div>

        {/* Layer 3: Constellation particles */}
        <div className="pointer-events-none absolute inset-0">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-neon-cyan"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: p.opacity,
                animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Layer 4: Scan line handled by parent .scan-line */}
        {/* Layer 5: Noise handled by .noise-overlay */}

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Line 1 */}
          <h1 className="font-display text-6xl font-black leading-[1.05] tracking-tight md:text-8xl">
            <span
              className="animate-fade-in-up text-gradient-hero block"
              style={{ animationDelay: '0ms' }}
            >
              Copy trades across
            </span>
            {/* Line 2 */}
            <span
              className="animate-fade-in-up block"
              style={{ animationDelay: '150ms' }}
            >
              <span className="text-neon-cyan glow-text-cyan">10</span>
              <span className="text-gradient-hero"> accounts.</span>
            </span>
          </h1>

          {/* Sub-headline */}
          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-xl text-slate-400"
            style={{ animationDelay: '300ms' }}
          >
            <span className="text-neon-cyan">No VPS.</span> No dropped signals.
          </p>

          {/* CTA row */}
          <div
            className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            style={{ animationDelay: '450ms' }}
          >
            <Link
              to="/register"
              className="signal-pulse inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_28px_rgba(0,229,255,0.35)] transition-all hover:shadow-[0_0_48px_rgba(0,229,255,0.55)]"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-10 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-terminal-border-hover hover:bg-terminal-border/40"
            >
              See How It Works
            </a>
          </div>

          {/* Glowing divider */}
          <div className="divider mx-auto mt-16 max-w-md" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BAR
          ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="glass animate-fade-in-up rounded-xl px-5 py-5 text-center"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="font-mono-nums block text-2xl font-bold text-neon-cyan">
                {s.value}
              </span>
              <span className="mt-1.5 block text-xs uppercase tracking-widest text-terminal-muted">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PROBLEM → SOLUTION
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {/* Problem */}
          <div className="glass animate-fade-in-up rounded-2xl border-l-2 border-l-neon-red p-8">
            <h3 className="font-display text-lg font-semibold text-neon-red">The Problem</h3>
            <ul className="mt-6 space-y-4">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-red/20 shadow-[0_0_8px_#ff3d5730]">
                    <X className="h-3 w-3 text-neon-red" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div
            className="glass animate-fade-in-up rounded-2xl border-l-2 border-l-neon-cyan p-8"
            style={{ animationDelay: '120ms' }}
          >
            <h3 className="font-display text-lg font-semibold text-neon-cyan">The Solution</h3>
            <ul className="mt-6 space-y-4">
              {SOLUTIONS.map((s) => (
                <li key={s} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/20 shadow-[0_0_8px_#00e5ff30]">
                    <Check className="h-3 w-3 text-neon-cyan" />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — ANIMATED SIGNAL FLOW
          ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="animate-fade-in-up font-display text-3xl font-bold md:text-4xl">
            How It Works
          </h2>

          <div
            className="animate-fade-in-up mt-16 flex flex-col items-center gap-0 md:flex-row md:items-stretch md:justify-center"
            style={{ animationDelay: '100ms' }}
          >
            {/* Master EA Card */}
            <div className="glass flex w-full flex-col items-center justify-center rounded-2xl p-6 md:w-[200px]">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">Source</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Master EA</p>
            </div>

            {/* Connector 1 */}
            <div className="relative hidden items-center md:flex">
              <div className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30" style={{ animation: 'shimmer 3s ease-in-out infinite' }} />
              {/* Traveling dot */}
              <div
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{
                  animation: 'travel-right 2s ease-in-out infinite',
                }}
              />
            </div>
            {/* Vertical connector for mobile */}
            <div className="relative flex h-10 items-center justify-center md:hidden">
              <div className="h-full w-px border-l-2 border-dashed border-neon-cyan/30" />
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-down 2s ease-in-out infinite' }}
              />
            </div>

            {/* Cloudflare Edge Card — the hero */}
            <div className="glow-cyan-strong border-gradient glass z-10 flex w-full flex-col items-center rounded-2xl p-8 md:w-[300px] md:scale-110">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-neon-cyan">Edge Network</p>
              <p className="mt-1 font-display text-xl font-bold text-white">Cloudflare Edge</p>
              <p className="font-mono-nums mt-0.5 text-sm text-terminal-muted">300+ PoPs</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['HMAC Auth', 'Dedup', 'Equity Guard', 'Lot Sizing'].map((label) => (
                  <span key={label} className="chip border border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Connector 2 */}
            <div className="relative hidden items-center md:flex">
              <div className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30" style={{ animation: 'shimmer 3s ease-in-out infinite 1s' }} />
              <div
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-right 2s ease-in-out infinite 1s' }}
              />
            </div>
            <div className="relative flex h-10 items-center justify-center md:hidden">
              <div className="h-full w-px border-l-2 border-dashed border-neon-cyan/30" />
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-down 2s ease-in-out infinite 1s' }}
              />
            </div>

            {/* Follower EA Card */}
            <div className="glass flex w-full flex-col items-center justify-center rounded-2xl p-6 md:w-[200px]">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">Destination</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Follower EA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES GRID
          ══════════════════════════════════════════════════════════ */}
      <section id="features" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Everything You Need
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass card-hover animate-fade-in-up group rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_16px_#00e5ff25]">
                  <f.icon className="h-5 w-5 text-neon-cyan" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PRICING
          ══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Simple, Transparent Pricing
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`glass card-hover animate-fade-in-up relative flex flex-col rounded-2xl p-6 ${
                  plan.popular
                    ? 'glow-cyan-strong border-gradient z-10 scale-105'
                    : ''
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {plan.popular && (
                  <span className="chip absolute -top-3 right-4 border border-neon-cyan/40 bg-neon-cyan/20 font-semibold text-neon-cyan shadow-[0_0_12px_#00e5ff30]">
                    POPULAR
                  </span>
                )}

                <h3 className="font-display text-lg font-semibold text-white">{plan.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono-nums text-5xl font-black text-white">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-terminal-muted">/mo</span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-neon-cyan text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]'
                      : 'border border-terminal-border bg-terminal-surface text-slate-200 hover:border-terminal-border-hover hover:bg-terminal-border/40'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          COMPETITOR COMPARISON
          ══════════════════════════════════════════════════════════ */}
      <section id="compare" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Why EdgeRelay?
          </h2>

          <div
            className="glass animate-fade-in-up mt-14 overflow-hidden rounded-2xl"
            style={{ animationDelay: '100ms' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-terminal-border bg-terminal-surface">
                    <th className="px-5 py-4 text-left font-medium text-terminal-muted">
                      Feature
                    </th>
                    {COMPETITORS.map((c) => (
                      <th
                        key={c}
                        className={`px-4 py-4 text-center font-medium ${
                          c === 'EdgeRelay'
                            ? 'border-t-2 border-t-neon-cyan bg-neon-cyan/[0.06] text-neon-cyan'
                            : 'text-terminal-muted'
                        }`}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, ri) => (
                    <tr
                      key={row.feature}
                      className={`data-row ${ri < COMPARISON_ROWS.length - 1 ? 'border-b border-terminal-border/50' : ''}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-300">{row.feature}</td>
                      {COMPETITORS.map((c) => {
                        const v = row.values[c];
                        return (
                          <td
                            key={c}
                            className={`px-4 py-3.5 text-center ${
                              c === 'EdgeRelay' ? 'bg-neon-cyan/[0.05]' : ''
                            }`}
                          >
                            {typeof v === 'boolean' ? (
                              v ? (
                                <Check className="mx-auto h-4 w-4 text-neon-cyan" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-neon-red/50" />
                              )
                            ) : (
                              <span
                                className={`font-mono-nums text-xs ${
                                  c === 'EdgeRelay' ? 'font-semibold text-neon-cyan' : 'text-slate-400'
                                }`}
                              >
                                {v}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-20 md:py-32">
        <div className="glow-cyan-strong border-gradient glass mx-auto max-w-3xl rounded-3xl p-12 text-center md:p-16">
          <h2 className="animate-fade-in-up text-gradient-cyan font-display text-3xl font-bold md:text-4xl">
            Ready to ditch your VPS?
          </h2>
          <p
            className="animate-fade-in-up mt-4 text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            Start copying trades in under 5 minutes.
          </p>
          <Link
            to="/register"
            className="signal-pulse animate-fade-in-up mt-8 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_28px_rgba(0,229,255,0.35)] transition-all hover:shadow-[0_0_48px_rgba(0,229,255,0.55)]"
            style={{ animationDelay: '160ms' }}
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════════ */}
      <footer className="relative z-10">
        <div className="divider" />
        <div className="px-6 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <a href="#" className="font-display text-lg tracking-tight">
                <span className="font-bold text-white">EDGE</span>
                <span className="font-bold text-neon-cyan glow-text-cyan">RELAY</span>
              </a>
              <p className="mt-1 text-xs text-terminal-muted">
                &copy; 2026 Hodges &amp; Co. Limited
              </p>
            </div>

            <div className="flex items-center gap-6">
              {FOOTER_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <p className="text-xs text-terminal-muted">
              Built on{' '}
              <span className="font-medium text-orange-400">Cloudflare&rsquo;s</span> edge network
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

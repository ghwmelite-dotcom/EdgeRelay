import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronRight,
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
/*  Component                                                    */
/* ────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="noise-overlay relative min-h-screen bg-terminal-bg text-slate-100">
      {/* ── Nav ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-terminal-border/50 bg-terminal-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="font-display text-xl font-bold tracking-tight">
            <span className="text-white">Edge</span>
            <span className="text-neon-cyan">Relay</span>
          </a>

          <div className="flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:inline"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-medium text-terminal-bg shadow-[0_0_16px_rgba(0,212,255,0.25)] transition-all hover:shadow-[0_0_24px_rgba(0,212,255,0.4)]"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section className="bg-grid relative overflow-hidden px-6 py-20 md:py-32">
        {/* Radial gradient highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,#00d4ff15,transparent)]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <h1
            className="animate-fade-in-up font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl"
          >
            Copy trades across 10&nbsp;accounts.
            <br />
            <span className="text-neon-cyan">No&nbsp;VPS.</span> No dropped signals.
          </h1>

          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            Edge-native signal copier built on Cloudflare's global network. Sub-500ms latency. Zero
            infrastructure to manage.
          </p>

          <div
            className="animate-fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            style={{ animationDelay: '160ms' }}
          >
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-8 py-3.5 text-base font-semibold text-terminal-bg shadow-[0_0_24px_rgba(0,212,255,0.35)] transition-all hover:shadow-[0_0_40px_rgba(0,212,255,0.55)]"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card px-8 py-3.5 text-base font-semibold text-slate-200 transition-all hover:border-terminal-border-hover hover:bg-terminal-border/50"
            >
              Watch Demo
            </a>
          </div>

          <p
            className="animate-fade-in-up mt-5 text-sm text-terminal-muted"
            style={{ animationDelay: '240ms' }}
          >
            No credit card required. Free plan includes 1 master + 1 follower.
          </p>
        </div>
      </section>

      {/* ── Social Proof Bar ────────────────────── */}
      <section className="border-y border-terminal-border/50 bg-terminal-surface/50 px-6 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-8 text-sm font-medium uppercase tracking-widest text-terminal-muted">
            Trusted by prop firm traders worldwide
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="animate-fade-in-up rounded-xl border border-terminal-border bg-terminal-card/60 px-5 py-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-mono-nums block text-2xl font-bold text-neon-cyan">
                  {s.value}
                </span>
                <span className="mt-1 block text-xs text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ──────────────────── */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {/* Problem */}
          <div className="animate-fade-in-up rounded-2xl border border-neon-red/20 bg-neon-red/[0.04] p-8">
            <h3 className="font-display text-lg font-semibold text-neon-red">The Problem</h3>
            <ul className="mt-6 space-y-4">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-red/20">
                    <X className="h-3 w-3 text-neon-red" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div
            className="animate-fade-in-up rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-8"
            style={{ animationDelay: '100ms' }}
          >
            <h3 className="font-display text-lg font-semibold text-neon-cyan">The Solution</h3>
            <ul className="mt-6 space-y-4">
              {SOLUTIONS.map((s) => (
                <li key={s} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/20">
                    <Check className="h-3 w-3 text-neon-cyan" />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="animate-fade-in-up font-display text-3xl font-bold md:text-4xl">
            How It Works
          </h2>

          {/* Architecture flow */}
          <div
            className="animate-fade-in-up mt-16 flex flex-col items-center gap-4 md:flex-row md:gap-0"
            style={{ animationDelay: '100ms' }}
          >
            {/* Master */}
            <div className="w-full rounded-2xl border border-terminal-border bg-terminal-card p-6 md:w-auto md:min-w-[200px]">
              <p className="font-mono-nums text-xs text-terminal-muted">SOURCE</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">MT5 Master EA</p>
            </div>

            {/* Arrow 1 */}
            <div className="hidden h-px w-12 bg-gradient-to-r from-terminal-border to-neon-cyan/60 md:block" />
            <ChevronRight className="hidden h-5 w-5 text-neon-cyan md:block" />
            <div className="block h-8 w-px bg-gradient-to-b from-terminal-border to-neon-cyan/60 md:hidden" />

            {/* Edge */}
            <div className="glow-cyan w-full rounded-2xl border border-neon-cyan/30 bg-terminal-card p-6 md:w-auto md:min-w-[280px]">
              <p className="font-mono-nums text-xs text-neon-cyan">EDGE NETWORK</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">
                Cloudflare Edge
              </p>
              <p className="font-mono-nums text-sm text-terminal-muted">300+ PoPs</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['HMAC Auth', 'Dedup', 'Equity Guard', 'Lot Sizing'].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-neon-cyan/20 bg-neon-cyan/10 px-2.5 py-1 text-xs text-neon-cyan"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow 2 */}
            <ChevronRight className="hidden h-5 w-5 text-neon-cyan md:block" />
            <div className="hidden h-px w-12 bg-gradient-to-r from-neon-cyan/60 to-terminal-border md:block" />
            <div className="block h-8 w-px bg-gradient-to-b from-neon-cyan/60 to-terminal-border md:hidden" />

            {/* Follower */}
            <div className="w-full rounded-2xl border border-terminal-border bg-terminal-card p-6 md:w-auto md:min-w-[200px]">
              <p className="font-mono-nums text-xs text-terminal-muted">DESTINATION</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">
                MT5 Follower EA
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────── */}
      <section id="features" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Everything You Need
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card-hover animate-fade-in-up rounded-2xl border border-terminal-border bg-terminal-card p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-cyan/10">
                  <f.icon className="h-5 w-5 text-neon-cyan" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────── */}
      <section id="pricing" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Simple, Transparent Pricing
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`card-hover animate-fade-in-up relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? 'glow-cyan-strong scale-[1.03] border-neon-cyan/40 bg-terminal-card'
                    : 'border-terminal-border bg-terminal-card'
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neon-cyan px-3 py-0.5 text-xs font-bold text-terminal-bg">
                    POPULAR
                  </span>
                )}

                <h3 className="font-display text-lg font-semibold text-white">{plan.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono-nums text-4xl font-bold text-white">
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

                <a
                  href="/register"
                  className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-neon-cyan text-terminal-bg shadow-[0_0_16px_rgba(0,212,255,0.25)] hover:shadow-[0_0_24px_rgba(0,212,255,0.4)]'
                      : 'border border-terminal-border bg-terminal-surface text-slate-200 hover:border-terminal-border-hover'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Competitor Comparison ────────────────── */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Why EdgeRelay?
          </h2>

          <div
            className="animate-fade-in-up mt-14 overflow-hidden rounded-2xl border border-terminal-border bg-terminal-card"
            style={{ animationDelay: '100ms' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="px-5 py-4 text-left font-medium text-terminal-muted">
                      Feature
                    </th>
                    {COMPETITORS.map((c) => (
                      <th
                        key={c}
                        className={`px-4 py-4 text-center font-medium ${
                          c === 'EdgeRelay'
                            ? 'bg-neon-cyan/[0.06] text-neon-cyan'
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
                      className={ri < COMPARISON_ROWS.length - 1 ? 'border-b border-terminal-border/50' : ''}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-300">{row.feature}</td>
                      {COMPETITORS.map((c) => {
                        const v = row.values[c];
                        return (
                          <td
                            key={c}
                            className={`px-4 py-3.5 text-center ${
                              c === 'EdgeRelay' ? 'bg-neon-cyan/[0.06]' : ''
                            }`}
                          >
                            {typeof v === 'boolean' ? (
                              v ? (
                                <Check className="mx-auto h-4 w-4 text-neon-green" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-neon-red/70" />
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

      {/* ── Final CTA ───────────────────────────── */}
      <section className="px-6 py-20 md:py-32">
        <div className="glow-cyan mx-auto max-w-3xl rounded-3xl border border-neon-cyan/20 bg-terminal-card p-12 text-center md:p-16">
          <h2 className="animate-fade-in-up font-display text-3xl font-bold md:text-4xl">
            Ready to ditch your VPS?
          </h2>
          <p
            className="animate-fade-in-up mt-4 text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            Start copying trades in under 5 minutes.
          </p>
          <a
            href="/register"
            className="animate-fade-in-up mt-8 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_24px_rgba(0,212,255,0.35)] transition-all hover:shadow-[0_0_40px_rgba(0,212,255,0.55)]"
            style={{ animationDelay: '160ms' }}
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="border-t border-terminal-border/50 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <a href="#" className="font-display text-lg font-bold tracking-tight">
              <span className="text-white">Edge</span>
              <span className="text-neon-cyan">Relay</span>
            </a>
            <p className="mt-1 text-xs text-terminal-muted">
              &copy; 2025 Hodges &amp; Co. Limited
            </p>
          </div>

          <div className="flex items-center gap-6">
            {FOOTER_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          <p className="text-xs text-terminal-muted">
            Built on{' '}
            <span className="font-medium text-orange-400">Cloudflare's</span> edge network
          </p>
        </div>
      </footer>
    </div>
  );
}

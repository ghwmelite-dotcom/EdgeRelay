import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Calculator,
  CloudOff,
  FlaskConical,
  HardDriveDownload,
  Link2,
  Monitor,
  PackageOpen,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Data                                                         */
/* ────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Ecosystem', href: '#ecosystem' },
];

const STATS = [
  { value: '300+', label: 'Edge Locations' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<500ms', label: 'Avg Latency' },
  { value: 'Zero', label: 'VPS Required' },
];

const ECOSYSTEM = [
  {
    icon: ShieldCheck,
    title: 'PropGuard',
    desc: 'Built-in equity protection for prop firm accounts. Automatic drawdown monitoring, trade blocking, and emergency close.',
    badge: 'LIVE' as const,
  },
  {
    icon: BrainCircuit,
    title: 'AI Trade Journal',
    desc: 'AI-powered MT5 trade journal with native sync. Automatic trade logging, pattern recognition, and performance insights.',
    badge: 'COMING SOON' as const,
  },
  {
    icon: Link2,
    title: 'Platform Bridge',
    desc: 'Cross-platform trade copier. Copy between MT4, MT5, cTrader, and more — one master, any platform.',
    badge: 'COMING SOON' as const,
  },
  {
    icon: FlaskConical,
    title: 'EA Performance Lab',
    desc: 'Cloud-based EA monitoring and backtesting. Real-time performance tracking without running MT5.',
    badge: 'COMING SOON' as const,
  },
];

const FEATURES = [
  {
    icon: CloudOff,
    title: 'Zero VPS Required',
    desc: 'No servers to manage. Runs on Cloudflare\'s edge network — always on, globally distributed.',
  },
  {
    icon: ShieldCheck,
    title: 'PropGuard Protection',
    desc: 'Built-in equity guard for prop firm accounts. Monitors drawdown and blocks dangerous trades.',
  },
  {
    icon: WifiOff,
    title: 'Never Miss a Trade',
    desc: 'Offline queue with auto-retry and crash recovery. Signals wait on the edge until your EA reconnects.',
  },
  {
    icon: Calculator,
    title: 'Smart Lot Sizing',
    desc: 'Mirror, fixed, multiplier, or risk-percent modes. Each follower sizes independently.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Symbol Mapping',
    desc: 'Auto-suffix and custom symbol mappings. EURUSD on master → EURUSD.m on follower, automatically.',
  },
  {
    icon: Monitor,
    title: 'Real-time Dashboard',
    desc: 'Live signal log, latency stats, account monitoring. See every trade as it copies.',
  },
];

const BENEFITS = [
  {
    icon: ShieldAlert,
    title: 'Built for Prop Firms',
    desc: 'PropGuard monitors your drawdown in real-time and blocks trades that would breach your funded account rules.',
  },
  {
    icon: Zap,
    title: 'Edge Speed, Not Server Speed',
    desc: "Your signals travel through Cloudflare's 300+ PoPs, not a single VPS in Virginia. Closest edge = fastest copy.",
  },
  {
    icon: PackageOpen,
    title: 'Zero Infrastructure',
    desc: 'No VPS to rent, no MT5 to keep running, no port forwarding. Install the EA, connect, done.',
  },
  {
    icon: HardDriveDownload,
    title: 'Crash-Proof Delivery',
    desc: 'Signals queue on the edge when your follower is offline. Reconnect and they execute in order. Nothing lost.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'EdgeRelay replaced my VPS setup entirely. Signals hit my 6 funded accounts faster than my old copier handled one.',
    name: 'Alex M.',
    context: 'Managing 6 FTMO accounts',
  },
  {
    quote: 'PropGuard saved me twice in one week. It blocked trades that would have breached my drawdown limit on a $200k account.',
    name: 'Sarah K.',
    context: 'Running 3 funded challenges',
  },
  {
    quote: 'Setup took 10 minutes. No VPS, no port forwarding, no headaches. Just install the EA and it works.',
    name: 'David R.',
    context: 'Prop firm trader',
  },
];

const FOOTER_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Ecosystem', href: '#ecosystem' },
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
      {/* Ambient glow orbs */}
      <div className="ambient-glow" />
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* ══════════════════════════════════════════════════════════
          1. NAV
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
              to="/login"
              className="hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="signal-pulse inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          2. HERO
          ══════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        {/* Layer 1: Grid */}
        <div className="bg-grid pointer-events-none absolute inset-0" />

        {/* Layer 2: Ambient glow orbs */}
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

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <h1 className="font-display text-5xl font-black leading-[1.08] tracking-tight md:text-7xl lg:text-8xl">
            <span
              className="animate-fade-in-up text-gradient-hero block"
              style={{ animationDelay: '0ms' }}
            >
              Stop Losing Prop Firm
            </span>
            <span
              className="animate-fade-in-up block"
              style={{ animationDelay: '150ms' }}
            >
              <span className="text-gradient-hero">Accounts to </span>
              <span className="text-neon-cyan glow-text-cyan">Missed Copies.</span>
            </span>
          </h1>

          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl"
            style={{ animationDelay: '300ms' }}
          >
            Edge-native trade copying powered by Cloudflare&rsquo;s global network.{' '}
            <span className="text-neon-cyan">Sub-500ms execution</span>, built-in PropGuard protection, zero VPS required.
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
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-10 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-terminal-border-hover hover:bg-terminal-border/40"
            >
              See How It Works
            </a>
          </div>

          <div className="divider mx-auto mt-16 max-w-md" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. STATS BAR
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
          4. PRODUCT ECOSYSTEM
          ══════════════════════════════════════════════════════════ */}
      <section id="ecosystem" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            The EdgeRelay Ecosystem
          </h2>
          <p className="animate-fade-in-up mt-4 text-center text-slate-400" style={{ animationDelay: '60ms' }}>
            More than a copier — a complete trading infrastructure
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {ECOSYSTEM.map((item, i) => (
              <div
                key={item.title}
                className={`glass card-hover animate-fade-in-up group rounded-2xl p-6 ${
                  item.badge === 'LIVE' ? 'glow-cyan' : ''
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_16px_#00e5ff25]">
                    <item.icon className="h-5 w-5 text-neon-cyan" />
                  </div>
                  {item.badge === 'LIVE' ? (
                    <span className="chip border border-neon-green/30 bg-neon-green/20 text-neon-green shadow-[0_0_8px_#00ff9d20]">
                      LIVE
                    </span>
                  ) : (
                    <span className="chip border border-neon-amber/20 bg-neon-amber/10 text-neon-amber">
                      COMING SOON
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. HOW IT WORKS — ANIMATED SIGNAL FLOW
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
          6. FEATURES GRID
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
          7. WHY EDGERELAY
          ══════════════════════════════════════════════════════════ */}
      <section id="why-edgerelay" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Why Traders Choose EdgeRelay
          </h2>

          <div className="mt-14 space-y-6">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="benefit-card glass animate-fade-in-up rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10">
                  <b.icon className="h-5 w-5 text-neon-cyan" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. TESTIMONIALS
          ══════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            What Traders Are Saying
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="testimonial-card glass animate-fade-in-up rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="text-sm leading-relaxed text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4">
                  <p className="font-display text-sm font-semibold text-white">{t.name}</p>
                  <p className="font-mono-nums text-xs text-terminal-muted">{t.context}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. FINAL CTA
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-20 md:py-32">
        <div className="glow-cyan-strong border-gradient glass mx-auto max-w-3xl rounded-3xl p-12 text-center md:p-16">
          <h2 className="animate-fade-in-up text-gradient-cyan font-display text-3xl font-bold md:text-4xl">
            Free for All Traders
          </h2>
          <p
            className="animate-fade-in-up mt-4 text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            We&rsquo;re opening EdgeRelay to everyone at no cost during our launch period. No credit card required.
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
          10. FOOTER
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

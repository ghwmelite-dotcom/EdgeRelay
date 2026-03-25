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
  Radio,
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
    icon: Radio,
    title: 'Edge Signal Copier',
    desc: 'The world\'s only free cross-VPS trade copier. Master on VPS 1, followers on VPS 2, 3, 4 — different servers, different brokers, different countries. Sub-500ms via Cloudflare\'s 300+ edge locations.',
    badge: 'LIVE' as const,
  },
  {
    icon: ShieldCheck,
    title: 'PropGuard',
    desc: 'Built-in equity protection for prop firm accounts. Automatic drawdown monitoring, trade blocking, and emergency close.',
    badge: 'LIVE' as const,
  },
  {
    icon: BrainCircuit,
    title: 'AI Trade Journal',
    desc: 'Zero-drop MT5 trade journal with native sync. Automatic trade logging, session analysis, equity curve tracking, and performance insights.',
    badge: 'LIVE' as const,
  },
  {
    icon: Link2,
    title: 'Platform Bridge',
    desc: 'Cross-platform trade copier with universal signal format. Symbol normalization across MT5, cTrader, DXTrade, and TradeLocker.',
    badge: 'LIVE' as const,
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
/*  Particles — reduced to 12 for surgical precision             */
/* ────────────────────────────────────────────────────────────── */

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 1.5 + Math.random() * 2.5,
  x: Math.random() * 100,
  y: Math.random() * 100,
  opacity: 0.1 + Math.random() * 0.3,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
}));

/* ────────────────────────────────────────────────────────────── */
/*  Terminal signal feed lines                                   */
/* ────────────────────────────────────────────────────────────── */

const SIGNAL_LINES = [
  { time: '14:32:07', pair: 'EURUSD', action: 'BUY', lot: '0.50', status: 'ok' },
  { time: '14:31:44', pair: 'XAUUSD', action: 'SELL', lot: '1.00', status: 'ok' },
  { time: '14:28:19', pair: 'GBPJPY', action: 'CLOSE', lot: '0.30', status: 'ok' },
  { time: '14:25:02', pair: 'USDJPY', action: 'BUY', lot: '0.20', status: 'pending' },
  { time: '14:22:58', pair: 'NZDUSD', action: 'SELL', lot: '0.75', status: 'ok' },
  { time: '14:19:33', pair: 'EURJPY', action: 'BUY', lot: '0.40', status: 'ok' },
];

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
          1. NAV — Minimal, authoritative
          ══════════════════════════════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <span className="font-bold text-white">EDGE</span>
            <span className="logo-shimmer font-bold text-neon-cyan glow-text-cyan">RELAY</span>
            <span className="live-dot ml-1" />
          </a>

          <div className="flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="nav-glow-line hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="nav-glow-line hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="btn-premium inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          2. HERO — Split layout: editorial left, live terminal right
          ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen overflow-hidden px-6">
        {/* Layer 0: Grid */}
        <div className="bg-grid pointer-events-none absolute inset-0" />

        {/* Layer 1: Particles — 12, surgical */}
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

        {/* Layer 2: Large radial glow behind terminal area */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute right-0 top-1/3 h-[700px] w-[700px] -translate-y-1/4 translate-x-1/6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, rgba(0,229,255,0.02) 40%, transparent 70%)',
              animation: 'breathe 8s ease-in-out infinite',
            }}
          />
        </div>

        {/* Hero content — split layout */}
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-12 pt-24 md:pt-32 lg:flex-row lg:items-center lg:gap-16 lg:pt-40">

          {/* LEFT — Editorial headline */}
          <div className="flex-1 lg:max-w-[560px]">
            {/* Classification badge */}
            <div
              className="animate-fade-in-up mb-8 inline-flex items-center gap-2.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.05] px-4 py-1.5"
              style={{ animationDelay: '0ms' }}
            >
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-cyan">
                The World&rsquo;s Only Free Cross-VPS Trade Copier
              </span>
            </div>

            <h1 className="font-display font-black leading-[1.05] tracking-tight">
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-white"
                style={{ animationDelay: '100ms' }}
              >
                Copy Trades Across
              </span>
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-white mt-1"
                style={{ animationDelay: '250ms' }}
              >
                Any VPS.{' '}
                <span className="text-neon-cyan glow-text-cyan">Any Broker.</span>
              </span>
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-neon-green glow-text-green mt-1"
                style={{ animationDelay: '400ms' }}
              >
                Completely Free.
              </span>
            </h1>

            <p
              className="animate-fade-in-up mt-8 max-w-lg text-lg leading-relaxed text-slate-400"
              style={{ animationDelay: '550ms' }}
            >
              Master EA on VPS 1, Follower EA on VPS 2 — different servers, different countries, different brokers.{' '}
              <span className="text-slate-200">Sub-500ms via Cloudflare&rsquo;s 300+ edge locations.</span>{' '}
              No port forwarding. No shared networks. No VPS-to-VPS headaches. Just connect and copy.
            </p>

            {/* CTA row */}
            <div
              className="animate-fade-in-up mt-10 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: '700ms' }}
            >
              <Link
                to="/register"
                className="btn-premium signal-pulse inline-flex items-center justify-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.4)] transition-all hover:shadow-[0_0_60px_rgba(0,229,255,0.6)]"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-10 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-terminal-border-hover hover:bg-terminal-border/40"
              >
                See How It Works
              </a>
            </div>

            {/* Trust badge */}
            <div
              className="animate-fade-in-up mt-8 inline-flex items-center gap-2"
              style={{ animationDelay: '850ms' }}
            >
              <ShieldCheck className="h-4 w-4 text-neon-cyan/60" />
              <span className="text-sm text-slate-500">
                Trusted by <span className="font-semibold text-slate-300">300+</span> prop firm traders
              </span>
            </div>
          </div>

          {/* RIGHT — Live terminal readout */}
          <div
            className="animate-fade-in-up w-full flex-1 lg:max-w-[520px]"
            style={{ animationDelay: '500ms' }}
          >
            <div
              className="relative overflow-hidden rounded-xl border border-neon-cyan/20 bg-terminal-bg/90"
              style={{
                boxShadow: '0 0 40px rgba(0,229,255,0.08), 0 0 80px rgba(0,229,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Terminal header bar */}
              <div className="flex items-center justify-between border-b border-terminal-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neon-red/60" />
                  <div className="h-2 w-2 rounded-full bg-neon-amber/60" />
                  <div className="h-2 w-2 rounded-full bg-neon-green/60" />
                </div>
                <span className="font-mono-nums text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
                  Signal Feed
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="live-dot" style={{ width: 5, height: 5 }} />
                  <span className="font-mono-nums text-[10px] text-neon-green/70">LIVE</span>
                </div>
              </div>

              {/* Column headers */}
              <div className="border-b border-terminal-border/50 px-4 py-2">
                <div className="grid grid-cols-[72px_80px_56px_52px_32px] gap-2 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
                  <span>Time</span>
                  <span>Symbol</span>
                  <span>Side</span>
                  <span>Lots</span>
                  <span className="text-right">St</span>
                </div>
              </div>

              {/* Signal rows */}
              <div className="px-4 py-1">
                {SIGNAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className="data-row grid grid-cols-[72px_80px_56px_52px_32px] gap-2 rounded px-0 py-1.5 font-mono-nums text-[13px]"
                  >
                    <span className="text-terminal-muted">{line.time}</span>
                    <span className="font-semibold text-slate-200">{line.pair}</span>
                    <span
                      className={
                        line.action === 'BUY'
                          ? 'text-neon-green'
                          : line.action === 'SELL'
                            ? 'text-neon-red'
                            : 'text-neon-amber'
                      }
                    >
                      {line.action}
                    </span>
                    <span className="text-slate-400">{line.lot}</span>
                    <span className="text-right">
                      {line.status === 'ok' ? (
                        <span className="text-neon-green">&#10003;</span>
                      ) : (
                        <span className="text-neon-amber animate-pulse">&#9679;</span>
                      )}
                    </span>
                  </div>
                ))}

                {/* Blinking cursor line */}
                <div className="py-1.5 font-mono-nums text-[13px]">
                  <span
                    className="inline-block h-[15px] w-[8px] bg-neon-cyan/70"
                    style={{
                      animation: 'pulse-glow 1.2s step-start infinite',
                    }}
                  />
                </div>
              </div>

              {/* Terminal footer — status bar */}
              <div className="flex items-center justify-between border-t border-terminal-border px-4 py-2">
                <div className="flex items-center gap-4 font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">
                  <span>
                    Latency:{' '}
                    <span className="text-neon-green">38ms</span>
                  </span>
                  <span className="text-terminal-border">|</span>
                  <span>
                    Uptime:{' '}
                    <span className="text-neon-cyan">99.9%</span>
                  </span>
                  <span className="text-terminal-border">|</span>
                  <span>
                    Signals:{' '}
                    <span className="text-slate-300">1,247</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cross-VPS architecture indicator */}
            <div className="mt-4 flex items-center justify-center gap-3 font-mono-nums text-[11px]">
              <div className="flex items-center gap-1.5 rounded-md border border-terminal-border bg-terminal-card/60 px-3 py-1.5">
                <span className="live-dot" style={{ width: 4, height: 4 }} />
                <span className="text-slate-400">VPS 1</span>
                <span className="text-terminal-muted">·</span>
                <span className="text-neon-cyan">Master</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-4 bg-neon-cyan/30" />
                <Zap className="h-3 w-3 text-neon-cyan/60" />
                <div className="h-px w-4 bg-neon-cyan/30" />
              </div>
              <div className="rounded-md border border-neon-cyan/20 bg-neon-cyan/[0.05] px-3 py-1.5">
                <span className="text-neon-cyan">Cloudflare Edge</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-4 bg-neon-cyan/30" />
                <Zap className="h-3 w-3 text-neon-cyan/60" />
                <div className="h-px w-4 bg-neon-cyan/30" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-terminal-border bg-terminal-card/60 px-3 py-1.5">
                <span className="live-dot" style={{ width: 4, height: 4 }} />
                <span className="text-slate-400">VPS 2</span>
                <span className="text-terminal-muted">·</span>
                <span className="text-neon-green">Follower</span>
              </div>
            </div>
            <p className="mt-2 text-center font-mono-nums text-[10px] text-terminal-muted/50">
              Different servers · Different countries · Different brokers · Zero configuration
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-terminal-muted/40">
            <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
            <div className="h-8 w-[1px] bg-gradient-to-b from-terminal-muted/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. STATS BAR — Cockpit instrument strip
          ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div
            className="glass-premium animate-fade-in-up flex flex-col items-stretch overflow-hidden rounded-2xl sm:flex-row"
            style={{
              boxShadow: '0 0 30px rgba(0,229,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center justify-center px-6 py-6 ${
                  i < STATS.length - 1
                    ? 'border-b border-terminal-border/50 sm:border-b-0 sm:border-r'
                    : ''
                }`}
              >
                <span className="font-mono-nums text-2xl font-bold text-neon-cyan glow-text-cyan">
                  {s.value}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-terminal-muted">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. PRODUCT ECOSYSTEM — PropGuard spans 2 cols
          ══════════════════════════════════════════════════════════ */}
      <section id="ecosystem" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Platform
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            The EdgeRelay Ecosystem
          </h2>
          <p
            className="animate-fade-in-up mt-4 text-center text-slate-400"
            style={{ animationDelay: '60ms' }}
          >
            More than a copier — a complete trading infrastructure
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {ECOSYSTEM.map((item, i) => (
              <div
                key={item.title}
                className={`glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6 ${
                  item.badge === 'LIVE' ? 'glow-cyan' : ''
                } ${i === 0 ? 'border-gradient sm:col-span-2' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#00e5ff30]">
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,#00e5ff15_0%,transparent_70%)]" />
                    <item.icon className="relative z-10 h-6 w-6 text-neon-cyan" />
                  </div>
                  {item.badge === 'LIVE' ? (
                    <span className="chip border border-neon-green/30 bg-neon-green/20 text-neon-green shadow-[0_0_8px_#00ff9d20]">
                      <span className="live-dot mr-0.5" style={{ width: 5, height: 5 }} />
                      LIVE
                    </span>
                  ) : (
                    <span
                      className="chip border border-neon-amber/20 bg-neon-amber/10 text-neon-amber"
                      style={{
                        background:
                          'linear-gradient(90deg, #ffb80010, #ffb80020, #ffb80010)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 4s ease-in-out infinite',
                      }}
                    >
                      COMING SOON
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">
                  {item.title}
                </h3>
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
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Architecture
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up font-display text-3xl font-bold md:text-4xl">
            How It Works
          </h2>

          <div
            className="animate-fade-in-up mt-16 flex flex-col items-center gap-0 md:flex-row md:items-stretch md:justify-center"
            style={{ animationDelay: '100ms' }}
          >
            {/* Master EA Card */}
            <div className="glass flex w-full flex-col items-center justify-center rounded-2xl p-6 md:w-[200px]">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">
                Source
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Master EA</p>
            </div>

            {/* Connector 1 */}
            <div className="relative hidden items-center md:flex">
              <div
                className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30"
                style={{ animation: 'shimmer 3s ease-in-out infinite' }}
              />
              <div
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-right 2s ease-in-out infinite' }}
              />
            </div>
            <div className="relative flex h-10 items-center justify-center md:hidden">
              <div className="h-full w-px border-l-2 border-dashed border-neon-cyan/30" />
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-down 2s ease-in-out infinite' }}
              />
            </div>

            {/* Cloudflare Edge Card */}
            <div className="glow-cyan-strong border-gradient glass z-10 flex w-full flex-col items-center rounded-2xl p-8 md:w-[300px] md:scale-110">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-neon-cyan">
                Edge Network
              </p>
              <p className="mt-1 font-display text-xl font-bold text-white">Cloudflare Edge</p>
              <p className="font-mono-nums mt-0.5 text-sm text-terminal-muted">300+ PoPs</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['HMAC Auth', 'Dedup', 'Equity Guard', 'Lot Sizing'].map((label) => (
                  <span
                    key={label}
                    className="chip border border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Connector 2 */}
            <div className="relative hidden items-center md:flex">
              <div
                className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30"
                style={{ animation: 'shimmer 3s ease-in-out infinite 1s' }}
              />
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
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">
                Destination
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Follower EA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. FEATURES — Alternating layout
          ══════════════════════════════════════════════════════════ */}
      <section id="features" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Capabilities
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Everything You Need
          </h2>

          <div className="mt-14 space-y-6">
            {FEATURES.map((f, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={f.title}
                  className={`glass-premium card-hover-premium animate-fade-in-up flex flex-col items-start gap-6 rounded-2xl p-6 md:flex-row md:items-center ${
                    isEven ? '' : 'md:flex-row-reverse'
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Icon block */}
                  <div
                    className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 ${
                      isEven ? 'md:mr-2' : 'md:ml-2'
                    }`}
                  >
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,#00e5ff15_0%,transparent_70%)]" />
                    <f.icon className="relative z-10 h-7 w-7 text-neon-cyan" />
                  </div>

                  {/* Text */}
                  <div className={isEven ? 'text-left' : 'text-left md:text-right'}>
                    <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-400">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. WHY EDGERELAY — 2x2 grid with large numbers
          ══════════════════════════════════════════════════════════ */}
      <section id="why-edgerelay" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Why Us
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Why Traders Choose EdgeRelay
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Large number */}
                <span className="font-mono-nums text-5xl font-black leading-none text-terminal-border/40">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_20px_#00e5ff25]">
                    <b.icon className="h-5 w-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">{b.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. TESTIMONIALS — Single featured testimonial
          ══════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Traders
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            What Traders Are Saying
          </h2>

          {/* Featured testimonial — the second one (PropGuard story) is most compelling */}
          <div
            className="glass-premium animate-fade-in-up mt-14 rounded-2xl p-8 md:p-12"
            style={{
              animationDelay: '100ms',
              borderLeft: '3px solid var(--color-neon-cyan)',
              boxShadow: '0 0 40px rgba(0,229,255,0.05)',
            }}
          >
            {/* Stars */}
            <div className="mb-6 flex gap-1">
              {[...Array(5)].map((_, si) => (
                <svg
                  key={si}
                  className="h-5 w-5 text-neon-cyan"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="text-xl leading-relaxed text-slate-200 md:text-2xl">
              &ldquo;{TESTIMONIALS[1].quote}&rdquo;
            </blockquote>

            <div className="mt-8 flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neon-cyan/20 bg-neon-cyan/10">
                <span className="font-display text-lg font-bold text-neon-cyan">
                  {TESTIMONIALS[1].name[0]}
                </span>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-white">
                  {TESTIMONIALS[1].name}
                </p>
                <p className="font-mono-nums text-sm text-neon-cyan/70">
                  {TESTIMONIALS[1].context}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary testimonials — smaller, below */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[TESTIMONIALS[0], TESTIMONIALS[2]].map((t, i) => (
              <div
                key={t.name}
                className="glass-premium animate-fade-in-up rounded-xl p-6"
                style={{
                  animationDelay: `${200 + i * 80}ms`,
                  borderLeft: '2px solid var(--color-terminal-border)',
                }}
              >
                <p className="text-sm leading-relaxed text-slate-400">
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
          9. FINAL CTA — Full-width, maximum breathing room
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 md:py-40">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="animate-fade-in-up font-display text-4xl font-bold text-white md:text-5xl">
            Free for All Traders
          </h2>
          <p
            className="animate-fade-in-up mt-6 text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            We&rsquo;re opening EdgeRelay to everyone at no cost during our launch period.
            No credit card required.
          </p>
          <Link
            to="/register"
            className="btn-premium signal-pulse animate-fade-in-up mt-10 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-12 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.4)] transition-all hover:shadow-[0_0_60px_rgba(0,229,255,0.6)]"
            style={{ animationDelay: '160ms' }}
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. FOOTER — Minimal
          ══════════════════════════════════════════════════════════ */}
      <footer className="relative z-10">
        <div className="divider-diamond" />
        <div className="px-6 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <a
                href="#"
                className="flex items-center gap-2 font-display text-lg tracking-tight"
              >
                <span className="font-bold text-white">EDGE</span>
                <span className="logo-shimmer font-bold text-neon-cyan glow-text-cyan">
                  RELAY
                </span>
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

            <div className="flex flex-col items-center gap-2 md:items-end">
              <p className="text-xs text-terminal-muted">
                Built on{' '}
                <span className="font-medium text-orange-400">Cloudflare&rsquo;s</span> edge
                network
              </p>
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span className="font-mono-nums text-[11px] uppercase tracking-widest text-neon-green/80">
                  System Status: Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

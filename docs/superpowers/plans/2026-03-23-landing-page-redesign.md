# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the EdgeRelay landing page with TradeMetrics Pro's section structure, keep Signal Noir cyberpunk visual style, remove pricing, add free launch messaging and product ecosystem showcase.

**Architecture:** Single-page rewrite of `LandingPage.tsx` (~692 lines) with updated data arrays and JSX sections. Additive CSS in `app.css` for 2 new utility classes. No component library, routing, or backend changes.

**Tech Stack:** React 18, Tailwind CSS 4, Lucide React icons, existing Signal Noir design system

**Spec:** `docs/superpowers/specs/2026-03-23-landing-page-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/pages/LandingPage.tsx` | Rewrite | All 10 landing page sections |
| `apps/web/src/app.css` | Append | `.testimonial-card` and `.benefit-card` utility classes |

No other files are touched.

---

## Task 1: Add new CSS utility classes and smooth scrolling to app.css

**Files:**
- Modify: `apps/web/src/app.css` (line 32 for smooth scrolling, append after line 454 for new classes)

- [ ] **Step 1: Add smooth scrolling to the html rule**

In `apps/web/src/app.css`, add `scroll-behavior: smooth;` to the existing `html` rule (around line 32):

```css
html {
  font-family: var(--font-sans);
  background-color: var(--color-terminal-bg);
  color: #c8d6e5;
  font-feature-settings: 'ss01' on, 'cv01' on;
  scroll-behavior: smooth;
}
```

- [ ] **Step 2: Add testimonial-card and benefit-card classes**

Append to end of `apps/web/src/app.css`:

```css
/* ── Testimonial Card ──────────────────────────────────────── */
.testimonial-card {
  position: relative;
  border-left: 2px solid var(--color-neon-cyan);
  padding-left: 24px;
}
.testimonial-card::after {
  content: '\201C';
  position: absolute;
  top: -8px;
  right: 16px;
  font-size: 48px;
  font-family: var(--font-display);
  color: #00e5ff20;
  line-height: 1;
  pointer-events: none;
}

/* ── Benefit Card ──────────────────────────────────────────── */
.benefit-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.benefit-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px -8px #00e5ff10;
}
```

Note: `.testimonial-card` uses `::after` (not `::before`) to avoid conflict with `.glass::before` which renders the holographic border gradient.

- [ ] **Step 2: Verify CSS parses correctly**

Run: `cd apps/web && npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds without CSS errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app.css
git commit -m "style: add testimonial-card and benefit-card CSS utilities"
```

---

## Task 2: Rewrite LandingPage.tsx — Complete file replacement

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx` (full rewrite — replace entire file contents)

This task rewrites the entire file in one atomic operation to avoid broken intermediate states. Use the Write tool to replace the entire file.

- [ ] **Step 1: Write the complete new LandingPage.tsx**

Replace the entire file with the following. The file has 4 parts: imports, data arrays, particles, and the component with all 10 sections.

**Part 1 — Imports and data arrays:**

```tsx
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
```

**Part 2 — Particles constant and component start (Nav + Hero + Stats):**

```tsx
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
```

**Part 3 — Sections 4-6 (Ecosystem + How It Works + Features):**

Continue directly after the Stats section closing `</section>` tag:

```tsx
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
```

Then copy the existing **How It Works** section exactly as-is from the original file (lines 390-463 — the `<section id="how-it-works">` through its closing `</section>`). No changes needed.

Then append the Features Grid:

```tsx
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
```

**Part 4 — Sections 7-10 (Why EdgeRelay + Testimonials + CTA + Footer):**

Continue directly after the Features Grid closing `</section>` tag:

```tsx
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
```

Then the Testimonials section:

```tsx
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
```

Then the Final CTA section:

```tsx
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
```

Then the Footer section and close the component:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx
git commit -m "feat: redesign landing page with ecosystem showcase and free launch messaging"
```

---

## Task 3: Build verification and deploy

**Files:**
- No file changes — verification only

- [ ] **Step 1: TypeScript type check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Vite production build**

Run: `cd apps/web && npx vite build`
Expected: Build succeeds, outputs to `dist/`

- [ ] **Step 3: Verify locally (optional)**

Run: `cd apps/web && npx vite preview`
Expected: Opens local preview, all 10 sections render, no console errors

- [ ] **Step 4: Deploy to Cloudflare Pages**

Run: `cd apps/web && npx wrangler pages deploy dist --project-name edgerelay-web`
Expected: Deploys to `edgerelay-web.pages.dev`

# EdgeRelay Landing Page Redesign

**Date**: 2026-03-23
**Status**: Approved
**Scope**: Redesign `apps/web/src/pages/LandingPage.tsx` — section structure inspired by TradeMetrics Pro, visual style remains "Signal Noir" cyberpunk terminal aesthetic. Remove pricing, add free launch messaging.

---

## Goals

1. Adopt TradeMetrics Pro's structured section flow for better conversion
2. Showcase the EdgeRelay product ecosystem (PropGuard + 3 upcoming products)
3. Remove pricing section — EdgeRelay is free for all users during launch (first 6 months)
4. Replace competitor comparison table with benefit-focused "Why EdgeRelay?" section
5. Add testimonials section (placeholder-ready for launch)
6. Retain the existing Signal Noir cyberpunk visual identity (scan lines, neon glow, noise, Outfit/IBM Plex Mono fonts)

## Non-Goals

- No changes to dashboard, auth, billing, or any other pages
- No changes to existing design tokens or utility classes in `app.css` (additive CSS for new sections is permitted)
- No changes to existing component library (Button, Card, Input, etc.) — new sections use inline Tailwind classes following the current LandingPage pattern
- No backend/API changes

---

## Section Structure (Top to Bottom)

### 1. Nav Header
- Sticky navbar with scroll-triggered glow effect (keep existing)
- Links: Home (`#`), Features (`#features`), How It Works (`#how-it-works`), Ecosystem (`#ecosystem`), Login/Register
- Nav CTA button text: "Get Started Free" (updated from "Get Started" to match free launch messaging)
- Remove dashboard-only links from public nav

### 2. Hero
- **Headline**: "Stop Losing Prop Firm Accounts to Missed Copies"
- **Subtext**: "Edge-native trade copying powered by Cloudflare's global network. Sub-500ms execution, built-in PropGuard protection, zero VPS required."
- **Primary CTA**: "Get Started Free" — cyan gradient button with signal-pulse animation, links to `/register`
- **Secondary CTA**: "See How It Works" — ghost/outline button, smooth-scrolls to How It Works section
- **Background**: Keep ambient glow orbs and subtle particle effects from current design

### 3. Stats Bar
4-column grid positioned tight under the hero:
| Stat | Label |
|------|-------|
| 300+ | Edge Locations |
| 99.9% | Uptime |
| <500ms | Avg Latency |
| Zero | VPS Required |

Style: Keep existing stat card styling (neon cyan numbers, monospace font, subtle glow). Note: labels updated from current values ("PoPs" → "Edge Locations", "Latency" → "Avg Latency") for clarity.

### 4. Product Ecosystem (NEW)
- **Section id**: `ecosystem`
- **Section title**: "The EdgeRelay Ecosystem"
- **Subtitle**: "More than a copier — a complete trading infrastructure"
- **Layout**: 4 cards in responsive grid (`sm:grid-cols-2` on tablet+, stacked on mobile)
- **Card style**: Inline Tailwind `glass` classes (same pattern as existing landing page sections — does NOT import `Card` component)

| Product | Lucide Icon | Description | Badge |
|---------|-------------|-------------|-------|
| PropGuard | `ShieldCheck` | Built-in equity protection for prop firm accounts. Automatic drawdown monitoring, trade blocking, and emergency close. | LIVE |
| AI Trade Journal | `BrainCircuit` | AI-powered MT5 trade journal with native sync. Automatic trade logging, pattern recognition, and performance insights. | COMING SOON |
| Platform Bridge | `Link2` | Cross-platform trade copier. Copy between MT4, MT5, cTrader, and more — one master, any platform. | COMING SOON |
| EA Performance Lab | `FlaskConical` | Cloud-based EA monitoring and backtesting. Real-time performance tracking without running MT5. | COMING SOON |

- "LIVE" badge: inline styled — `bg-neon-green/20 text-neon-green border border-neon-green/30` pill
- "COMING SOON" badge: inline styled — `bg-neon-amber/10 text-neon-amber border border-neon-amber/20` pill
- PropGuard card gets extra `glow-cyan` class for emphasis; others use standard `glass` styling

### 5. How It Works
- Keep existing animated signal flow diagram (Master EA → Cloudflare Edge → Follower EA)
- Keep traveling-dot animation on the signal path
- Restyle section heading to match new heading pattern (consistent with other sections)
- No content changes — this section is strong as-is

### 6. Features Grid
- **Section id**: `features`
- **Layout**: 3x2 grid on desktop (`lg:grid-cols-3 sm:grid-cols-2`), stacked on mobile
- **Card style**: Glass cards with icon, title, description

| Feature | Lucide Icon | Description |
|---------|-------------|-------------|
| Zero VPS | `CloudOff` | No servers to manage. Runs on Cloudflare's edge network — always on, globally distributed. |
| PropGuard Protection | `ShieldCheck` | Built-in equity guard for prop firm accounts. Monitors drawdown and blocks dangerous trades. |
| Never Miss a Trade | `WifiOff` | Offline queue with auto-retry and crash recovery. Signals wait on the edge until your EA reconnects. |
| Smart Lot Sizing | `Calculator` | Mirror, fixed, multiplier, or risk-percent modes. Each follower sizes independently. |
| Symbol Mapping | `ArrowLeftRight` | Auto-suffix and custom symbol mappings. EURUSD on master → EURUSD.m on follower, automatically. |
| Real-time Dashboard | `Monitor` | Live signal log, latency stats, account monitoring. See every trade as it copies. |

### 7. Why EdgeRelay? (NEW — replaces competitor table)
- **Section id**: `why-edgerelay`
- **Section title**: "Why Traders Choose EdgeRelay"
- **Layout**: 4 horizontal benefit cards, stacked vertically with icon on left, text on right

| Benefit | Lucide Icon | Description |
|---------|-------------|-------------|
| Built for Prop Firms | `ShieldAlert` | PropGuard monitors your drawdown in real-time and blocks trades that would breach your funded account rules. |
| Edge Speed, Not Server Speed | `Zap` | Your signals travel through Cloudflare's 300+ PoPs, not a single VPS in Virginia. Closest edge = fastest copy. |
| Zero Infrastructure | `PackageOpen` | No VPS to rent, no MT5 to keep running, no port forwarding. Install the EA, connect, done. |
| Crash-Proof Delivery | `HardDriveDownload` | Signals queue on the edge when your follower is offline. Reconnect and they execute in order. Nothing lost. |

### 8. Testimonials (NEW)
- **Section id**: `testimonials`
- **Section title**: "What Traders Are Saying"
- **Layout**: 3 testimonial cards in a row (`lg:grid-cols-3`, stacked on mobile)
- **Card content**: Quote text, name, role/context, decorative quote marks
- **Style**: Glass card with `border-l-2 border-neon-cyan` left accent and large `"` decorative quote mark

**Placeholder content:**

| # | Quote | Name | Context |
|---|-------|------|---------|
| 1 | "EdgeRelay replaced my VPS setup entirely. Signals hit my 6 funded accounts faster than my old copier handled one." | Alex M. | Managing 6 FTMO accounts |
| 2 | "PropGuard saved me twice in one week. It blocked trades that would have breached my drawdown limit on a $200k account." | Sarah K. | Running 3 funded challenges |
| 3 | "Setup took 10 minutes. No VPS, no port forwarding, no headaches. Just install the EA and it works." | David R. | Prop firm trader |

### 9. Final CTA (Updated)
- **Headline**: "Free for All Traders"
- **Subtext**: "We're opening EdgeRelay to everyone at no cost during our launch period. No credit card required."
- **CTA Button**: "Get Started Free" — links to `/register`
- **Background**: Subtle gradient wash with glow orb (keep existing CTA section background treatment)
- No countdown timer, no plan cards, no pricing details

### 10. Footer
- Keep existing footer structure and styling
- Update links to match new nav (Home, Features, How It Works, Ecosystem)
- Keep Cloudflare attribution and copyright
- Keep social links if present

---

## Visual Style

**Retained from current design (Signal Noir):**
- Dark terminal backgrounds: `#05080d`, `#0a0f16`, `#0d1219`
- Neon cyan primary: `#00e5ff` with glow effects
- Neon green (success): `#00ff9d`
- Neon amber (warning): `#ffb800`
- Typography: Outfit (display), IBM Plex Mono (monospace)
- Glassmorphism cards with `backdrop-filter: blur(16px)`
- CRT scan line overlay
- Noise texture
- All existing keyframe animations (fade-in-up, pulse-glow, signal-pulse, scan-line, float, travel-right, travel-down, etc.)
- Glow classes (`.glow-cyan`, `.glow-text-cyan`)

**New styles needed (additive only — existing styles untouched):**
- `.testimonial-card` — glass card with `border-l-2 border-neon-cyan`, decorative quote mark positioning
- `.benefit-card` — horizontal flex layout (icon left, text right) with hover glow transition
- Badge styles are inline Tailwind classes (no new CSS classes needed)

**Smooth scrolling:** Already handled by existing `scroll-behavior: smooth` on the page. Hero secondary CTA uses `href="#how-it-works"` anchor pattern.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/src/pages/LandingPage.tsx` | Full rewrite — new section structure, content, and layout |
| `apps/web/src/app.css` | Add badge, testimonial, benefit card styles (~30 lines) |

**No other files are modified.**

---

## Removed from Current Landing Page

- Pricing section (4 plan cards: Starter $19, Pro $49, Unlimited $99, Signal Provider $149)
- Competitor comparison table (EdgeRelay vs STT, Duplikium, FXBlue, TC)
- Problem/Solution red/cyan cards section
- Any reference to paid plans or pricing

## Added

- Product Ecosystem section (4 cards with LIVE/COMING SOON badges)
- Why EdgeRelay benefit callouts (4 horizontal cards)
- Testimonials section (3 placeholder cards)
- "Free for all users" messaging in final CTA
- Updated hero headline targeting prop firm traders

# Light/Dark Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark mode toggle that seamlessly switches the entire TradeMetrics Pro site between "Signal Noir" dark theme and "Frosted Glass Light" theme, persisted in localStorage.

**Architecture:** CSS variable swapping via `html.light` class. All existing components already reference CSS variables through Tailwind classes — swapping the variables swaps everything. A `useTheme` hook manages state + localStorage. Flash prevention via inline script in index.html.

**Tech Stack:** Tailwind CSS 4 (`@theme`), CSS custom properties, React 18, localStorage

**Spec:** `docs/superpowers/specs/2026-03-27-light-dark-mode-design.md`

---

## File Structure

### Create
| File | Responsibility |
|------|---------------|
| `apps/web/src/hooks/useTheme.ts` | Theme state hook (localStorage + html class toggle) |
| `apps/web/src/components/ui/ThemeToggle.tsx` | Sun/Moon icon toggle button |

### Modify
| File | Change |
|------|--------|
| `apps/web/src/app.css` | Add `--color-terminal-text` to @theme, add `html.light` overrides, light glass/glow variants |
| `apps/web/index.html` | Add flash prevention script in `<head>` |
| `apps/web/src/pages/DashboardPage.tsx` | Add ThemeToggle to header |
| `apps/web/src/pages/LandingPage.tsx` | Add ThemeToggle to nav header |

---

### Task 1: CSS Light Mode Variables + Effects

**Files:**
- Modify: `apps/web/src/app.css`

- [ ] **Step 1: Add `--color-terminal-text` to the `@theme` block**

Read `apps/web/src/app.css` and find the `@theme` block. Add this new variable alongside the existing terminal colors:

```css
--color-terminal-text: #c8d6e5;
```

Then find the `html` base styles and add:
```css
color: var(--color-terminal-text);
```

- [ ] **Step 2: Add the `html.light` variable overrides**

After the `@theme` block (outside it — this is a regular CSS rule, not a theme declaration), add:

```css
/* ── Light Mode ("Frosted Glass Light") ─────────────────────────── */
html.light {
  --color-terminal-bg: #f8fafc;
  --color-terminal-surface: #ffffff;
  --color-terminal-card: #f1f5f9;
  --color-terminal-border: #e2e8f0;
  --color-terminal-border-hover: #cbd5e1;
  --color-terminal-muted: #94a3b8;
  --color-terminal-text: #1e293b;

  --color-neon-cyan: #0891b2;
  --color-neon-cyan-dim: #0891b215;
  --color-neon-green: #059669;
  --color-neon-green-dim: #05966915;
  --color-neon-amber: #d97706;
  --color-neon-amber-dim: #d9770615;
  --color-neon-red: #dc2626;
  --color-neon-red-dim: #dc262615;
  --color-neon-purple: #7c3aed;
  --color-neon-purple-dim: #7c3aed15;
}
```

- [ ] **Step 3: Add light mode effect overrides**

After the `html.light` color block, add overrides for glass, glows, and atmospheric effects:

```css
/* Light mode glass */
html.light .glass {
  background: rgba(255, 255, 255, 0.7) !important;
  border-color: rgba(0, 0, 0, 0.06) !important;
  backdrop-filter: blur(16px) saturate(120%);
}

html.light .glass-premium {
  background: rgba(255, 255, 255, 0.8) !important;
  border-color: rgba(0, 0, 0, 0.08) !important;
}

/* Light mode glows — soften to subtle shadows */
html.light .glow-cyan,
html.light .glow-cyan-strong {
  box-shadow: 0 2px 8px rgba(8, 145, 178, 0.1);
}

html.light .glow-green {
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);
}

html.light .glow-red {
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
}

html.light .glow-text-cyan,
html.light .glow-text-green,
html.light .glow-text-red {
  text-shadow: none;
}

/* Light mode border gradient */
html.light .border-gradient {
  border-image: none;
  border-color: #e2e8f0;
}

/* Light mode atmospheric effects — hide */
html.light .ambient-glow,
html.light .noise-overlay,
html.light .scan-line {
  opacity: 0;
  pointer-events: none;
}

html.light .bg-grid,
html.light .bg-grid-dense {
  opacity: 0.03;
}

/* Light mode text overrides for white text that won't auto-swap */
html.light .text-white {
  color: #1e293b;
}

html.light .text-slate-200,
html.light .text-slate-300 {
  color: #334155;
}

html.light .text-slate-400 {
  color: #64748b;
}

/* Light mode sidebar */
html.light .data-stream-bg {
  opacity: 0.02;
}

/* Light mode card hover */
html.light .card-hover:hover,
html.light .card-hover-premium:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Light mode focus ring */
html.light .focus-ring:focus-visible {
  box-shadow: 0 0 0 2px var(--color-neon-cyan), 0 0 8px rgba(8, 145, 178, 0.15);
}

/* Light mode dividers */
html.light .divider {
  background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
}

/* Light mode data rows */
html.light .data-row:hover {
  background: rgba(8, 145, 178, 0.04);
}

/* Light mode scrollbar */
html.light ::-webkit-scrollbar-track {
  background: #f1f5f9;
}
html.light ::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}
html.light ::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app.css
git commit -m "feat(theme): add light mode CSS variable overrides and effect adjustments"
```

---

### Task 2: Theme Hook + Toggle Component + Flash Prevention

**Files:**
- Create: `apps/web/src/hooks/useTheme.ts`
- Create: `apps/web/src/components/ui/ThemeToggle.tsx`
- Modify: `apps/web/index.html`

- [ ] **Step 1: Create the useTheme hook**

```typescript
// apps/web/src/hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Read from DOM class (set by inline script in index.html)
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
```

- [ ] **Step 2: Create the ThemeToggle component**

```tsx
// apps/web/src/components/ui/ThemeToggle.tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`group relative flex items-center justify-center rounded-xl p-2 transition-all duration-200 hover:bg-neon-cyan/10 focus-ring ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-terminal-muted group-hover:text-neon-cyan transition-colors" />
      ) : (
        <Moon size={16} className="text-terminal-muted group-hover:text-neon-cyan transition-colors" />
      )}
    </button>
  );
}
```

- [ ] **Step 3: Add flash prevention script to index.html**

Read `apps/web/index.html`. In the `<head>` section, add this inline script BEFORE any CSS or JS:

```html
<script>
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light');
  }
</script>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useTheme.ts apps/web/src/components/ui/ThemeToggle.tsx apps/web/index.html
git commit -m "feat(theme): add useTheme hook, ThemeToggle component, and flash prevention"
```

---

### Task 3: Dashboard + Landing Page Integration

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx`
- Modify: `apps/web/src/pages/LandingPage.tsx`

- [ ] **Step 1: Add ThemeToggle to DashboardPage header**

Read `apps/web/src/pages/DashboardPage.tsx`. Find the header area that shows the greeting ("Good Morning, OH") and the UTC clock. Add the ThemeToggle next to the clock.

Add import:
```typescript
import { ThemeToggle } from '@/components/ui/ThemeToggle';
```

Place `<ThemeToggle />` in the top-right area, next to or before the clock display. Look for the flex container in the header and add it as a sibling.

- [ ] **Step 2: Add ThemeToggle to LandingPage nav**

Read `apps/web/src/pages/LandingPage.tsx`. Find the navigation header (the sticky nav with the logo and Login/Get Started buttons). Add the ThemeToggle next to the nav buttons.

Add import:
```typescript
import { ThemeToggle } from '@/components/ui/ThemeToggle';
```

Place `<ThemeToggle />` before the Login button in the nav flex container.

- [ ] **Step 3: Build and verify**

```bash
cd apps/web && npx vite build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx apps/web/src/pages/LandingPage.tsx
git commit -m "feat(theme): add light/dark toggle to dashboard and landing page headers"
```

---

### Task 4: Hardcoded Color Audit + Fix

**Files:**
- Audit and fix hardcoded colors in multiple files

- [ ] **Step 1: Search for hardcoded dark colors**

Search across `apps/web/src/` for common hardcoded dark hex values that won't respond to the theme toggle:

```bash
grep -rn "bg-\[#0d" apps/web/src/ --include="*.tsx"
grep -rn "bg-\[#0a" apps/web/src/ --include="*.tsx"
grep -rn "bg-\[#05" apps/web/src/ --include="*.tsx"
grep -rn "bg-\[#08" apps/web/src/ --include="*.tsx"
grep -rn 'background.*#0[0-9a-f]' apps/web/src/ --include="*.tsx"
grep -rn 'color.*#fff' apps/web/src/ --include="*.tsx"
```

- [ ] **Step 2: Replace hardcoded backgrounds with CSS variable equivalents**

For each occurrence found:
- `bg-[#0d1520]` or similar dark card backgrounds → replace with `bg-terminal-card`
- `bg-[#080d14]` or similar deep backgrounds → replace with `bg-terminal-surface`
- `bg-[#0a0f16]` → replace with `bg-terminal-surface`
- `style={{ background: '#0d1520' }}` → replace with `className="bg-terminal-card"`
- `style={{ color: '#fff' }}` → replace with `className="text-terminal-text"` or remove if parent handles it

Focus on these files (most likely to have hardcoded colors):
- `apps/web/src/components/dashboard/TelegramBanner.tsx`
- `apps/web/src/components/dashboard/MarketHoursWidget.tsx`
- `apps/web/src/components/dashboard/MarketIntelWidget.tsx`
- `apps/web/src/components/layout/AppLayout.tsx`
- `apps/web/src/pages/SettingsPage.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/components/AuthModal.tsx`

**Do NOT change:**
- Telegram blue (`#0088cc`) — this is brand color, same in both modes
- Hardcoded colors inside SVG charts (HealthGauge, EquityCurve) — these need their own handling
- External link/button colors that should remain fixed

- [ ] **Step 3: Build and verify**

```bash
cd apps/web && npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "fix(theme): replace hardcoded hex colors with CSS variable equivalents"
```

---

### Task 5: Deploy + Verify

- [ ] **Step 1: Build and deploy**

```bash
cd apps/web && npx vite build && npx wrangler pages deploy dist --project-name edgerelay-web
```

- [ ] **Step 2: Verify**

1. Open trademetricspro.com → should load in dark mode (default)
2. Click the sun icon in the header → should switch to light mode
3. Verify: dashboard stats, market hours, market intel, sidebar, all readable
4. Navigate to Settings → verify cards and toggles look correct
5. Refresh the page → should stay in light mode (localStorage)
6. Toggle back to dark → verify everything returns to normal
7. Open landing page → verify toggle works there too
8. Check the auth modal → verify it looks correct in both modes

- [ ] **Step 3: Final commit**

```bash
git add apps/web/ && git commit -m "feat(theme): deploy light/dark mode toggle"
```

# Light/Dark Mode Toggle — Design Spec

## Goal

Add a light/dark mode toggle to TradeMetrics Pro that seamlessly switches the entire site between the existing "Signal Noir" dark theme and a new "Frosted Glass Light" theme. Persists preference in localStorage. Toggle accessible from the dashboard header and landing page header.

## Architecture

CSS variable swapping on `<html>` element. The existing `@theme` block defines dark mode values. A `html.light` class overrides those same CSS custom properties with light values. Since all components already reference CSS variables via Tailwind classes (`bg-terminal-bg`, `text-neon-cyan`, etc.), the entire UI swaps automatically. Only glass effects, glow shadows, and hardcoded colors need manual attention.

**Tech Stack:** Tailwind CSS 4, CSS custom properties, React hook + localStorage, zero backend changes.

---

## 1. Light Mode Color Palette ("Frosted Glass Light")

### CSS Variable Overrides

First, add `--color-terminal-text` to the dark `@theme` block:
```css
--color-terminal-text: #c8d6e5;
```

And set `color: var(--color-terminal-text)` on `html` as the base text color.

Then the light overrides:
```css
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

Design principle: neon colors are deepened for AA contrast on light backgrounds (cyan #0891b2 on white = 4.5:1 ratio). Same hue families, stronger saturation.

### SVG Icons

Lucide icons use `currentColor` by default — they inherit text color automatically. No special handling needed. Any inline SVGs with hardcoded `stroke`/`fill` should be changed to `currentColor`.

---

## 2. Theme Hook (`useTheme`)

```typescript
// apps/web/src/hooks/useTheme.ts

function useTheme(): { theme: 'dark' | 'light'; toggle: () => void }
```

- On mount: reads `localStorage.getItem('theme')`. If `'light'`, adds `html.light` class. Otherwise defaults to dark.
- `toggle()`: switches class on `<html>`, saves to localStorage.
- No system preference detection (YAGNI — user explicitly chooses).

---

## 3. Theme Toggle Component

```typescript
// apps/web/src/components/ui/ThemeToggle.tsx
```

- Icon button: Sun icon (in dark mode, clicking switches to light) / Moon icon (in light mode, clicking switches to dark)
- Uses `useTheme()` hook
- Styled to match surrounding context (glass card style in dashboard header, transparent in landing nav)
- Smooth icon transition via CSS

---

## 4. Toggle Placements

### Dashboard Header (DashboardPage.tsx)

In the top-right area next to the live UTC clock. Small icon button.

### Landing Page Header (LandingPage.tsx)

In the navigation bar next to the Login / Get Started buttons. Small icon button.

---

## 5. CSS Adjustments Needed

### Glass Effects

`.glass` and `.glass-premium` use hardcoded dark RGBA backgrounds. Add light variants:

```css
html.light .glass {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 0, 0, 0.06);
}

html.light .glass-premium {
  background: rgba(255, 255, 255, 0.8);
}
```

### Glow Shadows

Reduce/remove neon glows in light mode — they look wrong on light backgrounds:

```css
html.light .glow-cyan { box-shadow: 0 2px 8px rgba(8, 145, 178, 0.1); }
html.light .glow-text-cyan { text-shadow: none; }
```

### Gradient Borders

The `.border-gradient` class uses a dark-to-cyan gradient. In light mode, use a subtle gray-to-cyan:

```css
html.light .border-gradient {
  border-image: linear-gradient(135deg, #e2e8f0, #0891b230) 1;
}
```

### Ambient Effects

Disable or soften `.ambient-glow`, `.noise-overlay`, `.scan-line`, `.bg-grid` in light mode — these are dark-mode atmospheric effects:

```css
html.light .ambient-glow,
html.light .noise-overlay,
html.light .scan-line { opacity: 0; pointer-events: none; }

html.light .bg-grid { opacity: 0.03; }
```

### Sidebar

The sidebar uses hardcoded dark colors. Override in light mode:

```css
html.light aside,
html.light [data-sidebar] {
  background: #ffffff;
  border-color: #e2e8f0;
}
```

### Hardcoded Inline Colors

Some components use inline `style={{ background: '#0d1520' }}` or `bg-[#0d1520]`. These won't respond to the toggle. Common occurrences to fix:
- Stat cards in DashboardPage
- Telegram banner background
- Settings cards
- Auth modal background

Replace with CSS variable equivalents: `bg-terminal-card` instead of `bg-[#0d1520]`.

---

## 6. Files to Create/Modify

### Create
| File | Purpose |
|------|---------|
| `apps/web/src/hooks/useTheme.ts` | Theme state hook (localStorage + class toggle) |
| `apps/web/src/components/ui/ThemeToggle.tsx` | Sun/Moon icon toggle button |

### Modify
| File | Change |
|------|--------|
| `apps/web/src/app.css` | Add `html.light` variable overrides, light glass/glow/effect variants, base text color variable |
| `apps/web/src/pages/DashboardPage.tsx` | Add ThemeToggle to header area |
| `apps/web/src/pages/LandingPage.tsx` | Add ThemeToggle to nav header |

### Audit for hardcoded colors
These files may need `bg-[#hex]` → `bg-terminal-*` replacements:
- `apps/web/src/components/dashboard/TelegramBanner.tsx`
- `apps/web/src/components/dashboard/MarketHoursWidget.tsx`
- `apps/web/src/components/dashboard/MarketIntelWidget.tsx`
- `apps/web/src/components/layout/AppLayout.tsx`
- `apps/web/src/pages/SettingsPage.tsx`
- `apps/web/src/components/AuthModal.tsx`

---

## 7. Persistence

- Key: `localStorage.getItem('theme')`
- Values: `'dark'` | `'light'`
- Default: `'dark'` (no key = dark mode)
- Applied immediately on page load via the `useTheme` hook to prevent flash of wrong theme

### Flash Prevention

Add a small inline script in `index.html` `<head>` that runs before React:

```html
<script>
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light');
  }
</script>
```

This prevents a flash of dark mode when the user has selected light.

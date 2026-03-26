# Command Center Dashboard UI — Design Spec

**Date**: 2026-03-26
**Status**: Approved
**Scope**: Sub-project 2 of the Prop Firm Command Center. React dashboard page showing account health traffic lights, firm template linking, and warnings.

---

## Goals

1. Visualize all accounts' health status with traffic-light system (SAFE/CAUTION/DANGER)
2. Show health score gauges, per-metric breakdowns, and warnings per account
3. Allow users to link accounts to firm templates via a modal selector
4. Show aggregate status banner across all accounts
5. Match existing Signal Noir / Command Center design aesthetic

## Non-Goals

- No payout calendar (separate feature)
- No safe-to-trade calculator (separate feature)
- No MetaApi integration
- No changes to API endpoints (already built)
- No changes to workers or EAs

---

## Page: CommandCenterPage.tsx

**Route**: `/command-center`

### Layout (vertical stack)

**Section 1 — Header**
- Title: "Command Center"
- Subtitle: "Prop firm account health at a glance"

**Section 2 — Overall Status Banner**
- Single `glass-premium` card showing aggregate status
- Count of accounts by status: "3 SAFE · 1 CAUTION · 0 DANGER"
- Color-coded dots (green/amber/red) next to each count
- If any account is DANGER: banner gets red glow border
- If all SAFE: banner gets green glow
- Shows total accounts monitored

**Section 3 — Account Health Cards**
- Grid layout: `md:grid-cols-2 lg:grid-cols-3`
- One card per account that has a linked firm template
- Each card (`glass-premium card-hover-premium`) shows:
  - Header: Account alias + StatusDot (connected/offline)
  - Firm badge: firm_name + plan_name as chips
  - Health gauge: SVG circular ring with score (0-100) centered
  - Traffic light badge: SAFE (green chip) / CAUTION (amber chip) / DANGER (red chip + glow)
  - Three mini progress bars:
    - Daily Loss: used% of limit (skip if null — e.g., Apex)
    - Drawdown: used% of limit
    - Profit Target: progress% toward target (skip if funded — no target)
  - Warnings: list of warning strings in amber/red text
  - Each bar: label left, percentage right, colored bar (green <60%, amber 60-80%, red >80%)

**Section 4 — Unlinked Accounts**
- Section header: "Unlinked Accounts" with count
- Cards for accounts WITHOUT `firm_template_id` in prop_rules
- Each card shows: alias, broker_name, "Link to Firm" button
- Button opens FirmLinkModal
- If no unlinked accounts: section hidden

**Section 5 — FirmLinkModal**
- Modal component (uses existing `Modal` from `components/ui/Modal`)
- Three-step flow:
  1. Select firm: list of firm names from `GET /v1/firms` as clickable cards
  2. Select plan: after firm selected, show plans from `GET /v1/firms/:firmName/templates` with key rules visible (daily loss %, max DD %, profit target, DD type)
  3. Confirm: show selected template summary, "Link Account" button
- On confirm: calls `POST /v1/command/link/:accountId` with `{ template_id }`
- On success: refresh health data, close modal

### useEffect Behavior
- On mount: fetch accounts (from existing accounts store), fetch health data
- On link success: re-fetch health data to show newly linked account

---

## Zustand Store: commandCenter.ts

```typescript
interface FirmListItem {
  firm_name: string;
  plan_count: number;
}

interface AccountHealthResult {
  account_id: string;
  alias: string;
  firm_name: string;
  plan_name: string;
  health: AccountHealth;
}

interface CommandCenterState {
  healthResults: AccountHealthResult[];
  firms: FirmListItem[];
  firmTemplates: any[];  // FirmTemplate rows for selected firm
  isLoading: boolean;
  error: string | null;
  selectedFirm: string | null;

  fetchHealth: () => Promise<void>;
  fetchFirms: () => Promise<void>;
  fetchFirmTemplates: (firmName: string) => Promise<void>;
  linkAccount: (accountId: string, templateId: string) => Promise<boolean>;
  reset: () => void;
}
```

API calls:
- `GET /v1/command/health` → `fetchHealth` (protected, JWT)
- `GET /v1/firms` → `fetchFirms` (public, no auth needed but api client sends token anyway)
- `GET /v1/firms/:firmName/templates` → `fetchFirmTemplates`
- `POST /v1/command/link/:accountId` → `linkAccount`

---

## SVG Health Gauge Component: HealthGauge.tsx

Props:
```typescript
interface HealthGaugeProps {
  score: number;        // 0-100
  status: 'safe' | 'caution' | 'danger';
  size?: number;        // default 100
}
```

Implementation:
- SVG with `viewBox="0 0 100 100"`, responsive width
- Background circle: `stroke="#151d28"`, strokeWidth 8
- Foreground arc: stroke color based on status (green/amber/red), strokeWidth 8
- `stroke-dasharray` = `circumference * (score/100)` for partial arc
- `stroke-linecap="round"` for rounded ends
- SVG glow filter matching status color
- Score number centered: large `font-mono-nums` text
- "/ 100" small text below score

---

## Routing + Navigation

### main.tsx
Add route inside ProtectedRoute:
```tsx
<Route path="/command-center" element={<CommandCenterPage />} />
```

### AppLayout.tsx
Add to navItems array (after Dashboard, before Accounts):
```typescript
{ label: 'Command Center', icon: Shield, to: '/command-center' },
```

Import `Shield` from lucide-react.

---

## UI States

### Loading
- Status banner: skeleton
- Health cards: 3 skeleton cards
- Use existing `.skeleton` class

### Empty (no accounts)
- "No accounts yet" with link to Accounts page

### No linked accounts
- All accounts appear in "Unlinked Accounts" section with prompt to link

### Error
- Glass card with `text-neon-red` error message + retry button

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/stores/commandCenter.ts` | Create | Zustand store for health data, firms, linking |
| `apps/web/src/components/command/HealthGauge.tsx` | Create | SVG circular score gauge |
| `apps/web/src/components/command/FirmLinkModal.tsx` | Create | Three-step firm template selector modal |
| `apps/web/src/pages/CommandCenterPage.tsx` | Create | Main command center page |
| `apps/web/src/main.tsx` | Modify | Add /command-center route |
| `apps/web/src/components/layout/AppLayout.tsx` | Modify | Add Command Center to sidebar nav |

**No changes to:** API endpoints, workers, shared types, EA files.

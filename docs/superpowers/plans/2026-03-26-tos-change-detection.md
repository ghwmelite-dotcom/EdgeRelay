# TOS Change Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cron-triggered Cloudflare Worker that monitors prop firm rules pages every 6 hours, detects changes, stores diffs in D1 and snapshots in R2, and exposes change history via API.

**Architecture:** New `tos-monitor` worker with cron trigger fetches firm URLs, extracts content via HTMLRewriter/text stripping, diffs against previous R2 snapshot, stores changes in D1 `tos_changes` table. API endpoints on api-gateway serve change history publicly.

**Tech Stack:** Cloudflare Workers (cron triggers), HTMLRewriter, D1, R2, Hono (API)

**Spec:** `docs/superpowers/specs/2026-03-26-tos-change-detection-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `migrations/0009_tos_changes.sql` | Create | tos_changes table + firm_templates URL columns + seed URLs |
| `workers/tos-monitor/package.json` | Create | Dependencies |
| `workers/tos-monitor/tsconfig.json` | Create | TypeScript config |
| `workers/tos-monitor/wrangler.toml` | Create | Worker config with cron, D1 + R2 bindings |
| `workers/tos-monitor/src/types.ts` | Create | Env type |
| `workers/tos-monitor/src/index.ts` | Create | Main cron handler |
| `workers/api-gateway/src/routes/tos.ts` | Create | TOS changes API endpoints |
| `workers/api-gateway/src/index.ts` | Modify | Mount TOS routes |

---

## Task 1: D1 Migration

**Files:**
- Create: `migrations/0009_tos_changes.sql`

- [ ] **Step 1: Create migration file**

```sql
-- TOS change detection records
CREATE TABLE tos_changes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  firm_name TEXT NOT NULL,
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  page_url TEXT NOT NULL,
  diff_summary TEXT NOT NULL,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  snapshot_key TEXT NOT NULL,
  previous_snapshot_key TEXT,
  severity TEXT DEFAULT 'unknown'
    CHECK(severity IN ('minor','moderate','major','unknown')),
  reviewed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_tos_changes_firm ON tos_changes(firm_name, detected_at);
CREATE INDEX idx_tos_changes_severity ON tos_changes(severity);

-- Extend firm_templates with monitoring fields
ALTER TABLE firm_templates ADD COLUMN rules_page_url TEXT;
ALTER TABLE firm_templates ADD COLUMN rules_page_selector TEXT;

-- Seed URLs for top 5 firms (one per firm, using MIN rowid to pick one row)
UPDATE firm_templates SET rules_page_url = 'https://ftmo.com/en/trading-objectives/', rules_page_selector = '.entry-content' WHERE id IN (SELECT id FROM firm_templates WHERE firm_name = 'FTMO' ORDER BY rowid LIMIT 1);

UPDATE firm_templates SET rules_page_url = 'https://fundednext.com/trading-rules/', rules_page_selector = 'main' WHERE id IN (SELECT id FROM firm_templates WHERE firm_name = 'FundedNext' ORDER BY rowid LIMIT 1);

UPDATE firm_templates SET rules_page_url = 'https://the5ers.com/trading-objectives/', rules_page_selector = 'main' WHERE id IN (SELECT id FROM firm_templates WHERE firm_name = 'The5ers' ORDER BY rowid LIMIT 1);

UPDATE firm_templates SET rules_page_url = 'https://myfundedfx.com/trading-rules/', rules_page_selector = 'main' WHERE id IN (SELECT id FROM firm_templates WHERE firm_name = 'MyFundedFX' ORDER BY rowid LIMIT 1);

UPDATE firm_templates SET rules_page_url = 'https://apextraderfunding.com/faq/', rules_page_selector = 'main' WHERE id IN (SELECT id FROM firm_templates WHERE firm_name = 'Apex Trader Funding' ORDER BY rowid LIMIT 1);
```

- [ ] **Step 2: Apply migration**

Run: `cd workers/api-gateway && npx wrangler d1 migrations apply edgerelay-db --remote`

- [ ] **Step 3: Verify**

```bash
npx wrangler d1 execute edgerelay-db --remote --command "SELECT firm_name, rules_page_url FROM firm_templates WHERE rules_page_url IS NOT NULL"
```
Expected: 5 rows with URLs.

- [ ] **Step 4: Commit**

```bash
git add migrations/0009_tos_changes.sql
git commit -m "feat(tos-monitor): add tos_changes table and firm rules page URLs"
```

---

## Task 2: TOS Monitor Worker — Scaffold

**Files:**
- Create: `workers/tos-monitor/package.json`
- Create: `workers/tos-monitor/tsconfig.json`
- Create: `workers/tos-monitor/wrangler.toml`
- Create: `workers/tos-monitor/src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "edgerelay-tos-monitor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "edgerelay-tos-monitor"
main = "src/index.ts"
compatibility_date = "2024-12-30"

[triggers]
crons = ["0 */6 * * *"]

[[d1_databases]]
binding = "DB"
database_name = "edgerelay-db"
database_id = "8a0eb54a-7072-40fd-8a34-22c6fb3471e0"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "edgerelay-storage"
```

- [ ] **Step 4: Create types.ts**

```typescript
export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd workers/tos-monitor && pnpm install`

- [ ] **Step 6: Commit**

```bash
git add workers/tos-monitor/package.json workers/tos-monitor/tsconfig.json workers/tos-monitor/wrangler.toml workers/tos-monitor/src/types.ts
git commit -m "feat(tos-monitor): scaffold tos-monitor worker with cron config"
```

---

## Task 3: TOS Monitor Worker — Main Logic

**Files:**
- Create: `workers/tos-monitor/src/index.ts`

- [ ] **Step 1: Create the cron handler**

The worker exports a `scheduled` handler (not `fetch`). On each cron trigger:

1. Query D1 for firms to monitor:
```sql
SELECT DISTINCT firm_name, rules_page_url, rules_page_selector
FROM firm_templates
WHERE rules_page_url IS NOT NULL
```

2. For each firm, call `checkFirm(env, firm)`:
   a. `fetch(rules_page_url)` with a 10-second timeout and User-Agent header
   b. Extract content:
      - If `rules_page_selector`: use HTMLRewriter with a `TextCollector` class that accumulates text from the matching selector
      - If null: strip tags from body (regex: remove script/style blocks, then all tags, collapse whitespace)
   c. Get previous snapshot from R2: `env.STORAGE.get('tos/' + slugify(firm_name) + '/latest.txt')`
   d. If no previous snapshot: store current as baseline, skip diff
   e. Compare current vs previous text
   f. If changed:
      - Compute diff: split into lines, find added (in current not in previous) and removed (in previous not in current)
      - Classify severity by keyword matching on changed lines
      - Store full HTML in R2: `tos/{slug}/{timestamp}.html`
      - Update latest.txt in R2
      - Insert `tos_changes` record in D1

3. Log summary

Helper functions:
- `slugify(name: string): string` — lowercase, replace spaces with hyphens, remove non-alphanumeric
- `classifySeverity(addedLines: string[], removedLines: string[]): string` — keyword matching
- `computeDiff(prev: string, curr: string): { added: string[], removed: string[], summary: string }`
- `extractWithSelector(response: Response, selector: string): Promise<string>` — HTMLRewriter
- `extractFullText(html: string): string` — strip tags

Export:
```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) { ... }
};
```

Error handling: wrap each firm check in try-catch. Log errors but continue with remaining firms. Never let one firm's failure stop the entire run.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd workers/tos-monitor && npx tsc --noEmit`

- [ ] **Step 3: Deploy**

Run: `cd workers/tos-monitor && npx wrangler deploy`

- [ ] **Step 4: Test manually**

Run: `cd workers/tos-monitor && npx wrangler dev` then `curl http://localhost:8787/__scheduled`

This triggers the cron handler locally. Check logs for "Checked N firms" output.

- [ ] **Step 5: Commit**

```bash
git add workers/tos-monitor/src/index.ts
git commit -m "feat(tos-monitor): implement cron handler — fetch, extract, diff, store"
```

---

## Task 4: TOS Changes API

**Files:**
- Create: `workers/api-gateway/src/routes/tos.ts`
- Modify: `workers/api-gateway/src/index.ts`

- [ ] **Step 1: Create TOS routes**

Hono router with 2 public endpoints:

**`GET /`** — List recent TOS changes. Query params: `firm_name`, `severity`, `limit` (default 20, max 100), `cursor`.

```typescript
// Build dynamic WHERE
// Query: SELECT * FROM tos_changes WHERE ... ORDER BY detected_at DESC LIMIT ?
// Cursor-based pagination on detected_at
// Return { data: { changes: [...], has_more } }
```

**`GET /:firmName`** — Changes for a specific firm. Same query with `WHERE firm_name = ?`.

Follow the exact pattern from `routes/journal.ts` for dynamic WHERE building and cursor pagination.

- [ ] **Step 2: Mount on public app in index.ts**

Add import:
```typescript
import { tos } from './routes/tos.js';
```

Mount as public (after firms):
```typescript
app.route('/v1/tos', tos);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd workers/api-gateway && npx tsc --noEmit`

- [ ] **Step 4: Deploy api-gateway**

Run: `cd workers/api-gateway && npx wrangler deploy`

- [ ] **Step 5: Verify endpoint**

```bash
curl https://edgerelay-api.ghwmelite.workers.dev/v1/tos/changes
```
Expected: `{ "data": { "changes": [], "has_more": false } }` (empty until first cron run detects a change)

- [ ] **Step 6: Commit and push**

```bash
git add workers/api-gateway/src/routes/tos.ts workers/api-gateway/src/index.ts
git commit -m "feat(tos-monitor): add TOS changes API endpoints"
git push origin main
```

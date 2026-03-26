# TOS Change Detection — Design Spec

**Date**: 2026-03-26
**Status**: Approved
**Scope**: Sub-project 2 of the Prop Firm Rule Monitor. Cron worker that scrapes firm rules pages every 6 hours, detects changes, stores diffs in D1 and snapshots in R2.

---

## Goals

1. Automatically monitor prop firm rules pages for changes every 6 hours
2. Extract rules content using CSS selectors (with full-text fallback)
3. Detect changes by comparing against previous snapshots
4. Store full HTML snapshots in R2 and structured change records in D1
5. Classify change severity (minor/moderate/major)
6. Provide API endpoints for querying change history

## Non-Goals

- No alert/notification system (separate sub-project)
- No firm health score computation (separate sub-project)
- No TOS diff viewer UI (can be added to Firm Detail page later)
- No NLP/AI analysis of changes

---

## Worker: `workers/tos-monitor/`

### Cron Trigger

`0 */6 * * *` — runs at 00:00, 06:00, 12:00, 18:00 UTC daily.

### Execution Flow

```
Cron fires
  │
  ▼
Query firm_templates for distinct firms
with rules_page_url IS NOT NULL
  │
  ▼
For each firm:
  │
  ├─ Fetch rules page URL
  │
  ├─ Extract content:
  │   ├─ If rules_page_selector exists → HTMLRewriter extraction
  │   └─ If NULL → strip tags, full text body
  │
  ├─ Get previous snapshot from R2 (tos/{slug}/latest.txt)
  │
  ├─ Compare extracted text vs previous
  │   ├─ No change → skip, log "no change"
  │   └─ Change detected:
  │       ├─ Store full HTML in R2: tos/{slug}/{timestamp}.html
  │       ├─ Update R2: tos/{slug}/latest.txt
  │       ├─ Compute line-by-line diff
  │       ├─ Classify severity
  │       └─ INSERT into tos_changes
  │
  └─ Log result

Log summary: "Checked N firms, M changes detected"
```

### Content Extraction

**With CSS selector** (`rules_page_selector` is set):

Use Cloudflare Worker's `HTMLRewriter` to extract text content from the matching selector. Concatenate all text nodes within the matched element.

```typescript
class TextExtractor {
  text = '';
  text(chunk: Text) { this.text += chunk.text; }
}

const extractor = new TextExtractor();
const res = new HTMLRewriter()
  .on(selector, { text: (t) => extractor.text(t) })
  .transform(response);
await res.text(); // drive the rewriter
const content = extractor.text.trim();
```

**Without selector** (fallback):

Strip all HTML tags, extract body text:
```typescript
const html = await response.text();
const text = html
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
```

### Diff Computation

Simple line-by-line comparison:

1. Split previous and current into lines (by `\n`)
2. `added` = lines in current not in previous
3. `removed` = lines in previous not in current
4. `diff_summary` = first 500 chars of changed lines, prefixed with `+` or `-`
5. Count `lines_added` and `lines_removed`

### Severity Classification

Based on keyword presence in changed lines:

| Severity | Rule |
|----------|------|
| `major` | Changed lines contain: `drawdown`, `daily loss`, `profit target`, `%`, `restricted`, `prohibited`, `banned`, `maximum`, `minimum`, `limit`, `breach` |
| `moderate` | Changed lines contain: `trading`, `account`, `rule`, `requirement`, `period`, `days` |
| `minor` | No keywords matched — likely formatting/style changes |
| `unknown` | Extraction failed or diff couldn't be computed |

### Error Handling

- Fetch failures (timeout, 4xx, 5xx): log the error, skip this firm, continue with others
- Extraction returns empty content: log warning, don't overwrite the previous snapshot
- R2 write failures: log error, still insert the D1 record (without snapshot_key)
- Worker timeout: Cloudflare Workers have a 30s CPU time limit for cron. With 5 firms, each fetch should take <3s. If more firms are added, batch them across multiple cron invocations.

---

## D1 Schema

### Migration: `migrations/0009_tos_changes.sql`

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
```

### Seed URLs for Top 5 Firms

Update existing `firm_templates` rows with rules page URLs:

```sql
UPDATE firm_templates SET rules_page_url = 'https://ftmo.com/en/trading-objectives/', rules_page_selector = '.entry-content' WHERE firm_name = 'FTMO' AND rowid IN (SELECT MIN(rowid) FROM firm_templates WHERE firm_name = 'FTMO');

UPDATE firm_templates SET rules_page_url = 'https://fundednext.com/trading-rules/', rules_page_selector = 'main' WHERE firm_name = 'FundedNext' AND rowid IN (SELECT MIN(rowid) FROM firm_templates WHERE firm_name = 'FundedNext');

UPDATE firm_templates SET rules_page_url = 'https://the5ers.com/trading-objectives/', rules_page_selector = 'main' WHERE firm_name = 'The5ers' AND rowid IN (SELECT MIN(rowid) FROM firm_templates WHERE firm_name = 'The5ers');

UPDATE firm_templates SET rules_page_url = 'https://myfundedfx.com/trading-rules/', rules_page_selector = 'main' WHERE firm_name = 'MyFundedFX' AND rowid IN (SELECT MIN(rowid) FROM firm_templates WHERE firm_name = 'MyFundedFX');

UPDATE firm_templates SET rules_page_url = 'https://apextraderfunding.com/faq/', rules_page_selector = 'main' WHERE firm_name = 'Apex Trader Funding' AND rowid IN (SELECT MIN(rowid) FROM firm_templates WHERE firm_name = 'Apex Trader Funding');
```

Note: Only set `rules_page_url` on ONE row per firm (not all plan variants). The cron worker queries `SELECT DISTINCT firm_name, rules_page_url, rules_page_selector FROM firm_templates WHERE rules_page_url IS NOT NULL`.

---

## R2 Storage

### Bucket

Use existing `edgerelay-storage` R2 bucket (already bound in api-gateway worker).

The tos-monitor worker needs its own R2 binding in `wrangler.toml`.

### Path Convention

| Path | Content | Purpose |
|------|---------|---------|
| `tos/{firm_slug}/latest.txt` | Extracted text content | Comparison baseline |
| `tos/{firm_slug}/{ISO_timestamp}.html` | Full raw HTML | Archive |

`firm_slug` = lowercase, spaces replaced with hyphens (e.g., `apex-trader-funding`).

---

## API Endpoints (on api-gateway)

### Public Routes

**`GET /v1/tos/changes`** — List recent TOS changes across all firms.

Query params:
- `firm_name` — filter by firm (optional)
- `severity` — filter by severity (optional)
- `limit` — max results (default 20, max 100)
- `cursor` — cursor-based pagination on `detected_at`

Response:
```json
{
  "data": {
    "changes": [
      {
        "id": "abc123",
        "firm_name": "FTMO",
        "detected_at": "2026-03-26T12:00:00Z",
        "page_url": "https://ftmo.com/en/trading-objectives/",
        "diff_summary": "+ Maximum drawdown changed from 10% to 12%\n- Previous: 10% max drawdown",
        "lines_added": 1,
        "lines_removed": 1,
        "severity": "major"
      }
    ],
    "has_more": false
  }
}
```

**`GET /v1/tos/changes/:firmName`** — Changes for a specific firm. Same response format.

These are public endpoints — no auth required. They feed the Firm Detail page's "Recent Rule Changes" section.

---

## Worker Config

### `workers/tos-monitor/wrangler.toml`

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

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `migrations/0009_tos_changes.sql` | Create | tos_changes table + firm_templates URL columns + seed URLs |
| `workers/tos-monitor/wrangler.toml` | Create | Worker config with cron trigger, D1 + R2 bindings |
| `workers/tos-monitor/src/index.ts` | Create | Main cron handler: fetch, extract, diff, store |
| `workers/tos-monitor/src/types.ts` | Create | Env type |
| `workers/tos-monitor/package.json` | Create | Dependencies |
| `workers/tos-monitor/tsconfig.json` | Create | TypeScript config |
| `workers/api-gateway/src/routes/tos.ts` | Create | TOS changes API endpoints |
| `workers/api-gateway/src/index.ts` | Modify | Mount TOS routes (public) |

**No changes to:** MT5 EAs, web dashboard (TOS display on Firm Detail page is a future enhancement), existing workers.

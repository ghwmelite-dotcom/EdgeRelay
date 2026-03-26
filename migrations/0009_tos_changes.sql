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

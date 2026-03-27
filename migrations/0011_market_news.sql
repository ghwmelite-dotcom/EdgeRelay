CREATE TABLE IF NOT EXISTS market_news (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  headline_hash TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT,
  category TEXT,
  sentiment REAL,
  related_currencies TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at DESC);

-- Note: ALTER TABLE ADD COLUMN has no IF NOT EXISTS in SQLite.
-- Re-running will error "duplicate column" which is non-fatal in D1 batch mode.
ALTER TABLE notification_preferences ADD COLUMN morning_brief INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN news_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN session_alerts INTEGER DEFAULT 0;

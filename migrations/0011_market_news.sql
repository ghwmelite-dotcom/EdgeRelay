CREATE TABLE market_news (
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

CREATE INDEX idx_market_news_published ON market_news(published_at DESC);

ALTER TABLE notification_preferences ADD COLUMN morning_brief INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN news_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN session_alerts INTEGER DEFAULT 0;

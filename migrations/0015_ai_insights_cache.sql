-- AI Insights Cache

CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  insights_json TEXT NOT NULL,
  stats_hash TEXT NOT NULL,
  computed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights_cache(user_id);

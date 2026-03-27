-- migrations/0010_notification_preferences.sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  channel TEXT DEFAULT 'telegram' CHECK(channel IN ('telegram')),
  login_alerts INTEGER DEFAULT 1,
  signal_executed INTEGER DEFAULT 1,
  equity_guard INTEGER DEFAULT 1,
  account_disconnected INTEGER DEFAULT 1,
  daily_summary INTEGER DEFAULT 1,
  weekly_digest INTEGER DEFAULT 1,
  timezone TEXT DEFAULT 'UTC',
  summary_hour INTEGER DEFAULT 22 CHECK(summary_hour >= 0 AND summary_hour <= 23),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

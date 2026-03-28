-- Signal Marketplace tables

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  master_account_id TEXT NOT NULL REFERENCES accounts(id),
  display_name TEXT NOT NULL,
  bio TEXT,
  instruments TEXT,
  strategy_style TEXT DEFAULT 'mixed' CHECK(strategy_style IN ('scalper','swing','position','mixed')),
  is_listed BOOLEAN DEFAULT false,
  listed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_listed ON provider_profiles(is_listed);

CREATE TABLE IF NOT EXISTS provider_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  provider_id TEXT UNIQUE NOT NULL REFERENCES provider_profiles(id),
  total_trades INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  avg_pips REAL DEFAULT 0,
  max_drawdown_pct REAL DEFAULT 0,
  sharpe_ratio REAL DEFAULT 0,
  avg_trade_duration_sec INTEGER DEFAULT 0,
  profit_factor REAL DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  equity_curve_json TEXT DEFAULT '[]',
  computed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscriber_user_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES provider_profiles(id),
  follower_account_id TEXT NOT NULL REFERENCES accounts(id),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','cancelled')),
  subscribed_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  UNIQUE(subscriber_user_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON marketplace_subscriptions(subscriber_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON marketplace_subscriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON marketplace_subscriptions(status);

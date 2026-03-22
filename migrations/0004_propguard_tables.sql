-- PropGuard: Prop firm rule enforcement tables
-- Migration 0004

-- PropGuard rule sets (one per account)
CREATE TABLE IF NOT EXISTS prop_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  preset_name TEXT,
  challenge_phase TEXT DEFAULT 'evaluation'
    CHECK(challenge_phase IN ('evaluation','verification','funded')),
  initial_balance REAL NOT NULL,
  profit_target_percent REAL DEFAULT 10.0,
  max_daily_loss_percent REAL DEFAULT 5.0,
  daily_loss_calculation TEXT DEFAULT 'balance_start_of_day'
    CHECK(daily_loss_calculation IN ('balance_start_of_day','equity_high_of_day','previous_day_balance')),
  max_total_drawdown_percent REAL DEFAULT 10.0,
  drawdown_type TEXT DEFAULT 'static'
    CHECK(drawdown_type IN ('static','trailing','eod_trailing')),
  trailing_drawdown_lock_at_breakeven BOOLEAN DEFAULT false,
  max_lot_size REAL DEFAULT 100.0,
  max_open_positions INTEGER DEFAULT 50,
  max_daily_trades INTEGER DEFAULT 0,
  min_trading_days INTEGER DEFAULT 0,
  consistency_rule_enabled BOOLEAN DEFAULT false,
  max_profit_from_single_day_percent REAL DEFAULT 30.0,
  allowed_trading_start TEXT DEFAULT '00:00',
  allowed_trading_end TEXT DEFAULT '23:59',
  block_weekend_holding BOOLEAN DEFAULT false,
  block_during_news BOOLEAN DEFAULT false,
  news_block_minutes_before INTEGER DEFAULT 5,
  news_block_minutes_after INTEGER DEFAULT 5,
  allowed_symbols TEXT DEFAULT '[]',
  blocked_symbols TEXT DEFAULT '[]',
  warning_threshold_percent REAL DEFAULT 80.0,
  critical_threshold_percent REAL DEFAULT 95.0,
  auto_close_at_critical BOOLEAN DEFAULT true,
  challenge_start_date TEXT,
  challenge_end_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Daily equity snapshots (one row per account per day)
CREATE TABLE IF NOT EXISTS daily_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  balance_start_of_day REAL,
  equity_high_of_day REAL,
  equity_low_of_day REAL,
  balance_end_of_day REAL,
  daily_pnl REAL DEFAULT 0,
  daily_pnl_percent REAL DEFAULT 0,
  high_water_mark REAL,
  total_drawdown_percent REAL DEFAULT 0,
  trades_taken INTEGER DEFAULT 0,
  trades_blocked INTEGER DEFAULT 0,
  consistency_score REAL,
  warnings_triggered INTEGER DEFAULT 0,
  critical_events INTEGER DEFAULT 0,
  UNIQUE(account_id, date)
);

-- Blocked trade log
CREATE TABLE IF NOT EXISTS blocked_trades (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  signal_id TEXT,
  rule_violated TEXT NOT NULL,
  rule_details TEXT NOT NULL,
  attempted_action TEXT NOT NULL,
  attempted_symbol TEXT NOT NULL,
  attempted_volume REAL NOT NULL,
  attempted_price REAL,
  current_daily_loss_percent REAL,
  current_total_drawdown_percent REAL,
  current_equity REAL,
  blocked_at TEXT DEFAULT (datetime('now'))
);

-- News calendar cache
CREATE TABLE IF NOT EXISTS news_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  impact TEXT NOT NULL CHECK(impact IN ('low','medium','high')),
  event_time TEXT NOT NULL,
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  fetched_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prop_rules_account ON prop_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_account_date ON daily_stats(account_id, date);
CREATE INDEX IF NOT EXISTS idx_blocked_trades_account ON blocked_trades(account_id, blocked_at);
CREATE INDEX IF NOT EXISTS idx_news_events_time ON news_events(event_time);
CREATE INDEX IF NOT EXISTS idx_news_events_currency_time ON news_events(currency, event_time);

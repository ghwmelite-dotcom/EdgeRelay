-- EdgeRelay Initial Schema
-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free','starter','pro','unlimited','provider')),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Trading Accounts (both master and follower)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('master','follower')),
  alias TEXT NOT NULL,
  broker_name TEXT,
  mt5_login TEXT,
  api_key TEXT UNIQUE NOT NULL,
  api_secret TEXT NOT NULL,
  master_account_id TEXT REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TEXT,
  last_signal_at TEXT,
  signals_today INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Follower Configuration
CREATE TABLE IF NOT EXISTS follower_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT UNIQUE NOT NULL REFERENCES accounts(id),
  lot_mode TEXT DEFAULT 'mirror' CHECK(lot_mode IN ('mirror','fixed','multiplier','risk_percent')),
  lot_value REAL DEFAULT 1.0,
  max_daily_loss_percent REAL DEFAULT 5.0,
  max_total_drawdown_percent REAL DEFAULT 10.0,
  respect_news_filter BOOLEAN DEFAULT true,
  max_slippage_points INTEGER DEFAULT 30,
  symbol_suffix TEXT DEFAULT '',
  copy_buys BOOLEAN DEFAULT true,
  copy_sells BOOLEAN DEFAULT true,
  copy_pendings BOOLEAN DEFAULT true,
  invert_direction BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Symbol Mappings (per follower account)
CREATE TABLE IF NOT EXISTS symbol_mappings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  master_symbol TEXT NOT NULL,
  follower_symbol TEXT NOT NULL,
  UNIQUE(account_id, master_symbol)
);

-- Signals (master trade events)
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  master_account_id TEXT NOT NULL REFERENCES accounts(id),
  sequence_num INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('open','modify','partial_close','close','pending','cancel_pending')),
  order_type TEXT CHECK(order_type IN ('buy','sell','buy_limit','buy_stop','sell_limit','sell_stop')),
  symbol TEXT NOT NULL,
  volume REAL,
  price REAL,
  sl REAL,
  tp REAL,
  magic_number INTEGER,
  ticket INTEGER,
  comment TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  UNIQUE(master_account_id, sequence_num)
);

-- Executions (follower trade results)
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  signal_id TEXT NOT NULL REFERENCES signals(id),
  follower_account_id TEXT NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK(status IN ('executed','failed','blocked','skipped')),
  block_reason TEXT,
  executed_volume REAL,
  executed_price REAL,
  slippage_points REAL,
  execution_time_ms INTEGER,
  mt5_ticket INTEGER,
  error_code INTEGER,
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now'))
);

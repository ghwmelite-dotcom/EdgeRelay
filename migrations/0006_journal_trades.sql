CREATE TABLE IF NOT EXISTS journal_trades (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  deal_ticket INTEGER NOT NULL,
  order_ticket INTEGER,
  position_id INTEGER,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('buy','sell')),
  deal_entry TEXT NOT NULL CHECK(deal_entry IN ('in','out','inout')),
  volume REAL NOT NULL,
  price REAL,
  sl REAL,
  tp REAL,
  time INTEGER NOT NULL,
  profit REAL,
  commission REAL,
  swap REAL,
  magic_number INTEGER,
  comment TEXT,
  balance_at_trade REAL,
  equity_at_trade REAL,
  spread_at_entry INTEGER,
  atr_at_entry REAL,
  session_tag TEXT CHECK(session_tag IN ('asian','london','new_york','off_hours')),
  duration_seconds INTEGER,
  pips REAL,
  risk_reward_ratio REAL,
  synced_at INTEGER NOT NULL,
  UNIQUE(account_id, deal_ticket)
);

CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_account_time ON journal_trades(account_id, time);
CREATE INDEX IF NOT EXISTS idx_journal_account_symbol ON journal_trades(account_id, symbol);

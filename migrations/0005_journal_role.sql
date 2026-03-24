-- Update accounts CHECK constraint to allow 'journal' role.
-- SQLite requires table recreation to modify CHECK constraints.
-- Schema matches live D1 exactly (verified via SELECT sql FROM sqlite_master).
-- PRAGMA foreign_keys = OFF is required because other tables reference accounts.

PRAGMA foreign_keys = OFF;

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('master','follower','journal')),
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

INSERT INTO accounts_new (id, user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id, is_active, last_heartbeat, last_signal_at, signals_today, created_at)
SELECT id, user_id, role, alias, broker_name, mt5_login, api_key, api_secret, master_account_id, is_active, last_heartbeat, last_signal_at, signals_today, created_at FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

-- Recreate indexes from 0002_indexes.sql
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_master ON accounts(master_account_id);
CREATE INDEX idx_accounts_api_key ON accounts(api_key);

PRAGMA foreign_keys = ON;
